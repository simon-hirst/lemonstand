const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const cache = require('../middleware/cache');

// Add cache middleware to getAllProducts
exports.getAllProducts = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    fields,
    ...query
  } = req.query;

  // Filtering
  let filter = { isActive: true };
  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    if (category) {
      const categoryIds = [category._id];
      const subcategories = await Category.find({ parent: category._id });
      categoryIds.push(...subcategories.map(cat => cat._id));
      filter.category = { $in: categoryIds };
    }
    delete query.category;
  }

  // Text search
  if (query.q) {
    filter.$text = { $search: query.q };
    delete query.q;
  }

  // Numeric filters
  let queryStr = JSON.stringify(query);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  Object.assign(filter, JSON.parse(queryStr));

  const products = await Product.find(filter)
    .select(fields)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Product.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// Other controller methods remain the same...
// ... (rest of the controller code)
