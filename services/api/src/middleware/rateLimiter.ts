import { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis';
import { RequestWithUser } from '../types/request';

// Lua script for token bucket bookkeeping. Every bucket is independent; callers
// compose buckets when they need both aggregate protection and actor fairness.
const tokenBucketScript = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])
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
  lua: tokenBucketScript
});

type TokenBucketRedis = {
  tokenBucket: (key: string, capacity: number, refillRate: number, now: number) => Promise<number>;
};

type RateLimitDependencies = {
  redis: TokenBucketRedis;
  now?: () => number;
};

type BucketConfig = {
  capacity: number;
  refillRate: number;
};

type RegistrationRateLimitConfig = {
  global: BucketConfig;
  actor: BucketConfig;
};

const DEFAULT_REGISTRATION_LIMITS: RegistrationRateLimitConfig = {
  // 12k students / first 10 minutes, with 60% concentrated in the first
  // 3 minutes, is roughly 40 requests/second at the sharp edge.
  global: { capacity: 120, refillRate: 40 },
  actor: { capacity: 5, refillRate: 0.5 }
};

export const createRegistrationRateLimiter = (
  config: RegistrationRateLimitConfig = DEFAULT_REGISTRATION_LIMITS,
  dependencies: RateLimitDependencies = { redis }
) => {
  const now = dependencies.now ?? (() => Math.floor(Date.now() / 1000));

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as RequestWithUser).user?.id;
      const actorIdentity = userId ? `student:${userId}` : `ip:${getRequestIp(req)}`;
      const timestamp = now();

      const globalAllowed = await dependencies.redis.tokenBucket(
        'ratelimit:registration:global',
        config.global.capacity,
        config.global.refillRate,
        timestamp
      );

      if (globalAllowed !== 1) {
        return reject(res);
      }

      const actorAllowed = await dependencies.redis.tokenBucket(
        `ratelimit:registration:${actorIdentity}`,
        config.actor.capacity,
        config.actor.refillRate,
        timestamp
      );

      if (actorAllowed !== 1) {
        return reject(res);
      }

      next();
    } catch (error) {
      console.error('Rate Limiter Error:', error);
      // Fail open so Redis outages do not turn into a registration outage.
      next();
    }
  };
};

export const registrationRateLimiter = createRegistrationRateLimiter();

const reject = (res: Response) => res.status(429).json({
  success: false,
  error: 'Too Many Requests'
});

const getRequestIp = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0];
  }

  return req.ip || 'unknown';
};
