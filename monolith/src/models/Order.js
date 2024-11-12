const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Order item must have a product']
  },
  name: {
    type: String,
    required: [true, 'Order item must have a name']
  },
  price: {
    type: Number,
    required: [true, 'Order item must have a price'],
    min: [0, 'Price must be a positive number']
  },
  quantity: {
    type: Number,
    required: [true, 'Order item must have a quantity'],
    min: [1, 'Quantity must be at least 1']
  },
  sku: String,
  image: String,
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a customer']
  },
  items: [orderItemSchema],
  shippingAddress: {
    firstName: String,
    lastName: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  billingAddress: {
    firstName: String,
    lastName: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  subtotal: {
    type: Number,
    required: [true, 'Order must have a subtotal'],
    min: [0, 'Subtotal must be a positive number']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount must be a positive number']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost must be a positive number']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount must be a positive number']
  },
  total: {
    type: Number,
    required: [true, 'Order must have a total amount'],
    min: [0, 'Total must be a positive number']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'payment_failed'
    ],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'bank_transfer', 'cash'],
    default: 'card'
  },
  paymentIntentId: String,
  paymentDate: Date,
  shippingMethod: String,
  trackingNumber: String,
  carrier: String,
  estimatedDelivery: Date,
  notes: String,
  cancellationReason: String,
  refundAmount: Number,
  refundDate: Date,
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

orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

orderSchema.virtual('isPaid').get(function() {
  return this.paymentStatus === 'paid';
});

orderSchema.virtual('canCancel').get(function() {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate order number if not set
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `ORD-${timestamp}${random}`;
  }
  
  // Calculate total if not set
  if (this.isModified('subtotal') || this.isModified('taxAmount') || 
      this.isModified('shippingCost') || this.isModified('discountAmount')) {
    this.total = this.subtotal + this.taxAmount + this.shippingCost - this.discountAmount;
  }
  
  next();
});

orderSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'customer',
    select: 'firstName lastName email'
  }).populate({
    path: 'items.product',
    select: 'name images slug'
  });
  next();
});

orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'paymentIntentId': 1 });

module.exports = mongoose.model('Order', orderSchema);
