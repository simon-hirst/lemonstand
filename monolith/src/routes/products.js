const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviews');

const router = express.Router();

// Nested routes for reviews
router.use('/:productId/reviews', reviewRouter);

router
  .route('/')
  .get(productController.getAllProducts)
  .post(
    authController.protect,
    authController.restrictTo('vendor', 'admin'),
    productController.createProduct
  );

router
  .route('/stats')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    productController.getProductStats
  );

router
  .route('/:id')
  .get(productController.getProduct)
  .patch(
    authController.protect,
    authController.restrictTo('vendor', 'admin'),
    productController.updateProduct
  )
  .delete(
    authController.protect,
    authController.restrictTo('vendor', 'admin'),
    productController.deleteProduct
  );

module.exports = router;
