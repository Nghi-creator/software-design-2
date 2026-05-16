import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../../../src/app';
import { query, db } from '../../../src/lib/db';
import { redis } from '../../../src/lib/redis';
import { registrationDependencies } from '../../../src/di';

const suffix = `payment_outage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let roomId = '';
let workshopId = '';
let accessToken = '';
let studentId = '';
let originalProcessPayment: typeof registrationDependencies.processPayment;

before(async () => {
  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  originalProcessPayment = registrationDependencies.processPayment;

  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `payment.outage.${suffix}@example.test`,
      password: 'Password123',
      name: `Payment Outage ${suffix}`,
      role: 'STUDENT',
      studentId: suffix
    })
  });
  const registerBody = await registerResponse.json();
  accessToken = registerBody.accessToken;
  studentId = registerBody.user.id;

  const room = await query<{ id: string }>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [`Room ${suffix}`, `Building ${suffix}`, 20]
  );
  roomId = room.rows[0].id;

  const workshop = await query<{ id: string }>(
    `
      insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
      values ($1, $2, $3, 20, 20, 75, now() + interval '1 day')
      returning id
    `,
    [`Workshop ${suffix}`, `Speaker ${suffix}`, roomId]
  );
  workshopId = workshop.rows[0].id;
});

after(async () => {
  registrationDependencies.processPayment = originalProcessPayment;
  await query(
    'delete from payments where registration_id in (select id from registrations where workshop_id = $1)',
    [workshopId]
  );
  await query('delete from registrations where workshop_id = $1', [workshopId]);
  await query('delete from workshops where id = $1', [workshopId]);
  await query('delete from rooms where id = $1', [roomId]);
  await query('delete from users where id = $1', [studentId]);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  redis.disconnect();
  await db?.end();
});

test('paid registration timeout does not break workshop browsing and the same idempotency key is replayed', async () => {
  let paymentCalls = 0;
  registrationDependencies.processPayment = async () => {
    paymentCalls += 1;
    throw new Error('gateway timeout');
  };
  const idempotencyKey = `payment-outage-${suffix}`;

  const firstRegistrationResponse = await fetch(`${baseUrl}/api/workshops/${workshopId}/register`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({ paymentToken: 'tok_timeout' })
  });
  const firstRegistrationBody = await firstRegistrationResponse.json();

  const browseResponse = await fetch(
    `${baseUrl}/api/workshops?q=${encodeURIComponent(`Workshop ${suffix}`)}`
  );
  const browseBody = await browseResponse.json();

  const replayResponse = await fetch(`${baseUrl}/api/workshops/${workshopId}/register`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({ paymentToken: 'tok_timeout_again' })
  });
  const replayBody = await replayResponse.json();

  const workshop = await query<{ seatsRemaining: number }>(
    'select seats_remaining as "seatsRemaining" from workshops where id = $1',
    [workshopId]
  );
  const registration = await query<{ status: string }>(
    'select status from registrations where user_id = $1 and workshop_id = $2',
    [studentId, workshopId]
  );
  const payment = await query<{ status: string }>(
    `
      select p.status
      from payments p
      join registrations r on r.id = p.registration_id
      where r.user_id = $1 and r.workshop_id = $2
    `,
    [studentId, workshopId]
  );

  assert.equal(firstRegistrationResponse.status, 503);
  assert.deepEqual(firstRegistrationBody, { success: false, error: 'gateway timeout' });
  assert.equal(browseResponse.status, 200);
  assert.equal(browseBody.items[0].id, workshopId);
  assert.equal(replayResponse.status, 503);
  assert.deepEqual(replayBody, firstRegistrationBody);
  assert.equal(paymentCalls, 1);
  assert.equal(workshop.rows[0].seatsRemaining, 20);
  assert.equal(registration.rows[0].status, 'CANCELLED');
  assert.equal(payment.rows[0].status, 'FAILED');
});
