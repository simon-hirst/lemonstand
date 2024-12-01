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
