const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [120, 'Product name cannot exceed 120 characters'],
    unique: true
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  richDescription: {
    type: String,
    default: ''
  },
  images: [{
    type: String,
    validate: {
      validator: function(url) {
        return url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
      },
      message: 'Please provide a valid image URL'
    }
  }],
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price must be a positive number']
  },
  cost: {
    type: Number,
    min: [0, 'Cost must be a positive number']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product must belong to a category']
  },
  inventory: {
    type: Number,
    required: [true, 'Product inventory is required'],
    min: [0, 'Inventory cannot be negative'],
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight must be a positive number']
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  downloadUrl: String,
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Product must have a vendor']
  },
  ratingsAverage: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot exceed 5'],
    set: val => Math.round(val * 10) / 10
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product',
  localField: '_id'
});

productSchema.virtual('inStock').get(function() {
  return this.inventory > 0;
});

productSchema.virtual('profitMargin').get(function() {
  if (!this.cost) return null;
  return ((this.price - this.cost) / this.price) * 100;
});

productSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  this.updatedAt = Date.now();
  next();
});

productSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'vendor',
    select: 'firstName lastName email'
  }).populate({
    path: 'category',
    select: 'name'
  });
  next();
});

productSchema.index({ price: 1, ratingsAverage: -1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ slug: 1 });

module.exports = mongoose.model('Product', productSchema);
