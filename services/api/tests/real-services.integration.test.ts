import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, test } from 'node:test';
import { AddressInfo } from 'node:net';
import Redis from 'ioredis';
import app from '../src/app';
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
        publishRegistrationConfirmed: async () => undefined,
        markWorkshopSoldOut: async () => undefined,
        clearWorkshopSoldOut: async () => undefined
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
  const server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const studentRegistrations = await Promise.all(
    Array.from({ length: 100 }, (_, index) =>
      registerHttpStudent(baseUrl, fixture.suffix, index)
    )
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
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';
  const redis = new Redis(process.env.REDIS_URL as string);
  const fixture = await createFixture({ capacity: 20 });
  const server = app.listen(0);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const firstStudent = await registerHttpStudent(baseUrl, fixture.suffix, 201);
  const secondStudent = await registerHttpStudent(baseUrl, fixture.suffix, 202);
  const keys = Array.from({ length: 7 }, (_, index) => `fairness-${fixture.suffix}-${index}`);

  try {
    await redis.del(
      'ratelimit:registration:global',
      `ratelimit:registration:student:${firstStudent.user.id}`,
      `ratelimit:registration:student:${secondStudent.user.id}`,
      ...keys.map((key) => `idempotency:${key}`)
    );
    await query('delete from idempotency_keys where key = any($1::text[])', [keys]);

    const firstResponses = [];
    for (let index = 0; index < 6; index += 1) {
      firstResponses.push(await fetch(`${baseUrl}/api/workshops/${fixture.workshopId}/register`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${firstStudent.accessToken}`,
          'content-type': 'application/json',
          'idempotency-key': keys[index]
        },
        body: JSON.stringify({})
      }));
    }

    const secondResponse = await fetch(`${baseUrl}/api/workshops/${fixture.workshopId}/register`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secondStudent.accessToken}`,
        'content-type': 'application/json',
        'idempotency-key': keys[6]
      },
      body: JSON.stringify({})
    });

    assert.deepEqual(firstResponses.map((response) => response.status), [200, 400, 400, 400, 400, 429]);
    assert.equal(secondResponse.status, 200);
  } finally {
    await redis.del(
      'ratelimit:registration:global',
      `ratelimit:registration:student:${firstStudent.user.id}`,
      `ratelimit:registration:student:${secondStudent.user.id}`,
      ...keys.map((key) => `idempotency:${key}`)
    );
    await query('delete from idempotency_keys where key = any($1::text[])', [keys]);
    await cleanupFixture(fixture, [firstStudent.user.id, secondStudent.user.id]);
    redis.disconnect();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
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

const createFixture = async ({ capacity = 20 }: { capacity?: number } = {}): Promise<Fixture> => {
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
    [`Room ${suffix}`, `Building ${suffix}`, capacity]
  );
  const workshop = await query<{ id: string }>(
    `
      insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
      values ($1, $2, $3, $4, $4, 0, now() + interval '1 day')
      returning id
    `,
    [`Workshop ${suffix}`, `Speaker ${suffix}`, room.rows[0].id, capacity]
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

const cleanupFixture = async (fixture: Fixture, extraUserIds: string[] = []) => {
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
  await query('delete from users where id = any($1::uuid[])', [[fixture.studentId, fixture.staffId, ...extraUserIds]]);
};

const createStudent = async (suffix: string, label: string) => {
  const result = await query<{ id: string }>(
    `
      insert into users (email, name, role, student_id)
      values ($1, $2, 'STUDENT', $3)
      returning id
    `,
    [`student.${label}.${suffix}@example.test`, `Student ${label} ${suffix}`, `${label}_${suffix}`]
  );

  return result.rows[0].id;
};

const freeRegistrationDependencies = (qrCode: string) => ({
  withTransaction,
  processPayment: async () => 'unused-for-free-workshop',
  createQrCode: () => qrCode,
  publishRegistrationConfirmed: async () => undefined,
  markWorkshopSoldOut: async () => undefined,
  clearWorkshopSoldOut: async () => undefined
});

const registerHttpStudent = async (baseUrl: string, suffix: string, index: number) => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: `http.student.${index}.${suffix}@example.test`,
      password: 'Password123',
      name: `HTTP Student ${index} ${suffix}`,
      role: 'STUDENT',
      studentId: `http_${index}_${suffix}`
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);

  return body as {
    user: { id: string };
    accessToken: string;
  };
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
