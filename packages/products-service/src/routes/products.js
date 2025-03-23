const express = require('express');
const productController = require('../controllers/productController');
const cache = require('../middleware/cache');

const router = express.Router();

router
  .route('/')
  .get(cache(300), productController.getAllProducts) // 5-min cache
  .post(productController.createProduct);

router
  .route('/stats')
  .get(productController.getProductStats);

module.exports = router;
