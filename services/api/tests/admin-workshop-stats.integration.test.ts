import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../src/app';
import { db, query } from '../src/lib/db';

const suffix = `stats_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds: string[] = [];
const createdRegistrationIds: string[] = [];
const createdPaymentIds: string[] = [];
const createdRoomIds: string[] = [];
const createdWorkshopIds: string[] = [];
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let organizerAccessToken = '';
let studentAccessToken = '';
let staffAccessToken = '';
let workshopId = '';

before(async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const organizer = await registerUser('ORGANIZER');
  const student = await registerUser('STUDENT');
  const staff = await registerUser('CHECKIN_STAFF');
  createdUserIds.push(organizer.user.id, student.user.id, staff.user.id);
  organizerAccessToken = organizer.accessToken;
  studentAccessToken = student.accessToken;
  staffAccessToken = staff.accessToken;

  const room = await createRoom();
  createdRoomIds.push(room.id);

  const workshop = await createWorkshop(room.id);
  createdWorkshopIds.push(workshop.id);
  workshopId = workshop.id;

  const pending = await createRegistration(student.user.id, workshop.id, 'PENDING', null);
  const confirmed = await createRegistration(organizer.user.id, workshop.id, 'CONFIRMED', new Date());
  const cancelled = await createRegistration(staff.user.id, workshop.id, 'CANCELLED', null);
  createdRegistrationIds.push(pending.id, confirmed.id, cancelled.id);

  const successfulPayment = await createPayment(confirmed.id, 'SUCCESS');
  const failedPayment = await createPayment(cancelled.id, 'FAILED');
  createdPaymentIds.push(successfulPayment.id, failedPayment.id);
});

after(async () => {
  if (createdPaymentIds.length > 0) {
    await query('delete from payments where id = any($1::uuid[])', [createdPaymentIds]);
  }

  if (createdRegistrationIds.length > 0) {
    await query('delete from registrations where id = any($1::uuid[])', [createdRegistrationIds]);
  }

  if (createdWorkshopIds.length > 0) {
    await query('delete from workshops where id = any($1::uuid[])', [createdWorkshopIds]);
  }

  if (createdRoomIds.length > 0) {
    await query('delete from rooms where id = any($1::uuid[])', [createdRoomIds]);
  }

  if (createdUserIds.length > 0) {
    await query('delete from users where id = any($1::uuid[])', [createdUserIds]);
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await db?.end();
});

test('GET /api/workshops/:id/stats returns organizer-only workshop counts', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${workshopId}/stats`, {
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    workshopId,
    capacity: 30,
    seatsRemaining: 27,
    registrations: {
      pending: 1,
      confirmed: 1,
      cancelled: 1
    },
    checkedInCount: 1,
    successfulPaymentCount: 1
  });
});

test('GET /api/workshops/:id/stats rejects non-organizer roles', async () => {
  for (const accessToken of [studentAccessToken, staffAccessToken]) {
    const response = await fetch(`${baseUrl}/api/workshops/${workshopId}/stats`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.deepEqual(body, {
      success: false,
      error: 'Forbidden'
    });
  }
});

test('GET /api/workshops/:id/stats returns 404 for missing workshops', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/00000000-0000-0000-0000-000000000000/stats`, {
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, {
    success: false,
    error: 'Workshop not found'
  });
});

async function registerUser(role: string) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      email: `${role.toLowerCase()}.${suffix}@example.test`,
      password: 'Password123',
      name: `${role} ${suffix}`,
      role
    })
  });
  const body = await response.json();

  assert.equal(response.status, 201);

  return body as {
    user: { id: string };
    accessToken: string;
  };
}

async function createRoom() {
  const result = await query<{ id: string }>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [`Room ${suffix}`, `North ${suffix}`, 40]
  );

  return result.rows[0];
}

async function createWorkshop(roomId: string) {
  const result = await query<{ id: string }>(
    `
      insert into workshops (
        title, speaker, room_id, capacity, seats_remaining, price, start_time
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [`Stats ${suffix}`, `Speaker ${suffix}`, roomId, 30, 27, 100, new Date('2026-06-01T09:00:00.000Z')]
  );

  return result.rows[0];
}

async function createRegistration(
  userId: string,
  targetWorkshopId: string,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED',
  checkedInAt: Date | null
) {
  const result = await query<{ id: string }>(
    `
      insert into registrations (user_id, workshop_id, qr_code, status, checked_in_at)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [userId, targetWorkshopId, `qr_${suffix}_${status.toLowerCase()}`, status, checkedInAt]
  );

  return result.rows[0];
}

async function createPayment(registrationId: string, status: 'SUCCESS' | 'FAILED') {
  const result = await query<{ id: string }>(
    `
      insert into payments (registration_id, amount, status, transaction_id, idempotency_key)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [
      registrationId,
      100,
      status,
      `tx_${suffix}_${status.toLowerCase()}`,
      `idem_${suffix}_${status.toLowerCase()}`
    ]
  );

  return result.rows[0];
}
