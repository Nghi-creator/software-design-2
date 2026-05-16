import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { query } from '../../../src/lib/db';
import {
  cleanupFixture,
  createFixture,
  registerHttpStudent,
  registerRealServiceCleanup,
  skipReason,
  startHttpServer
} from './support';

registerRealServiceCleanup();

test('real HTTP admin lifecycle covers create, room/time update, stats, and cancellation', {
  skip: skipReason
}, async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';
  const fixture = await createFixture({ capacity: 12 });
  const alternateRoom = await query<{ id: string }>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [`Alternate ${fixture.suffix}`, `Annex ${fixture.suffix}`, 40]
  );
  const { server, baseUrl } = startHttpServer();
  const organizer = await registerHttpUser(baseUrl, fixture.suffix, 'ORGANIZER');
  const student = await registerHttpStudent(baseUrl, fixture.suffix, 7);
  const staff = await registerHttpUser(baseUrl, fixture.suffix, 'CHECKIN_STAFF');
  let createdWorkshopId = '';

  try {
    const createResponse = await fetch(`${baseUrl}/api/workshops`, {
      method: 'POST',
      headers: jsonHeaders(organizer.accessToken),
      body: JSON.stringify({
        title: `Admin Created ${fixture.suffix}`,
        speaker: `Organizer Speaker ${fixture.suffix}`,
        roomId: fixture.roomId,
        capacity: 25,
        price: 0,
        startTime: '2026-07-01T09:00:00.000Z'
      })
    });
    const createdWorkshop = await createResponse.json();
    assert.equal(createResponse.status, 200);
    createdWorkshopId = createdWorkshop.id;

    const updateResponse = await fetch(`${baseUrl}/api/workshops/${createdWorkshopId}`, {
      method: 'PUT',
      headers: jsonHeaders(organizer.accessToken),
      body: JSON.stringify({
        title: `Admin Updated ${fixture.suffix}`,
        speaker: `Updated Speaker ${fixture.suffix}`,
        roomId: alternateRoom.rows[0].id,
        capacity: 30,
        price: 15,
        startTime: '2026-07-02T10:30:00.000Z'
      })
    });
    const updatedWorkshop = await updateResponse.json();
    assert.equal(updateResponse.status, 200);
    assert.equal(updatedWorkshop.roomId, alternateRoom.rows[0].id);
    assert.equal(new Date(updatedWorkshop.startTime).toISOString(), '2026-07-02T10:30:00.000Z');

    const statsResponse = await fetch(`${baseUrl}/api/workshops/${createdWorkshopId}/stats`, {
      headers: authHeaders(organizer.accessToken)
    });
    const stats = await statsResponse.json();
    assert.equal(statsResponse.status, 200);
    assert.deepEqual(stats, {
      workshopId: createdWorkshopId,
      capacity: 30,
      seatsRemaining: 30,
      registrations: { pending: 0, confirmed: 0, cancelled: 0 },
      checkedInCount: 0,
      successfulPaymentCount: 0
    });

    for (const accessToken of [student.accessToken, staff.accessToken]) {
      const forbiddenResponse = await fetch(`${baseUrl}/api/workshops/${createdWorkshopId}/stats`, {
        headers: authHeaders(accessToken)
      });
      assert.equal(forbiddenResponse.status, 403);
    }

    const deleteResponse = await fetch(`${baseUrl}/api/workshops/${createdWorkshopId}`, {
      method: 'DELETE',
      headers: authHeaders(organizer.accessToken)
    });
    assert.equal(deleteResponse.status, 204);
    createdWorkshopId = '';
  } finally {
    if (createdWorkshopId) {
      await query('delete from workshops where id = $1', [createdWorkshopId]);
    }
    await query('delete from rooms where id = $1', [alternateRoom.rows[0].id]);
    await cleanupFixture(fixture, [organizer.user.id, student.user.id, staff.user.id]);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

const authHeaders = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
const jsonHeaders = (accessToken: string) => ({
  ...authHeaders(accessToken),
  'content-type': 'application/json'
});

const registerHttpUser = async (
  baseUrl: string,
  suffix: string,
  role: 'ORGANIZER' | 'CHECKIN_STAFF'
) => {
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
};
