import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, test } from 'node:test';
import Redis from 'ioredis';
import { query, withTransaction, db } from '../src/lib/db';
import { redis as sharedRedis } from '../src/lib/redis';
import { createIdempotencyMiddleware } from '../src/middleware/idempotency';
import { registerForWorkshop } from '../src/services/registration';
import { syncOfflineCheckins } from '../src/services/checkin';
import {
  closeNotificationQueue,
  publishRegistrationConfirmed
} from '../src/jobs/notificationQueue';
import { createNotificationWorker } from '../src/workers/notificationWorker';

// Run with:
// RUN_INTEGRATION_TESTS=true DATABASE_URL=postgres://... REDIS_URL=redis://... npm test
const skipReason = getRealServicesSkipReason();

after(async () => {
  if (!skipReason) {
    await closeNotificationQueue();
    sharedRedis.disconnect();
    await db?.end();
  }
});

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
      {
        withTransaction,
        processPayment: async () => 'unused-for-free-workshop',
        createQrCode: () => `qr-${fixture.suffix}`,
        publishRegistrationConfirmed: async () => undefined
      }
    );

    first.res.status(201).json({ success: true, registration });
    await first.done;

    const persistedKey = await query<{
      status: string;
      statusCode: number;
      response: string;
    }>(
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

test('real Postgres offline check-in sync is idempotent for repeated QR scans', {
  skip: skipReason
}, async () => {
  const fixture = await createFixture();
  const qrCode = `qr-sync-${fixture.suffix}`;
  const registration = await createConfirmedRegistration(fixture, qrCode);

  try {
    const first = await syncOfflineCheckins(
      [{ localId: 'scan-1', qrCode, scannedAt: '2026-05-16T08:00:00.000Z' }],
      fixture.staffId
    );
    const second = await syncOfflineCheckins(
      [{ localId: 'scan-2', qrCode, scannedAt: '2026-05-16T08:01:00.000Z' }],
      fixture.staffId
    );
    const checkins = await query<{ count: string }>(
      'select count(*)::text as count from checkins where registration_id = $1',
      [registration.id]
    );

    assert.deepEqual(first, [
      {
        localId: 'scan-1',
        qrCode,
        status: 'checked_in',
        registrationId: registration.id
      }
    ]);
    assert.deepEqual(second, [
      {
        localId: 'scan-2',
        qrCode,
        status: 'already_checked_in',
        registrationId: registration.id
      }
    ]);
    assert.equal(checkins.rows[0].count, '1');
  } finally {
    await cleanupFixture(fixture);
  }
});

test('real BullMQ worker delivers registration notification and persists sent status', {
  skip: skipReason
}, async () => {
  const fixture = await createFixture();
  const registration = await createConfirmedRegistration(fixture, `qr-notify-${fixture.suffix}`);
  const worker = createNotificationWorker();

  try {
    await publishRegistrationConfirmed(registration.id);

    const notification = await waitForNotification(registration.id);

    assert.equal(notification.status, 'SENT');
    assert.equal(notification.channel, 'EMAIL');
    assert.equal(notification.attemptCount, 1);
    assert.match(notification.subject, /Registration confirmed/);
  } finally {
    await worker.close();
    await query('delete from notifications where registration_id = $1', [registration.id]);
    await cleanupFixture(fixture);
  }
});

type Fixture = {
  suffix: string;
  studentId: string;
  staffId: string;
  roomId: string;
  workshopId: string;
};

const createFixture = async (): Promise<Fixture> => {
  const suffix = `real_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const student = await query<{ id: string }>(
    `
      insert into users (email, name, role, student_id)
      values ($1, $2, 'STUDENT', $3)
      returning id
    `,
    [`student.${suffix}@example.test`, `Student ${suffix}`, suffix]
  );
  const staff = await query<{ id: string }>(
    `
      insert into users (email, name, role)
      values ($1, $2, 'CHECKIN_STAFF')
      returning id
    `,
    [`staff.${suffix}@example.test`, `Staff ${suffix}`]
  );
  const room = await query<{ id: string }>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [`Room ${suffix}`, `Building ${suffix}`, 20]
  );
  const workshop = await query<{ id: string }>(
    `
      insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
      values ($1, $2, $3, 20, 20, 0, now() + interval '1 day')
      returning id
    `,
    [`Workshop ${suffix}`, `Speaker ${suffix}`, room.rows[0].id]
  );

  return {
    suffix,
    studentId: student.rows[0].id,
    staffId: staff.rows[0].id,
    roomId: room.rows[0].id,
    workshopId: workshop.rows[0].id
  };
};

const createConfirmedRegistration = async (fixture: Fixture, qrCode: string) => {
  const result = await query<{ id: string }>(
    `
      insert into registrations (user_id, workshop_id, qr_code, status)
      values ($1, $2, $3, 'CONFIRMED')
      returning id
    `,
    [fixture.studentId, fixture.workshopId, qrCode]
  );

  return result.rows[0];
};

const cleanupFixture = async (fixture: Fixture) => {
  await query(
    `
      delete from notifications
      where registration_id in (select id from registrations where workshop_id = $1)
    `,
    [fixture.workshopId]
  );
  await query(
    `
      delete from checkins
      where registration_id in (select id from registrations where workshop_id = $1)
    `,
    [fixture.workshopId]
  );
  await query(
    `
      delete from payments
      where registration_id in (select id from registrations where workshop_id = $1)
    `,
    [fixture.workshopId]
  );
  await query('delete from registrations where workshop_id = $1', [fixture.workshopId]);
  await query('delete from workshops where id = $1', [fixture.workshopId]);
  await query('delete from rooms where id = $1', [fixture.roomId]);
  await query('delete from users where id = any($1::uuid[])', [[fixture.studentId, fixture.staffId]]);
};

const waitForNotification = async (registrationId: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await query<{
      status: string;
      channel: string;
      attemptCount: number;
      subject: string;
    }>(
      `
        select status, channel, attempt_count as "attemptCount", subject
        from notifications
        where registration_id = $1
      `,
      [registrationId]
    );

    if (result.rows[0]?.status === 'SENT') {
      return result.rows[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for notification delivery');
};

const createMiddlewareHarness = (key: string) => {
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const req = {
    headers: { 'idempotency-key': key }
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

function getRealServicesSkipReason() {
  if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
    return 'set RUN_INTEGRATION_TESTS=true to run real Postgres/Redis integration tests';
  }

  if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
    return 'DATABASE_URL and REDIS_URL are required for real-service integration tests';
  }

  return false;
}
