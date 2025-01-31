const express = require('express');
const orderController = require('../controllers/orderController');
const protect = require('../middleware/auth');

const router = express.Router();

// Protect all order routes - require authentication
router.use(protect);

router
  .route('/')
  .get(orderController.getUserOrders)
  .post(orderController.createOrder);

router
  .route('/stats')
  .get(orderController.getOrderStats);

router
  .route('/:id')
  .get(orderController.getOrder)
  .patch(orderController.updateOrderStatus);

module.exports = router;
