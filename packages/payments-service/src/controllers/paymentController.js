const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendToQueue } = require('../workers/paymentWorker');

exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { orderId, amount, currency = 'usd' } = req.body;

  // In a real implementation, we'd validate the order exists
  // For now, we'll just use the provided data

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    metadata: {
      orderId: orderId,
      userId: req.user.id
    },
    description: `Payment for order ${orderId}`,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.status(200).json({
    status: 'success',
    data: {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    }
  });
});

exports.handleWebhook = catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  
  // Send payment succeeded event to queue
  await sendToQueue('payment.succeeded', {
    orderId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency
  });

  console.log(`Payment succeeded for order ${orderId}`);
}

async function handlePaymentIntentFailed(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  
  // Send payment failed event to queue
  await sendToQueue('payment.failed', {
    orderId,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message
  });

  console.log(`Payment failed for order ${orderId}: ${paymentIntent.last_payment_error?.message}`);
}

async function handleChargeRefunded(charge) {
  const paymentIntentId = charge.payment_intent;
  const refundAmount = charge.amount_refunded / 100; // Convert from cents
  
  // Send payment refunded event to queue
  await sendToQueue('payment.refunded', {
    paymentIntentId,
    refundAmount,
    currency: charge.currency
  });

  console.log(`Payment refunded: $${refundAmount}`);
}

exports.getPaymentMethods = catchAsync(async (req, res, next) => {
  if (!req.user.stripeCustomerId) {
    return res.status(200).json({
      status: 'success',
      data: {
        paymentMethods: []
      }
    });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: req.user.stripeCustomerId,
    type: 'card'
  });

  res.status(200).json({
    status: 'success',
    data: {
      paymentMethods: paymentMethods.data
    }
  });
});
