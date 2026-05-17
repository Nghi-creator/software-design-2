import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../../../src/app';
import { db, query } from '../../../src/lib/db';
import { redis } from '../../../src/lib/redis';

const suffix = `crud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds: string[] = [];
const createdRegistrationIds: string[] = [];
const createdRoomIds: string[] = [];
const createdWorkshopIds: string[] = [];
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let organizerAccessToken = '';
let studentAccessToken = '';
let roomId = '';
let workshopId = '';
let occupiedWorkshopId = '';
let disposableWorkshopId = '';

before(async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const organizer = await registerUser('ORGANIZER');
  const student = await registerUser('STUDENT');
  createdUserIds.push(organizer.user.id, student.user.id);
  organizerAccessToken = organizer.accessToken;
  studentAccessToken = student.accessToken;

  const room = await createRoom();
  createdRoomIds.push(room.id);
  roomId = room.id;

  const editableWorkshop = await createWorkshop('Editable', 30, 27);
  const occupiedWorkshop = await createWorkshop('Occupied', 10, 8);
  const disposableWorkshop = await createWorkshop('Disposable', 20, 20);
  createdWorkshopIds.push(editableWorkshop.id, occupiedWorkshop.id, disposableWorkshop.id);
  workshopId = editableWorkshop.id;
  occupiedWorkshopId = occupiedWorkshop.id;
  disposableWorkshopId = disposableWorkshop.id;

  const registration = await createRegistration(student.user.id, occupiedWorkshopId);
  createdRegistrationIds.push(registration.id);
});

after(async () => {
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
  redis.disconnect();
  await db?.end();
});

test('PUT /api/workshops/:id updates organizer-owned workshop data and preserves reserved seats', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${workshopId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${organizerAccessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: `Updated ${suffix}`,
      speaker: `Updated Speaker ${suffix}`,
      roomId,
      capacity: 35,
      price: 75,
      startTime: '2026-07-01T09:00:00.000Z',
      pdfUrl: `https://example.test/${suffix}.pdf`
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.title, `Updated ${suffix}`);
  assert.equal(body.capacity, 35);
  assert.equal(body.seatsRemaining, 32);
  assert.equal(body.price, 75);
  assert.equal(body.startTime, '2026-07-01T09:00:00.000Z');
});

test('PUT /api/workshops/:id rejects non-organizers and impossible capacity reductions', async () => {
  const forbiddenResponse = await fetch(`${baseUrl}/api/workshops/${workshopId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${studentAccessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: `Blocked ${suffix}`,
      speaker: `Blocked Speaker ${suffix}`,
      roomId,
      capacity: 40,
      startTime: '2026-07-01T09:00:00.000Z'
    })
  });

  assert.equal(forbiddenResponse.status, 403);

  const conflictResponse = await fetch(`${baseUrl}/api/workshops/${occupiedWorkshopId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${organizerAccessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: `Too Small ${suffix}`,
      speaker: `Speaker ${suffix}`,
      roomId,
      capacity: 1,
      startTime: '2026-07-01T09:00:00.000Z'
    })
  });
  const conflictBody = await conflictResponse.json();

  assert.equal(conflictResponse.status, 409);
  assert.equal(conflictBody.error, 'capacity cannot be less than reserved seat count');
});

test('PUT /api/workshops/:id preserves existing PDF URL when omitted', async () => {
  const pdfWorkshop = await createWorkshop('Pdf Preserve', 12, 12, `https://example.test/${suffix}.pdf`);
  createdWorkshopIds.push(pdfWorkshop.id);

  const response = await fetch(`${baseUrl}/api/workshops/${pdfWorkshop.id}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${organizerAccessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: `Pdf Updated ${suffix}`,
      speaker: `Speaker ${suffix}`,
      roomId,
      capacity: 12,
      startTime: '2026-07-01T09:00:00.000Z'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.pdfUrl, `https://example.test/${suffix}.pdf`);
});

test('POST /api/workshops rejects invalid create input before DB insert', async () => {
  const response = await fetch(`${baseUrl}/api/workshops`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${organizerAccessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      title: `Invalid ${suffix}`,
      speaker: `Speaker ${suffix}`,
      roomId,
      capacity: -1,
      startTime: 'not-a-date'
    })
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, 'capacity must be greater than 0');
});

test('DELETE /api/workshops/:id removes empty workshops and protects linked registrations', async () => {
  const deleteResponse = await fetch(`${baseUrl}/api/workshops/${disposableWorkshopId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });

  assert.equal(deleteResponse.status, 204);

  const conflictResponse = await fetch(`${baseUrl}/api/workshops/${occupiedWorkshopId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const conflictBody = await conflictResponse.json();

  assert.equal(conflictResponse.status, 409);
  assert.equal(conflictBody.error, 'Workshop has existing registrations');
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
    [`Room ${suffix}`, `North ${suffix}`, 50]
  );

  return result.rows[0];
}

async function createWorkshop(
  titlePrefix: string,
  capacity: number,
  seatsRemaining: number,
  pdfUrl: string | null = null
) {
  const result = await query<{ id: string }>(
    `
      insert into workshops (
        title, speaker, room_id, capacity, seats_remaining, price, start_time, pdf_url
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id
    `,
    [
      `${titlePrefix} ${suffix}`,
      `Speaker ${suffix}`,
      roomId,
      capacity,
      seatsRemaining,
      25,
      new Date('2026-06-01T09:00:00.000Z'),
      pdfUrl
    ]
  );

  return result.rows[0];
}

async function createRegistration(userId: string, targetWorkshopId: string) {
  const result = await query<{ id: string }>(
    `
      insert into registrations (user_id, workshop_id, qr_code, status)
      values ($1, $2, $3, $4)
      returning id
    `,
    [userId, targetWorkshopId, `qr_${suffix}`, 'CONFIRMED']
  );

  return result.rows[0];
}
