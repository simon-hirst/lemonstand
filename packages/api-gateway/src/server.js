const app = require('./app');

/**
 * Bootstraps the API Gateway.
 *
 * Reads the listening port from the PORT environment variable, defaulting to 3000.
 * On startup a message is logged to the console. Exported for usage in tests.
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`API Gateway running on port ${PORT}`);
});
