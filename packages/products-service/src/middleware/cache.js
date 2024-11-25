const redis = require('redis');
const { promisify } = require('util');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

const getAsync = promisify(redisClient.get).bind(redisClient);
const setexAsync = promisify(redisClient.setex).bind(redisClient);

const cache = (duration = 300) => { // 5 minutes default
  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;
    
    try {
      const cachedData = await getAsync(key);
      if (cachedData) {
        console.log('Cache hit for:', key);
        return res.status(200).json(JSON.parse(cachedData));
      }
      
      // Cache miss - override res.json to cache response
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          setexAsync(key, duration, JSON.stringify(data))
            .catch(err => console.error('Redis set error:', err));
        }
        originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Connect to Redis
redisClient.connect().catch(console.error);

module.exports = cache;
