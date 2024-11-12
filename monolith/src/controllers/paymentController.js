const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  
  if (!order) {
    return next(new AppError('Order not found', 404));
  }

  if (order.customer.toString() !== req.user.id) {
    return next(new AppError('Not authorized to pay for this order', 403));
  }

  if (order.paymentStatus === 'paid') {
    return next(new AppError('Order is already paid', 400));
  }

  // Get or create Stripe customer
  let customerId = req.user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: `${req.user.firstName} ${req.user.lastName}`,
      metadata: {
        userId: req.user._id.toString()
      }
    });
    customerId = customer.id;
    
    // Save customer ID to user
    await User.findByIdAndUpdate(req.user.id, { stripeCustomerId: customerId });
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100), // Convert to cents
    currency: order.currency.toLowerCase(),
    customer: customerId,
    metadata: {
      orderId: order._id.toString(),
      userId: req.user._id.toString()
    },
    description: `Payment for order ${order.orderNumber}`,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  // Update order with payment intent ID
  await Order.findByIdAndUpdate(orderId, {
    paymentIntentId: paymentIntent.id
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
  
  const order = await Order.findByIdAndUpdate(orderId, {
    paymentStatus: 'paid',
    paymentDate: new Date(),
    status: 'confirmed'
  }, { new: true });

  // TODO: Send confirmation email
  console.log(`Order ${order.orderNumber} payment succeeded`);
}

async function handlePaymentIntentFailed(paymentIntent) {
  const orderId = paymentIntent.metadata.orderId;
  
  await Order.findByIdAndUpdate(orderId, {
    paymentStatus: 'failed',
    status: 'payment_failed'
  });

  console.log(`Order ${orderId} payment failed: ${paymentIntent.last_payment_error?.message}`);
}

async function handleChargeRefunded(charge) {
  const paymentIntentId = charge.payment_intent;
  const refundAmount = charge.amount_refunded / 100; // Convert from cents
  
  const order = await Order.findOneAndUpdate(
    { paymentIntentId },
    {
      paymentStatus: 'refunded',
      status: 'refunded',
      refundAmount,
      refundDate: new Date()
    },
    { new: true }
  );

  if (order) {
    // Restore inventory for refunded orders
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { inventory: item.quantity } }
      );
    }
    
    console.log(`Order ${order.orderNumber} refunded: $${refundAmount}`);
  }
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
