import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../../../src/app';
import { query, withTransaction, db } from '../../../src/lib/db';
import { redis as sharedRedis } from '../../../src/lib/redis';
import { closeNotificationQueue } from '../../../src/jobs/notificationQueue';

export type Fixture = {
  suffix: string;
  studentId: string;
  staffId: string;
  roomId: string;
  workshopId: string;
};

export const skipReason = getRealServicesSkipReason();

export const registerRealServiceCleanup = () => {
  after(async () => {
    await closeNotificationQueue();
    sharedRedis.disconnect();
    await db?.end();
  });
};

export const createFixture = async ({ capacity = 20 }: { capacity?: number } = {}): Promise<Fixture> => {
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

export const createConfirmedRegistration = async (fixture: Fixture, qrCode: string) => {
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

export const cleanupFixture = async (fixture: Fixture, extraUserIds: string[] = []) => {
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

export const createStudent = async (suffix: string, label: string) => {
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

export const freeRegistrationDependencies = (qrCode: string) => ({
  withTransaction,
  processPayment: async () => 'unused-for-free-workshop',
  createQrCode: () => qrCode,
  publishRegistrationConfirmed: async () => undefined,
  markWorkshopSoldOut: async () => undefined,
  clearWorkshopSoldOut: async () => undefined
});

export const registerHttpStudent = async (baseUrl: string, suffix: string, index: number) => {
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

export const createMiddlewareHarness = (key: string) => {
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

export const startHttpServer = () => {
  const server = app.listen(0);
  const address = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
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
