const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

// Webhook endpoint (no auth needed)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// Protected routes
router.use(authController.protect);

router.post(
  '/create-payment-intent',
  paymentController.createPaymentIntent
);

router.get(
  '/payment-methods',
  paymentController.getPaymentMethods
);

module.exports = router;
