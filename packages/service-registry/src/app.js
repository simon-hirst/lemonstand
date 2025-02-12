const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');

const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));

// In-memory registry (simple shape for demo/tests)
const services = {
  'auth-service':     { url: process.env.AUTH_URL     || 'http://auth-service:3001/health',     healthy: false, lastChecked: null },
  'products-service': { url: process.env.PRODUCTS_URL || 'http://products-service:3002/health', healthy: false, lastChecked: null },
  'orders-service':   { url: process.env.ORDERS_URL   || 'http://orders-service:3003/health',   healthy: false, lastChecked: null },
  'payments-service': { url: process.env.PAYMENTS_URL || 'http://payments-service:3004/health', healthy: false, lastChecked: null },
  'email-service':    { url: process.env.EMAIL_URL    || 'http://email-service:3005/health',    healthy: false, lastChecked: null },
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'service-registry' });
});

// Registry view
app.get('/registry', (_req, res) => {
  res.json(services);
});

// Optional periodic health poller (disabled in tests)
async function checkService(serviceName) {
  const s = services[serviceName];
  if (!s) return;
  try {
    const { status } = await axios.get(s.url, { timeout: 1500 });
    s.healthy = status >= 200 && status < 300;
    s.lastChecked = new Date().toISOString();
  } catch (error) {
    s.healthy = false;
    s.lastChecked = new Date().toISOString();
    if (process.env.NODE_ENV !== 'test') {
      console.error(`Service ${serviceName} is unhealthy:`, error.message);
    }
  }
}

async function pollAll() {
  await Promise.all(Object.keys(services).map(checkService));
}

if (!process.env.DISABLE_HEALTH_POLL) {
  setInterval(pollAll, 30000); // 30s
  // kick one off shortly after boot without blocking require()
  setTimeout(() => { pollAll().catch(() => {}); }, 10);
}

module.exports = app;
