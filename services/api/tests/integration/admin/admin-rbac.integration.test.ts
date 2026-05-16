import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../../../src/app';
import { db, query } from '../../../src/lib/db';
import { redis } from '../../../src/lib/redis';

const suffix = `admin_rbac_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds: string[] = [];
const createdRoomIds: string[] = [];
const createdWorkshopIds: string[] = [];
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let organizerAccessToken = '';
let studentAccessToken = '';
let staffAccessToken = '';
let roomId = '';
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
  roomId = room.id;
  createdRoomIds.push(room.id);

  const workshop = await createWorkshop(room.id);
  workshopId = workshop.id;
  createdWorkshopIds.push(workshop.id);
});

after(async () => {
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
  redis.disconnect();
  await db?.end();
});

test('admin workshop routes require authentication before role checks', async () => {
  for (const request of [
    fetch(`${baseUrl}/api/workshops`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(workshopPayload()) }),
    fetch(`${baseUrl}/api/workshops/${workshopId}`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify(workshopPayload()) }),
    fetch(`${baseUrl}/api/workshops/${workshopId}`, { method: 'DELETE' }),
    fetch(`${baseUrl}/api/workshops/${workshopId}/stats`)
  ]) {
    const response = await request;
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.deepEqual(body, { success: false, error: 'Authentication required' });
  }
});

test('students and check-in staff cannot use internal admin workshop actions', async () => {
  for (const accessToken of [studentAccessToken, staffAccessToken]) {
    for (const request of [
      fetch(`${baseUrl}/api/workshops`, {
        method: 'POST',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(workshopPayload())
      }),
      fetch(`${baseUrl}/api/workshops/${workshopId}`, {
        method: 'PUT',
        headers: jsonHeaders(accessToken),
        body: JSON.stringify(workshopPayload())
      }),
      fetch(`${baseUrl}/api/workshops/${workshopId}`, {
        method: 'DELETE',
        headers: authHeaders(accessToken)
      }),
      fetch(`${baseUrl}/api/workshops/${workshopId}/stats`, {
        headers: authHeaders(accessToken)
      })
    ]) {
      const response = await request;
      const body = await response.json();
      assert.equal(response.status, 403);
      assert.deepEqual(body, { success: false, error: 'Forbidden' });
    }
  }
});

test('only students can register, and only check-in staff can scan QR codes', async () => {
  for (const accessToken of [organizerAccessToken, staffAccessToken]) {
    const response = await fetch(`${baseUrl}/api/workshops/${workshopId}/register`, {
      method: 'POST',
      headers: {
        ...jsonHeaders(accessToken),
        'idempotency-key': `rbac-${suffix}-${accessToken.slice(-8)}`
      },
      body: JSON.stringify({})
    });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.deepEqual(body, { success: false, error: 'Forbidden' });
  }

  for (const accessToken of [organizerAccessToken, studentAccessToken]) {
    const response = await fetch(`${baseUrl}/api/checkin`, {
      method: 'POST',
      headers: jsonHeaders(accessToken),
      body: JSON.stringify({ qrCode: 'unused' })
    });
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.deepEqual(body, { success: false, error: 'Forbidden' });
  }
});

const authHeaders = (accessToken?: string): Record<string, string> =>
  accessToken ? { authorization: `Bearer ${accessToken}` } : {};
const jsonHeaders = (accessToken?: string): Record<string, string> => ({
  ...authHeaders(accessToken),
  'content-type': 'application/json'
});
const workshopPayload = () => ({
  title: `Workshop ${suffix}`,
  speaker: `Speaker ${suffix}`,
  roomId,
  capacity: 20,
  price: 0,
  startTime: '2026-07-01T09:00:00.000Z'
});

async function registerUser(role: 'ORGANIZER' | 'STUDENT' | 'CHECKIN_STAFF') {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `${role.toLowerCase()}.${suffix}@example.test`,
      password: 'Password123',
      name: `${role} ${suffix}`,
      role
    })
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  return body as { user: { id: string }; accessToken: string };
}

async function createRoom() {
  const result = await query<{ id: string }>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [`Room ${suffix}`, `North ${suffix}`, 30]
  );
  return result.rows[0];
}

async function createWorkshop(targetRoomId: string) {
  const result = await query<{ id: string }>(
    `
      insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
      values ($1, $2, $3, $4, $4, $5, $6)
      returning id
    `,
    [`Existing ${suffix}`, `Speaker ${suffix}`, targetRoomId, 20, 0, new Date('2026-06-01T09:00:00.000Z')]
  );
  return result.rows[0];
}
