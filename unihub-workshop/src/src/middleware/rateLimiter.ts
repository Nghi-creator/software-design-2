import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

// Lua script for Token Bucket
const tokenBucketScript = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2]) -- tokens per second
  local now = tonumber(ARGV[3])
  local requested = 1

  local bucket = redis.call("HMGET", key, "tokens", "last_refill")
  local tokens = tonumber(bucket[1])
  local last_refill = tonumber(bucket[2])

  if not tokens then
    tokens = capacity
    last_refill = now
  end

  local time_passed = math.max(0, now - last_refill)
  local refill_amount = math.floor(time_passed * refillRate)

  if refill_amount > 0 then
    tokens = math.min(capacity, tokens + refill_amount)
    last_refill = now
  end

  if tokens >= requested then
    tokens = tokens - requested
    redis.call("HMSET", key, "tokens", tokens, "last_refill", last_refill)
    redis.call("EXPIRE", key, 60)
    return 1
  else
    return 0
  end
`;

redis.defineCommand('tokenBucket', {
  numberOfKeys: 1,
  lua: tokenBucketScript,
});

export const rateLimiter = (capacity: number, refillRate: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const key = `ratelimit:${ip}`;
      const now = Math.floor(Date.now() / 1000);

      // @ts-ignore - custom command
      const allowed = await redis.tokenBucket(key, capacity, refillRate, now);

      if (allowed === 1) {
        next();
      } else {
        res.status(429).json({ error: 'Too Many Requests' });
      }
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail open
      next();
    }
  };
};
