const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const { metricsMiddleware, metricsEndpoint } = require('./monitoring');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(metricsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Service registry URL
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3006';

// Service discovery middleware
const serviceDiscovery = async (req, res, next) => {
  try {
    const serviceName = req.path.split('/')[2]; // Extract service name from path
    const response = await axios.get(`${REGISTRY_URL}/registry/${serviceName}-service`);
    
    if (response.data.healthy) {
      req.serviceUrl = response.data.url;
      next();
    } else {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    }
  } catch (error) {
    console.error('Service discovery error:', error.message);
    res.status(503).json({ error: 'Service discovery failed' });
  }
};

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'api-gateway' });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint);

// Proxy middleware with service discovery
app.use('/api/v1/:service', serviceDiscovery, (req, res) => {
  const proxy = createProxyMiddleware({
    target: req.serviceUrl,
    changeOrigin: true,
    pathRewrite: { [`^/api/v1/${req.params.service}`]: '' },
    logLevel: 'debug',
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request to ${req.serviceUrl}: ${req.method} ${req.path}`);
      },
      error: (err, req, res) => {
        console.error(`Proxy error for ${req.serviceUrl}:`, err.message);
        res.status(503).json({ error: 'Service temporarily unavailable' });
      }
    }
  });
  
  proxy(req, res);
});

// 404 handler
app.use( (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
