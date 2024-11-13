const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

exports.getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await Category.find({ isActive: true });

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: {
      categories
    }
  });
});

exports.getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findOne({ slug: req.params.slug });

  if (!category) {
    return next(new AppError('No category found with that slug', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.createCategory = catchAsync(async (req, res, next) => {
  const category = await Category.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.updateCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      category
    }
  });
});

exports.deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});
