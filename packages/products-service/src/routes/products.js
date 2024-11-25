const express = require('express');
const productController = require('../controllers/productController');
const cache = require('../middleware/cache');

const router = express.Router();

router
  .route('/')
  .get(cache(300), productController.getAllProducts) // Cache for 5 minutes
  .post(productController.createProduct);

router
  .route('/stats')
  .get(cache(60), productController.getProductStats); // Cache for 1 minute

router
  .route('/:id')
  .get(cache(600), productController.getProduct) // Cache for 10 minutes
  .patch(productController.updateProduct)
  .delete(productController.deleteProduct);

module.exports = router;
