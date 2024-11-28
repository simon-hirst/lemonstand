const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Service registry
const services = {
  'auth-service': { url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001', healthy: false },
  'products-service': { url: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3002', healthy: false },
  'orders-service': { url: process.env.ORDERS_SERVICE_URL || 'http://localhost:3003', healthy: false },
  'payments-service': { url: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:3004', healthy: false },
  'email-service': { url: process.env.EMAIL_SERVICE_URL || 'http://localhost:3005', healthy: false }
};

// Health check function
const checkServiceHealth = async (serviceName, serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
    services[serviceName].healthy = response.status === 200;
    services[serviceName].lastChecked = new Date().toISOString();
    console.log(`Service ${serviceName} is healthy`);
  } catch (error) {
    services[serviceName].healthy = false;
    services[serviceName].lastChecked = new Date().toISOString();
    console.error(`Service ${serviceName} is unhealthy:`, error.message);
  }
};

// Periodic health checks
setInterval(() => {
  Object.entries(services).forEach(([serviceName, service]) => {
    checkServiceHealth(serviceName, service.url);
  });
}, 30000); // Check every 30 seconds

// Initial health check
Object.entries(services).forEach(([serviceName, service]) => {
  checkServiceHealth(serviceName, service.url);
});

// Registry endpoints
app.get('/registry', (req, res) => {
  res.json(services);
});

app.get('/registry/healthy', (req, res) => {
  const healthyServices = Object.entries(services)
    .filter(([_, service]) => service.healthy)
    .reduce((acc, [name, service]) => {
      acc[name] = service;
      return acc;
    }, {});
  
  res.json(healthyServices);
});

app.get('/registry/:serviceName', (req, res) => {
  const service = services[req.params.serviceName];
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(service);
});

app.post('/registry/:serviceName', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  services[req.params.serviceName] = {
    url,
    healthy: false,
    lastChecked: new Date().toISOString()
  };
  
  checkServiceHealth(req.params.serviceName, url);
  res.json({ message: 'Service registered successfully' });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Service Registry running on port ${PORT}`);
});
