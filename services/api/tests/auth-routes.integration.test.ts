import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../src/app';
import { db, query } from '../src/lib/db';

const suffix = `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createdUserIds: string[] = [];
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let studentAccessToken = '';

before(async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const registration = await registerUser({
    email: `student.${suffix}@example.test`,
    password: 'Password123',
    name: `Student ${suffix}`,
    role: 'STUDENT'
  });

  createdUserIds.push(registration.user.id);
  studentAccessToken = registration.accessToken;
});

after(async () => {
  if (createdUserIds.length > 0) {
    await query('delete from users where id = any($1::uuid[])', [createdUserIds]);
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await db?.end();
});

test('GET /api/auth/me requires a bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    success: false,
    error: 'Authentication required'
  });
});

test('GET /api/auth/me rejects invalid bearer tokens before reaching the controller', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      authorization: 'Bearer definitely-not-a-jwt'
    }
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    success: false,
    error: 'Invalid or expired token'
  });
});

test('GET /api/auth/me ignores legacy identity headers', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      'x-user-id': createdUserIds[0],
      'x-user-role': 'STUDENT'
    }
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, {
    success: false,
    error: 'Authentication required'
  });
});

test('GET /api/auth/me returns the current user for a valid bearer token', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: {
      authorization: `Bearer ${studentAccessToken}`
    }
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.user.id, createdUserIds[0]);
  assert.equal(body.user.role, 'STUDENT');
  assert.equal(body.user.email, `student.${suffix}@example.test`);
});

test('protected routes reject unauthenticated and wrong-role requests', async () => {
  const unauthenticatedResponse = await fetch(`${baseUrl}/api/checkin`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ qrCode: 'unused' })
  });
  const unauthenticatedBody = await unauthenticatedResponse.json();

  assert.equal(unauthenticatedResponse.status, 401);
  assert.deepEqual(unauthenticatedBody, {
    success: false,
    error: 'Authentication required'
  });

  const wrongRoleResponse = await fetch(`${baseUrl}/api/rooms`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${studentAccessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      name: `Room ${suffix}`,
      location: `North ${suffix}`,
      capacity: 20
    })
  });
  const wrongRoleBody = await wrongRoleResponse.json();

  assert.equal(wrongRoleResponse.status, 403);
  assert.deepEqual(wrongRoleBody, {
    success: false,
    error: 'Forbidden'
  });
});

async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  role: string;
}) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(input)
  });
  const body = await response.json();

  assert.equal(response.status, 201);

  return body as {
    user: { id: string };
    accessToken: string;
  };
}
