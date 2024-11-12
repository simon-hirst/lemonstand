const express = require('express');
const orderController = require('../controllers/orderController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(orderController.getUserOrders)
  .post(orderController.createOrder);

router
  .route('/stats')
  .get(
    authController.restrictTo('admin'),
    orderController.getOrderStats
  );

router
  .route('/:id')
  .get(orderController.getOrder)
  .patch(
    authController.restrictTo('admin'),
    orderController.updateOrderStatus
  );

module.exports = router;
