const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  slug: String,
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  image: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

categorySchema.virtual('subcategories', {
  ref: 'Category',
  foreignField: 'parent',
  localField: '_id'
});

categorySchema.virtual('products', {
  ref: 'Product',
  foreignField: 'category',
  localField: '_id'
});

categorySchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  this.updatedAt = Date.now();
  next();
});

categorySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'subcategories',
    select: 'name slug'
  });
  next();
});

module.exports = mongoose.model('Category', categorySchema);
