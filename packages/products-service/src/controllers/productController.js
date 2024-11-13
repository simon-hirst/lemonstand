const Product = require('../models/Product');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

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

exports.getProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug });

  if (!product) {
    return next(new AppError('No product found with that slug', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.createProduct = catchAsync(async (req, res, next) => {
  req.body.vendor = req.user.id;

  // Generate SKU if not provided
  if (!req.body.sku) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    req.body.sku = `${req.body.name.substring(0, 3).toUpperCase()}${randomNum}`;
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      product
    }
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  // Check if user owns the product or is admin
  if (product.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this product', 403));
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      product: updatedProduct
    }
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  if (product.vendor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to delete this product', 403));
  }

  await Product.findByIdAndUpdate(req.params.id, { isActive: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getProductStats = catchAsync(async (req, res, next) => {
  const stats = await Product.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: '$category',
        numProducts: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        totalInventory: { $sum: '$inventory' }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
      },
    {
      $project: {
        category: '$category.name',
        numProducts: 1,
        avgPrice: 1,
        minPrice: 1,
        maxPrice: 1,
        totalInventory: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});
