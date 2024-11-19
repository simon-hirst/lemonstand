const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const paymentRoutes = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/payments', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'payments-service' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
