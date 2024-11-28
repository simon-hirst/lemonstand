export GIT_AUTHOR_DATE="$(date -d '2024-11-28 10:44:26')"
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"

# Create a service registry and health check system
cd lemonstand-platform
mkdir packages/service-registry

# Create service registry package
npx lerna create @lemonstand/service-registry --yes
cd packages/service-registry

# Install dependencies
npm install express axios

# Create service registry
cat > src/app.js << 'EOF'
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
EOF

# Update API Gateway to use service registry
cd ../api-gateway

# Install axios for service discovery
npm install axios

# Update API Gateway to use service registry
cat > src/app.js << 'EOF'
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));

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
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
EOF

git add .
git commit -m "feat: add service registry and health checks for service discovery"

unset GIT_AUTHOR_DATE
unset GIT_COMMITTER_DATE