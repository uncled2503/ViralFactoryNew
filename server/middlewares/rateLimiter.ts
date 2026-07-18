import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/RedisService';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  type: string;
}

const stores = new Map<string, Map<string, { count: number; resetTime: number }>>();

export function createRateLimiter(config: RateLimitConfig) {
  const storeKey = config.type;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }
  const store = stores.get(storeKey)!;

  return async (req: Request, res: Response, next: NextFunction) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ip = (Array.isArray(rawIp) ? rawIp[0] : (rawIp as string)).replace(/^::ffff:/, '');

    // 1. Try Redis-based distributed rate limiting for horizontal scaling and cluster consistency
    if (RedisService.isAvailable()) {
      const redisKey = `rate_limit:${config.type}:${ip}`;
      const ttlSeconds = Math.ceil(config.windowMs / 1000);
      try {
        const currentCount = await RedisService.incrAndExpire(redisKey, ttlSeconds);
        
        if (currentCount > 0) {
          if (currentCount > config.max) {
            const logData = {
              event: 'MALICIOUS_ATTEMPT',
              type: 'RATE_LIMIT_EXCEEDED',
              ip,
              url: req.originalUrl,
              method: req.method,
              limiter: config.type,
              count: currentCount,
              max: config.max,
              timestamp: new Date().toISOString()
            };
            console.warn(JSON.stringify(logData));

            res.status(429).json({
              error: 'Too many requests. Please try again later.',
              retryAfterMs: config.windowMs,
            });
            return;
          }

          // Set standard headers
          res.setHeader('X-RateLimit-Limit', config.max);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - currentCount));
          res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

          next();
          return;
        }
      } catch (err: any) {
        console.error(`[RateLimiter] Redis rate limiting failed for ${ip}, falling back to local memory:`, err.message);
      }
    }

    // 2. Fallback to Local In-Memory Rate Limiter if Redis is not available/failed
    const now = Date.now();
    let record = store.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      store.set(ip, record);
    }

    record.count++;

    if (record.count > config.max) {
      // Structured log for malicious attempt (DoS / brute force / rate limit bypass)
      const logData = {
        event: 'MALICIOUS_ATTEMPT',
        type: 'RATE_LIMIT_EXCEEDED',
        ip,
        url: req.originalUrl,
        method: req.method,
        limiter: config.type,
        count: record.count,
        max: config.max,
        timestamp: new Date().toISOString()
      };
      console.warn(JSON.stringify(logData));

      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfterMs: record.resetTime - now,
      });
      return;
    }

    // Set standard headers
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
}

// Configurable defaults via environment variables
export const publicApiLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  type: 'PUBLIC_API'
});

export const adminApiLimiter = createRateLimiter({
  windowMs: parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.ADMIN_RATE_LIMIT_MAX || '30', 10),
  type: 'ADMIN_API'
});
