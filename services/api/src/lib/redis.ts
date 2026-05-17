import Redis from 'ioredis';

const createTestRedis = () => ({
  get: async () => null,
  setex: async () => undefined,
  del: async () => 0,
  defineCommand: () => undefined,
  tokenBucket: async () => 1,
  on: () => undefined,
  disconnect: () => undefined
});

export const redis: any =
  process.env.NODE_ENV === 'test' && process.env.RUN_INTEGRATION_TESTS !== 'true'
    ? createTestRedis()
    : new Redis(getRedisUrl(), {
        maxRetriesPerRequest: null
      });

redis.on('error', (err: Error) => console.error('Redis Client Error', err));
redis.on('connect', () => console.log('Redis Client Connected'));

function getRedisUrl() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required');
  }

  return process.env.REDIS_URL;
}
