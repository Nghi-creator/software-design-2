import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { redis } from '../src/lib/redis';
import {
  createPreAuthRegistrationRateLimiter,
  createRegistrationRateLimiter,
  rejectSoldOutRegistrations
} from '../src/middleware/rateLimiter';

after(() => {
  redis.disconnect();
});

test('registration limiter checks the global bucket before the per-student bucket', async () => {
  const calls: string[] = [];
  const middleware = createRegistrationRateLimiter(
    {
      global: { capacity: 1, refillRate: 1 },
      actor: { capacity: 5, refillRate: 1 }
    },
    {
      redis: {
        tokenBucket: async (key) => {
          calls.push(key);
          return key.endsWith(':global') ? 0 : 1;
        }
      },
      now: () => 100
    }
  );
  const { req, res, next, done } = createHarness({ userId: 'student-1' });

  await middleware(req as any, res as any, next as any);
  await done;

  assert.deepEqual(calls, ['ratelimit:registration:global']);
  assert.equal(res.statusCode, 429);
  assert.equal(next.called, false);
});

test('registration limiter isolates authenticated students sharing the same IP', async () => {
  const seenKeys: string[] = [];
  const middleware = createRegistrationRateLimiter(undefined, {
    redis: {
      tokenBucket: async (key) => {
        seenKeys.push(key);
        return 1;
      }
    },
    now: () => 100
  });
  const first = createHarness({ userId: 'student-a', ip: '10.0.0.5' });
  const second = createHarness({ userId: 'student-b', ip: '10.0.0.5' });

  await middleware(first.req as any, first.res as any, first.next as any);
  await middleware(second.req as any, second.res as any, second.next as any);

  assert.deepEqual(seenKeys, [
    'ratelimit:registration:global',
    'ratelimit:registration:student:student-a',
    'ratelimit:registration:global',
    'ratelimit:registration:student:student-b'
  ]);
  assert.equal(first.next.called, true);
  assert.equal(second.next.called, true);
});

test('registration limiter blocks one abusive student without blocking others', async () => {
  const remaining = new Map<string, number>([
    ['ratelimit:registration:global', 20],
    ['ratelimit:registration:student:student-a', 1],
    ['ratelimit:registration:student:student-b', 1]
  ]);
  const middleware = createRegistrationRateLimiter(undefined, {
    redis: {
      tokenBucket: async (key) => {
        const tokens = remaining.get(key) ?? 0;
        remaining.set(key, tokens - 1);
        return tokens > 0 ? 1 : 0;
      }
    },
    now: () => 100
  });
  const firstAllowed = createHarness({ userId: 'student-a' });
  const firstBlocked = createHarness({ userId: 'student-a' });
  const secondAllowed = createHarness({ userId: 'student-b' });

  await middleware(firstAllowed.req as any, firstAllowed.res as any, firstAllowed.next as any);
  await middleware(firstBlocked.req as any, firstBlocked.res as any, firstBlocked.next as any);
  await middleware(secondAllowed.req as any, secondAllowed.res as any, secondAllowed.next as any);
  await firstBlocked.done;

  assert.equal(firstAllowed.next.called, true);
  assert.equal(firstBlocked.res.statusCode, 429);
  assert.equal(secondAllowed.next.called, true);
});

test('registration limiter falls back to the first forwarded IP when no user exists', async () => {
  const seenKeys: string[] = [];
  const middleware = createRegistrationRateLimiter(undefined, {
    redis: {
      tokenBucket: async (key) => {
        seenKeys.push(key);
        return 1;
      }
    },
    now: () => 100
  });
  const { req, res, next } = createHarness({
    forwardedFor: '203.0.113.7, 10.0.0.5'
  });

  await middleware(req as any, res as any, next as any);

  assert.equal(next.called, true);
  assert.deepEqual(seenKeys, [
    'ratelimit:registration:global',
    'ratelimit:registration:ip:203.0.113.7'
  ]);
});

test('registration limiter fails open when Redis is unavailable', async () => {
  const originalConsoleError = console.error;
  const errors: unknown[] = [];
  console.error = (error?: unknown) => {
    errors.push(error);
  };
  const middleware = createRegistrationRateLimiter(undefined, {
    redis: {
      tokenBucket: async () => {
        throw new Error('redis unavailable');
      }
    },
    now: () => 100
  });
  const { req, res, next } = createHarness({ userId: 'student-1' });

  try {
    await middleware(req as any, res as any, next as any);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(next.called, true);
  assert.equal(res.statusCode, 200);
  assert.equal(errors.length, 1);
});

test('pre-auth registration limiter rejects abusive IPs before authentication work is needed', async () => {
  const seenKeys: string[] = [];
  const middleware = createPreAuthRegistrationRateLimiter(
    { capacity: 1, refillRate: 1 },
    {
      redis: {
        tokenBucket: async (key) => {
          seenKeys.push(key);
          return 0;
        }
      },
      now: () => 100
    }
  );
  const { req, res, next, done } = createHarness({ ip: '198.51.100.4' });

  await middleware(req as any, res as any, next as any);
  await done;

  assert.deepEqual(seenKeys, ['ratelimit:registration:preauth:198.51.100.4']);
  assert.equal(res.statusCode, 429);
  assert.equal(next.called, false);
});

test('pre-auth registration limiter uses forwarded IP so rejection can happen before auth on proxied traffic', async () => {
  const seenKeys: string[] = [];
  const middleware = createPreAuthRegistrationRateLimiter(undefined, {
    redis: {
      tokenBucket: async (key) => {
        seenKeys.push(key);
        return 1;
      }
    },
    now: () => 100
  });
  const { req, res, next } = createHarness({
    forwardedFor: '203.0.113.7, 10.0.0.5'
  });

  await middleware(req as any, res as any, next as any);

  assert.equal(next.called, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(seenKeys, ['ratelimit:registration:preauth:203.0.113.7']);
});

test('sold-out registration cache rejects before auth when a workshop is already full', async () => {
  const originalGet = require('../src/lib/redis').redis.get;
  require('../src/lib/redis').redis.get = async () => '1';
  const { req, res, next, done } = createHarness();
  req.params = { id: 'workshop-1' };

  try {
    await rejectSoldOutRegistrations(req as any, res as any, next as any);
    await done;
  } finally {
    require('../src/lib/redis').redis.get = originalGet;
  }

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, error: 'Workshop is full' });
  assert.equal(next.called, false);
});

const createHarness = ({
  userId,
  ip = '127.0.0.1',
  forwardedFor
}: {
  userId?: string;
  ip?: string;
  forwardedFor?: string;
} = {}) => {
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const req = {
    ip,
    headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
    user: userId ? { id: userId } : undefined,
    params: {} as Record<string, string>
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      resolveDone();
      return this;
    }
  };
  const next = Object.assign(
    () => {
      next.called = true;
    },
    { called: false }
  );

  return { req, res, next, done };
};
