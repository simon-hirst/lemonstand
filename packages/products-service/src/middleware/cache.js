const { createClient } = require('redis');

/*
 * Redis cache middleware using the modern redis@4 client.
 * The client uses native promises so we can avoid util.promisify.
 */
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Ensure the client is connected before handling requests. If the
// connection fails we still allow requests to proceed but skip caching.
let clientReady = false;
redisClient.connect().then(() => {
  clientReady = true;
}).catch((err) => {
  console.error('Redis connection error:', err);
});

const cache = (duration = 300) => {
  return async (req, res, next) => {
    // Skip caching in test environment or if Redis connection failed.
    if (process.env.NODE_ENV === 'test' || !clientReady) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        console.log('Cache hit for:', key);
        return res.status(200).json(JSON.parse(cached));
      }

      // Override res.json to intercept successful responses and store them in cache
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        if (res.statusCode === 200) {
          try {
            await redisClient.setEx(key, duration, JSON.stringify(data));
          } catch (err) {
            console.error('Redis setEx error:', err);
          }
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next();
    }
  };
};

module.exports = cache;
