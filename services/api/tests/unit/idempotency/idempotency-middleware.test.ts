import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdempotencyMiddleware } from '../../../src/middleware/idempotency';

test('idempotency middleware replays cached completed responses without calling the handler', async () => {
  const middleware = createIdempotencyMiddleware({
    query: async () => {
      throw new Error('database should not be used on redis hit');
    },
    redis: {
      get: async () => JSON.stringify({ statusCode: 200, body: { success: true, registration: { id: 'r1' } } }),
      setex: async () => undefined
    }
  });
  const { req, res, next, done } = createMiddlewareHarness('idem-cached');

  await middleware(req as any, res as any, next as any);
  await done;

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, registration: { id: 'r1' } });
  assert.equal(next.called, false);
});

test('idempotency middleware replays completed PostgreSQL responses and restores Redis cache', async () => {
  let cacheValue: string | undefined;
  const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
  const middleware = createIdempotencyMiddleware({
    query: async (_text, params = []) => {
      if (params[1] === 'IN_PROGRESS') {
        throw duplicateError;
      }

      return {
        rows: [
          {
            status: 'COMPLETED',
            response: JSON.stringify({ success: true, registration: { id: 'r2' } }),
            statusCode: 200
          }
        ]
      };
    },
    redis: {
      get: async () => null,
      setex: async (_key, _seconds, value) => {
        cacheValue = value;
      }
    }
  });
  const { req, res, next, done } = createMiddlewareHarness('idem-db');

  await middleware(req as any, res as any, next as any);
  await done;

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, registration: { id: 'r2' } });
  assert.deepEqual(JSON.parse(cacheValue as string), {
    statusCode: 200,
    body: { success: true, registration: { id: 'r2' } }
  });
  assert.equal(next.called, false);
});

test('idempotency middleware persists final registration response after handler JSON', async () => {
  const updates: Array<{ statusCode: number; body: string }> = [];
  const middleware = createIdempotencyMiddleware({
    query: async (_text, params = []) => {
      if (params[1] === 'IN_PROGRESS') {
        return { rows: [] };
      }

      updates.push({ statusCode: params[2] as number, body: params[3] as string });
      return { rows: [] };
    },
    redis: {
      get: async () => null,
      setex: async () => undefined
    }
  });
  const { req, res, next, done } = createMiddlewareHarness('idem-new');

  await middleware(req as any, res as any, next as any);
  assert.equal(next.called, true);
  res.status(201).json({ success: true, registration: { id: 'r3' } });
  await done;
  await waitForAsyncPersistence();

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { success: true, registration: { id: 'r3' } });
  assert.deepEqual(updates, [
    {
      statusCode: 201,
      body: JSON.stringify({ success: true, registration: { id: 'r3' } })
    }
  ]);
});

test('idempotency middleware does not suppress handler response when persistence fails', async () => {
  const originalConsoleError = console.error;
  const loggedErrors: unknown[] = [];
  console.error = (error?: unknown) => {
    loggedErrors.push(error);
  };
  const middleware = createIdempotencyMiddleware({
    query: async (_text, params = []) => {
      if (params[1] === 'IN_PROGRESS') {
        return { rows: [] };
      }

      throw new Error('idempotency storage failed');
    },
    redis: {
      get: async () => null,
      setex: async () => undefined
    }
  });
  const { req, res, next, done } = createMiddlewareHarness('idem-storage-fail');

  try {
    await middleware(req as any, res as any, next as any);
    res.status(201).json({ success: true, registration: { id: 'r4' } });
    await done;
    await waitForAsyncPersistence();
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { success: true, registration: { id: 'r4' } });
  assert.equal(loggedErrors.length, 1);
});

test('idempotency middleware rejects duplicate in-progress requests', async () => {
  const duplicateError = Object.assign(new Error('duplicate key'), { code: '23505' });
  const middleware = createIdempotencyMiddleware({
    query: async (_text, params = []) => {
      if (params[1] === 'IN_PROGRESS') {
        throw duplicateError;
      }

      return { rows: [{ status: 'IN_PROGRESS', response: null, statusCode: null }] };
    },
    redis: {
      get: async () => null,
      setex: async () => undefined
    }
  });
  const { req, res, next, done } = createMiddlewareHarness('idem-busy');

  await middleware(req as any, res as any, next as any);
  await done;

  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { success: false, error: 'Request is already in progress' });
  assert.equal(next.called, false);
});

const createMiddlewareHarness = (key?: string) => {
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const req = {
    headers: key ? { 'idempotency-key': key } : {}
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
    (error?: Error) => {
      next.called = true;
      next.error = error;
    },
    { called: false, error: undefined as Error | undefined }
  );

  return { req, res, next, done };
};

const waitForAsyncPersistence = () => new Promise((resolve) => setImmediate(resolve));
