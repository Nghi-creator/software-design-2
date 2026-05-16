import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import Redis from 'ioredis';
import { query, withTransaction } from '../../../src/lib/db';
import { redis as sharedRedis } from '../../../src/lib/redis';
import { createIdempotencyMiddleware } from '../../../src/middleware/idempotency';
import { createRegistrationRateLimiter } from '../../../src/middleware/rateLimiter';
import { registerForWorkshop } from '../../../src/services/registration';
import {
  cleanupFixture,
  createFixture,
  createMiddlewareHarness,
  createStudent,
  freeRegistrationDependencies,
  registerHttpStudent,
  registerRealServiceCleanup,
  skipReason,
  startHttpServer
} from './support';

registerRealServiceCleanup();

test('real Postgres/Redis registration idempotency persists and replays payment response', {
  skip: skipReason
}, async () => {
  const redis = new Redis(process.env.REDIS_URL as string);
  const fixture = await createFixture();
  const idempotencyKey = `real-idem-${fixture.suffix}`;

  try {
    await redis.del(`idempotency:${idempotencyKey}`);
    await query('delete from idempotency_keys where key = $1', [idempotencyKey]);

    const middleware = createIdempotencyMiddleware({
      query: (text, params) => query(text, params),
      redis
    });
    const first = createMiddlewareHarness(idempotencyKey);

    await middleware(first.req as any, first.res as any, first.next as any);
    assert.equal(first.next.called, true);

    const registration = await registerForWorkshop(
      {
        workshopId: fixture.workshopId,
        userId: fixture.studentId,
        idempotencyKey
      },
      freeRegistrationDependencies(`qr-${fixture.suffix}`)
    );

    first.res.status(201).json({ success: true, registration });
    await first.done;

    const persistedKey = await query<{ status: string; statusCode: number; response: string }>(
      'select status, status_code as "statusCode", response from idempotency_keys where key = $1',
      [idempotencyKey]
    );
    const persistedPayment = await query<{ status: string; transactionId: string }>(
      'select status, transaction_id as "transactionId" from payments where registration_id = $1',
      [registration.id]
    );
    const cached = await redis.get(`idempotency:${idempotencyKey}`);

    assert.equal(persistedKey.rows[0].status, 'COMPLETED');
    assert.equal(persistedKey.rows[0].statusCode, 201);
    assert.equal(persistedPayment.rows[0].status, 'SUCCESS');
    assert.equal(persistedPayment.rows[0].transactionId, 'free');
    assert.ok(cached);

    const replay = createMiddlewareHarness(idempotencyKey);
    await middleware(replay.req as any, replay.res as any, replay.next as any);
    await replay.done;

    assert.equal(replay.next.called, false);
    assert.equal(replay.res.statusCode, 201);
    assert.deepEqual(replay.res.body, JSON.parse(persistedKey.rows[0].response));
  } finally {
    await redis.del(`idempotency:${idempotencyKey}`);
    await query('delete from idempotency_keys where key = $1', [idempotencyKey]);
    await cleanupFixture(fixture);
    redis.disconnect();
  }
});

test('real Postgres paid registration stores a successful payment and confirmed QR registration', {
  skip: skipReason
}, async () => {
  const fixture = await createFixture();

  try {
    await query('update workshops set price = 75 where id = $1', [fixture.workshopId]);

    const registration = await registerForWorkshop(
      {
        workshopId: fixture.workshopId,
        userId: fixture.studentId,
        paymentToken: `tok_${fixture.suffix}`,
        idempotencyKey: `paid-${fixture.suffix}`
      },
      {
        withTransaction,
        processPayment: async () => `txn-${fixture.suffix}`,
        createQrCode: () => `qr-paid-${fixture.suffix}`,
        publishRegistrationConfirmed: async () => undefined,
        markWorkshopSoldOut: async () => undefined,
        clearWorkshopSoldOut: async () => undefined
      }
    );

    const payment = await query<{ status: string; amount: string; transactionId: string }>(
      'select status, amount, transaction_id as "transactionId" from payments where registration_id = $1',
      [registration.id]
    );

    assert.equal(registration.status, 'CONFIRMED');
    assert.equal(registration.qrCode, `qr-paid-${fixture.suffix}`);
    assert.deepEqual(payment.rows[0], {
      status: 'SUCCESS',
      amount: '75.00',
      transactionId: `txn-${fixture.suffix}`
    });
  } finally {
    await cleanupFixture(fixture);
  }
});

test('real HTTP paid registration timeout replays one failed result and leaves browse available', {
  skip: skipReason
}, async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';
  const fixture = await createFixture();
  const { server, baseUrl } = startHttpServer();
  const student = await registerHttpStudent(baseUrl, fixture.suffix, 500);
  const idempotencyKey = `real-timeout-${fixture.suffix}`;
  const originalProcessPayment = (await import('../../../src/di')).registrationDependencies.processPayment;
  let paymentCalls = 0;

  try {
    await query('update workshops set price = 75 where id = $1', [fixture.workshopId]);
    (await import('../../../src/di')).registrationDependencies.processPayment = async () => {
      paymentCalls += 1;
      throw new Error('gateway timeout');
    };

    const first = await fetch(`${baseUrl}/api/workshops/${fixture.workshopId}/register`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${student.accessToken}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ paymentToken: `tok_${fixture.suffix}` })
    });
    const firstBody = await first.json();

    const browse = await fetch(
      `${baseUrl}/api/workshops?q=${encodeURIComponent(`Workshop ${fixture.suffix}`)}`
    );
    const browseBody = await browse.json();

    const replay = await fetch(`${baseUrl}/api/workshops/${fixture.workshopId}/register`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${student.accessToken}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ paymentToken: `tok_retry_${fixture.suffix}` })
    });
    const replayBody = await replay.json();

    const workshop = await query<{ seatsRemaining: number }>(
      'select seats_remaining as "seatsRemaining" from workshops where id = $1',
      [fixture.workshopId]
    );
    const registration = await query<{ status: string }>(
      'select status from registrations where user_id = $1 and workshop_id = $2',
      [student.user.id, fixture.workshopId]
    );
    const payment = await query<{ status: string }>(
      `
        select p.status
        from payments p
        join registrations r on r.id = p.registration_id
        where r.user_id = $1 and r.workshop_id = $2
      `,
      [student.user.id, fixture.workshopId]
    );

    assert.equal(first.status, 503);
    assert.deepEqual(firstBody, { success: false, error: 'gateway timeout' });
    assert.equal(browse.status, 200);
    assert.equal(browseBody.items[0].id, fixture.workshopId);
    assert.equal(replay.status, 503);
    assert.deepEqual(replayBody, firstBody);
    assert.equal(paymentCalls, 1);
    assert.equal(workshop.rows[0].seatsRemaining, 20);
    assert.equal(registration.rows[0].status, 'CANCELLED');
    assert.equal(payment.rows[0].status, 'FAILED');
  } finally {
    (await import('../../../src/di')).registrationDependencies.processPayment = originalProcessPayment;
    await query('delete from idempotency_keys where key = $1', [idempotencyKey]);
    await cleanupFixture(fixture, [student.user.id]);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('real Postgres allows only one winner when two students race for the last seat', {
  skip: skipReason
}, async () => {
  const fixture = await createFixture({ capacity: 1 });
  const secondStudentId = await createStudent(fixture.suffix, 'second');

  try {
    const results = await Promise.allSettled([
      registerForWorkshop(
        {
          workshopId: fixture.workshopId,
          userId: fixture.studentId,
          idempotencyKey: `race-a-${fixture.suffix}`
        },
        freeRegistrationDependencies(`qr-race-a-${fixture.suffix}`)
      ),
      registerForWorkshop(
        {
          workshopId: fixture.workshopId,
          userId: secondStudentId,
          idempotencyKey: `race-b-${fixture.suffix}`
        },
        freeRegistrationDependencies(`qr-race-b-${fixture.suffix}`)
      )
    ]);

    const successful = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    const workshop = await query<{ seatsRemaining: number }>(
      'select seats_remaining as "seatsRemaining" from workshops where id = $1',
      [fixture.workshopId]
    );
    const registrations = await query<{ count: string }>(
      'select count(*)::text as count from registrations where workshop_id = $1',
      [fixture.workshopId]
    );

    assert.equal(successful.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(String((rejected[0] as PromiseRejectedResult).reason.message), /Workshop is full/);
    assert.equal(workshop.rows[0].seatsRemaining, 0);
    assert.equal(registrations.rows[0].count, '1');
  } finally {
    await cleanupFixture(fixture, [secondStudentId]);
  }
});

test('real HTTP registration keeps capacity exact under a burst larger than the workshop', {
  skip: skipReason
}, async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';
  const redis = new Redis(process.env.REDIS_URL as string);
  const fixture = await createFixture({ capacity: 60 });
  const { server, baseUrl } = startHttpServer();
  const studentRegistrations = await Promise.all(
    Array.from({ length: 100 }, (_, index) => registerHttpStudent(baseUrl, fixture.suffix, index))
  );
  const keys = studentRegistrations.map((_, index) => `http-burst-${fixture.suffix}-${index}`);

  try {
    await Promise.all(keys.map((key) => redis.del(`idempotency:${key}`)));
    await query('delete from idempotency_keys where key = any($1::text[])', [keys]);

    const responses = await Promise.all(
      studentRegistrations.map(({ accessToken }, index) =>
        fetch(`${baseUrl}/api/workshops/${fixture.workshopId}/register`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            'idempotency-key': keys[index]
          },
          body: JSON.stringify({})
        })
      )
    );
    const bodies = await Promise.all(responses.map((response) => response.json()));
    const successCount = responses.filter((response) => response.status === 200).length;
    const fullCount = responses.filter((response) => response.status === 400).length;
    const workshop = await query<{ seatsRemaining: number }>(
      'select seats_remaining as "seatsRemaining" from workshops where id = $1',
      [fixture.workshopId]
    );
    const registrations = await query<{ count: string }>(
      'select count(*)::text as count from registrations where workshop_id = $1 and status = $2',
      [fixture.workshopId, 'CONFIRMED']
    );

    assert.equal(successCount, 60);
    assert.equal(fullCount, 40);
    assert.ok(bodies.filter((body) => body.success === true).every((body) => body.registration.status === 'CONFIRMED'));
    assert.ok(bodies.filter((body) => body.success === false).every((body) => body.error === 'Workshop is full'));
    assert.equal(workshop.rows[0].seatsRemaining, 0);
    assert.equal(registrations.rows[0].count, '60');
  } finally {
    await Promise.all(keys.map((key) => redis.del(`idempotency:${key}`)));
    await query('delete from idempotency_keys where key = any($1::text[])', [keys]);
    await cleanupFixture(fixture, studentRegistrations.map((registration) => registration.user.id));
    redis.disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test('real Redis registration limiter blocks spam from one student without penalizing another on the same IP', {
  skip: skipReason
}, async () => {
  const firstStudentId = `fairness-first-${Date.now()}`;
  const secondStudentId = `fairness-second-${Date.now()}`;
  const limiter = createRegistrationRateLimiter(undefined, {
    redis: sharedRedis,
    now: () => 100
  });

  try {
    await sharedRedis.del(
      'ratelimit:registration:global',
      `ratelimit:registration:student:${firstStudentId}`,
      `ratelimit:registration:student:${secondStudentId}`
    );

    const firstResponses = [];
    for (let index = 0; index < 6; index += 1) {
      firstResponses.push(await runRateLimiter(limiter, firstStudentId));
    }
    const secondResponse = await runRateLimiter(limiter, secondStudentId);

    assert.deepEqual(firstResponses, [200, 200, 200, 200, 200, 429]);
    assert.equal(secondResponse, 200);
  } finally {
    await sharedRedis.del(
      'ratelimit:registration:global',
      `ratelimit:registration:student:${firstStudentId}`,
      `ratelimit:registration:student:${secondStudentId}`
    );
  }
});

const runRateLimiter = async (
  limiter: ReturnType<typeof createRegistrationRateLimiter>,
  userId: string
) => {
  let statusCode = 200;
  let nextCalled = false;
  const req = {
    ip: '127.0.0.1',
    headers: {},
    user: { id: userId }
  };
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    }
  };

  await limiter(req as any, res as any, () => {
    nextCalled = true;
  });

  return nextCalled ? 200 : statusCode;
};
