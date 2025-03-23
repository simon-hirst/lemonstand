// Test-friendly Redis cache middleware (supports cache() and cache(ttl))
const { createClient } = require('redis');

const DISABLE_CACHE = process.env.NODE_ENV === 'test' || process.env.SKIP_REDIS === '1';
let redisClient = null;

if (!DISABLE_CACHE && process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: { reconnectStrategy: false },
  });

  redisClient.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Redis error:', err);
    }
  });

  redisClient.connect().catch((err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Redis connect failed, continuing without cache:', err && err.message ? err.message : err);
    }
    redisClient = null;
  });
}

function createCacheMiddleware(ttlSeconds = 60) {
  return async function cacheMiddleware(req, res, next) {
    try {
      if (!redisClient || !redisClient.isOpen) return next();

      const key = `products:${req.method}:${req.originalUrl}`;
      const cached = await redisClient.get(key);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }

      const _json = res.json.bind(res);
      res.json = (body) => {
        try {
          redisClient.setEx(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
          res.set('X-Cache', 'MISS');
        } catch (_) {}
        return _json(body);
      };

      return next();
    } catch (_err) {
      return next();
    }
  };
}

// Export a callable that supports both usages:
//   router.get('/', cache, handler)
//   router.get('/', cache(300), handler)
function cache(...args) {
  // cache(300) -> returns a middleware
  if (args.length === 1 && typeof args[0] === 'number') {
    return createCacheMiddleware(args[0]);
  }
  // Express calling cache(req,res,next)
  if (args.length >= 3) {
    return createCacheMiddleware()(args[0], args[1], args[2]);
  }
  // Fallback: return default middleware
  return createCacheMiddleware();
}

module.exports = cache;
module.exports.cache = cache;
