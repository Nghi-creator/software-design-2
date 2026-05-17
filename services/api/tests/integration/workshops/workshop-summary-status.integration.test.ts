import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../../../src/app';
import { db, query } from '../../../src/lib/db';
import { redis } from '../../../src/lib/redis';

const suffix = `summary_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds: string[] = [];
const createdRoomIds: string[] = [];
const createdWorkshopIds: string[] = [];
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let organizerAccessToken = '';
let studentAccessToken = '';
let readyWorkshopId = '';
let readyWithoutPdfWorkshopId = '';
let notUploadedWorkshopId = '';
let processingWorkshopId = '';

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

  const readyWorkshop = await createWorkshop(room.id, {
    pdfUrl: `https://example.test/${suffix}.pdf`,
    aiSummary: 'Concise workshop summary.'
  });
  const readyWithoutPdfWorkshop = await createWorkshop(room.id, {
    pdfUrl: null,
    aiSummary: 'Summary generated from an uploaded PDF.'
  });
  const notUploadedWorkshop = await createWorkshop(room.id, {
    pdfUrl: null,
    aiSummary: null
  });
  const processingWorkshop = await createWorkshop(room.id, {
    pdfUrl: `https://example.test/${suffix}-processing.pdf`,
    aiSummary: null
  });
  createdWorkshopIds.push(readyWorkshop.id, readyWithoutPdfWorkshop.id, notUploadedWorkshop.id, processingWorkshop.id);
  readyWorkshopId = readyWorkshop.id;
  readyWithoutPdfWorkshopId = readyWithoutPdfWorkshop.id;
  notUploadedWorkshopId = notUploadedWorkshop.id;
  processingWorkshopId = processingWorkshop.id;
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

test('GET /api/workshops/:id/summary-status returns ready when a summary exists', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${readyWorkshopId}/summary-status`, {
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    workshopId: readyWorkshopId,
    status: 'ready',
    pdfUrl: `https://example.test/${suffix}.pdf`
  });
});

test('GET /api/workshops/:id/summary-status returns ready when an uploaded PDF generated a summary without a public URL', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${readyWithoutPdfWorkshopId}/summary-status`, {
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    workshopId: readyWithoutPdfWorkshopId,
    status: 'ready',
    pdfUrl: null
  });
});

test('GET /api/workshops/:id/summary-status returns not_uploaded without a PDF', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${notUploadedWorkshopId}/summary-status`, {
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    workshopId: notUploadedWorkshopId,
    status: 'not_uploaded',
    pdfUrl: null
  });
});

test('GET /api/workshops/:id/summary-status returns processing when PDF exists without summary', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${processingWorkshopId}/summary-status`, {
    headers: {
      authorization: `Bearer ${organizerAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    workshopId: processingWorkshopId,
    status: 'processing',
    pdfUrl: `https://example.test/${suffix}-processing.pdf`
  });
});

test('GET /api/workshops/:id/summary-status rejects non-organizers', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/${readyWorkshopId}/summary-status`, {
    headers: {
      authorization: `Bearer ${studentAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.deepEqual(body, {
    success: false,
    error: 'Forbidden'
  });
});

test('GET /api/workshops/:id/summary-status returns 404 for missing workshops', async () => {
  const response = await fetch(`${baseUrl}/api/workshops/00000000-0000-0000-0000-000000000000/summary-status`, {
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
    [`Room ${suffix}`, `South ${suffix}`, 40]
  );

  return result.rows[0];
}

async function createWorkshop(
  roomId: string,
  { pdfUrl, aiSummary }: { pdfUrl: string | null; aiSummary: string | null }
) {
  const result = await query<{ id: string }>(
    `
      insert into workshops (
        title, speaker, room_id, capacity, seats_remaining, price, start_time, pdf_url, ai_summary
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning id
    `,
    [
      `Summary ${suffix}`,
      `Speaker ${suffix}`,
      roomId,
      20,
      20,
      0,
      new Date('2026-06-15T09:00:00.000Z'),
      pdfUrl,
      aiSummary
    ]
  );

  return result.rows[0];
}
