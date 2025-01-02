const app = require('./app');

/**
 * Start the Service Registry server.
 *
 * Reads the port from the PORT environment variable, defaulting to 3006.
 * Logs a startup message once the server is listening.
 */
const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Service Registry running on port ${PORT}`);
});
