const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendToQueue } = require('../workers/orderWorker');

exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, shippingAddress, billingAddress, paymentMethod, notes } = req.body;

  // Validate items and calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    // In a real implementation, we'd call the products service
    // For now, we'll simulate the product data
    const product = {
      _id: item.product,
      name: `Product ${item.product}`,
      price: 29.99,
      sku: `SKU${item.product}`,
      weight: 0.5,
      dimensions: { length: 10, width: 10, height: 5 }
    };

    const itemTotal = product.price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      sku: product.sku,
      weight: product.weight,
      dimensions: product.dimensions
    });
  }

  // Calculate tax (simplified - 8.5%)
  const taxAmount = parseFloat((subtotal * 0.085).toFixed(2));
  
  // Calculate shipping (simplified - $5.99 flat rate)
  const shippingCost = 5.99;
  
  const total = subtotal + taxAmount + shippingCost;

  // Create order
  const order = await Order.create({
    customer: req.user.id,
    items: orderItems,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    paymentMethod,
    notes,
    subtotal,
    taxAmount,
    shippingCost,
    total,
    currency: 'USD'
  });

  // Send order created event to queue
  await sendToQueue('order.created', {
    orderId: order._id,
    customerId: order.customer,
    total: order.total,
    items: order.items
  });

  res.status(201).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.getUserOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const filter = { customer: req.user.id };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  // Check if user owns the order or is admin
  if (order.customer.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view this order', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      order
    }
  });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, trackingNumber, carrier, cancellationReason } = req.body;
  
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  const updateData = { status };
  
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (carrier) updateData.carrier = carrier;
  if (cancellationReason) updateData.cancellationReason = cancellationReason;

  // Handle status-specific logic
  if (status === 'shipped') {
    updateData.shippedAt = new Date();
    
    // Send order shipped event to queue
    await sendToQueue('order.shipped', {
      orderId: order._id,
      customerId: order.customer,
      trackingNumber,
      carrier
    });
  } else if (status === 'cancelled') {
    // Send order cancelled event to queue
    await sendToQueue('order.cancelled', {
      orderId: order._id,
      customerId: order.customer,
      reason: cancellationReason
    });
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      order: updatedOrder
    }
  });
});

exports.getOrderStats = catchAsync(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  const matchStage = {};
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
        completedOrders: {
          $sum: { $cond: [{ $in: ['$status', ['delivered', 'shipped']] }, 1, 0] }
        },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalOrders: 1,
        totalRevenue: 1,
        avgOrderValue: 1,
        completedOrders: 1,
        pendingOrders: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats[0] || {}
    }
  });
});
