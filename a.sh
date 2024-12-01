export GIT_AUTHOR_DATE="$(date -d '2024-12-01 20:11:53')"
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"

# Add Prometheus monitoring to all services
cd packages/api-gateway
npm install prom-client express-prom-bundle

# Add monitoring to API Gateway
cat > src/monitoring.js << 'EOF'
const promBundle = require('express-prom-bundle');
const client = require('prom-client');

// Create metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000, 3000, 5000]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code']
});

const activeUsers = new client.Gauge({
  name: 'active_users',
  help: 'Number of active users'
});

// Metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project_name: 'lemonstand', project_type: 'test' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 1000,
    }
  }
});

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', client.register.contentType);
  client.register.metrics().then(metrics => {
    res.send(metrics);
  }).catch(error => {
    res.status(500).send(error);
  });
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  httpRequestDurationMicroseconds,
  httpRequestsTotal,
  activeUsers,
  client
};
EOF

# Update API Gateway app to include monitoring
cat > src/app.js << 'EOF'
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

# Add monitoring to other services
services=("auth-service" "products-service" "orders-service" "payments-service")
for service in "${services[@]}"; do
  cd ../$service
  npm install prom-client express-prom-bundle
  
  # Create monitoring.js for each service
  cat > src/monitoring.js << 'EOF'
const promBundle = require('express-prom-bundle');
const client = require('prom-client');

// Create metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000, 3000, 5000]
});

// Metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project_name: 'lemonstand', project_type: 'test' },
  promClient: {
    collectDefaultMetrics: {
      timeout: 1000,
    }
  }
});

// Metrics endpoint
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', client.register.contentType);
  client.register.metrics().then(metrics => {
    res.send(metrics);
  }).catch(error => {
    res.status(500).send(error);
  });
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  client
};
EOF

  # Update app.js for each service to include monitoring
  sed -i '' '/const express = require('\''express'\'');/a\
const { metricsMiddleware, metricsEndpoint } = require('\''./monitoring'\'');\
' src/app.js

  sed -i '' '/app.use(express.json({ limit: '\''10kb'\'' }));/a\
app.use(metricsMiddleware);\
' src/app.js

  sed -i '' '/app.get('\''\/health'\'', (req, res) => {/a\
\
app.get('\''\/metrics'\'', metricsEndpoint);\
' src/app.js
done

git add .
git commit -m "feat: add Prometheus monitoring and metrics to all services"

unset GIT_AUTHOR_DATE
unset GIT_COMMITTER_DATE