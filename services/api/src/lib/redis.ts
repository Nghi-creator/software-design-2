import Redis from 'ioredis';

const createTestRedis = () => ({
  get: async () => null,
  setex: async () => undefined,
  defineCommand: () => undefined,
  tokenBucket: async () => 1,
  on: () => undefined
});

export const redis: any =
  process.env.NODE_ENV === 'test' && process.env.RUN_INTEGRATION_TESTS !== 'true'
    ? createTestRedis()
    : new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null
      });

redis.on('error', (err: Error) => console.error('Redis Client Error', err));
redis.on('connect', () => console.log('Redis Client Connected'));
