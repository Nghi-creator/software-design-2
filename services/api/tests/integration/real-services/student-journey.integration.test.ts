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

test('real HTTP student journey covers weekly browse, free/paid registration, QR retrieval, and staff check-in', {
  skip: skipReason
}, async () => {
  process.env.AUTH_ALLOW_ROLE_REGISTRATION = 'true';
  const fixture = await createFixture({ capacity: 5 });
  const { server, baseUrl } = startHttpServer();
  const student = await registerHttpStudent(baseUrl, fixture.suffix, 1);
  const staff = await registerHttpUser(baseUrl, fixture.suffix, 'CHECKIN_STAFF');
  const paidWorkshop = await query<{ id: string }>(
    `
      insert into workshops (title, speaker, room_id, capacity, seats_remaining, price, start_time)
      values ($1, $2, $3, $4, $4, $5, now() + interval '2 days')
      returning id
    `,
    [`Paid Workshop ${fixture.suffix}`, `Paid Speaker ${fixture.suffix}`, fixture.roomId, 5, 25]
  );
  const originalRandom = Math.random;
  Math.random = () => 0.9;

  try {
    const browseResponse = await fetch(
      `${baseUrl}/api/workshops?startsFrom=2000-01-01T00:00:00.000Z&startsTo=2100-01-01T00:00:00.000Z&q=${fixture.suffix}&sortBy=startTime&sortOrder=asc&pageSize=10`
    );
    const browseBody = await browseResponse.json();
    assert.equal(browseResponse.status, 200);
    assert.deepEqual(
      browseBody.items.map((item: { title: string; speaker: string; room: { layoutUrl: string | null } }) => ({
        title: item.title,
        speaker: item.speaker,
        layoutUrl: item.room.layoutUrl
      })),
      [
        {
          title: `Workshop ${fixture.suffix}`,
          speaker: `Speaker ${fixture.suffix}`,
          layoutUrl: `https://example.test/maps/${fixture.suffix}`
        },
        {
          title: `Paid Workshop ${fixture.suffix}`,
          speaker: `Paid Speaker ${fixture.suffix}`,
          layoutUrl: `https://example.test/maps/${fixture.suffix}`
        }
      ]
    );

    const freeRegistrationResponse = await registerHttp(baseUrl, fixture.workshopId, student.accessToken, {
      key: `journey-free-${fixture.suffix}`,
      body: {}
    });
    const freeRegistrationBody = await freeRegistrationResponse.json();
    assert.equal(freeRegistrationResponse.status, 200);
    assert.equal(freeRegistrationBody.registration.status, 'CONFIRMED');
    assert.equal(freeRegistrationBody.registration.payment.transactionId, 'free');

    const paidRegistrationResponse = await registerHttp(baseUrl, paidWorkshop.rows[0].id, student.accessToken, {
      key: `journey-paid-${fixture.suffix}`,
      body: { paymentToken: `tok_${fixture.suffix}` }
    });
    const paidRegistrationBody = await paidRegistrationResponse.json();
    assert.equal(paidRegistrationResponse.status, 200);
    assert.equal(paidRegistrationBody.registration.status, 'CONFIRMED');
    assert.equal(paidRegistrationBody.registration.payment.status, 'SUCCESS');

    const qrResponse = await fetch(
      `${baseUrl}/api/checkin/qr/${freeRegistrationBody.registration.id}`,
      {
        headers: {
          authorization: `Bearer ${student.accessToken}`
        }
      }
    );
    const qrBody = await qrResponse.json();
    assert.equal(qrResponse.status, 200);
    assert.equal(qrBody.qr.workshopId, fixture.workshopId);
    assert.equal(qrBody.qr.workshopTitle, `Workshop ${fixture.suffix}`);

    const checkinResponse = await fetch(`${baseUrl}/api/checkin`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${staff.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ qrCode: qrBody.qr.qrCode })
    });
    const checkinBody = await checkinResponse.json();
    assert.equal(checkinResponse.status, 200);
    assert.deepEqual(checkinBody.result, {
      status: 'checked_in',
      registrationId: freeRegistrationBody.registration.id
    });
  } finally {
    Math.random = originalRandom;
    await query(
      `
        delete from notifications
        where registration_id in (select id from registrations where workshop_id = $1)
      `,
      [paidWorkshop.rows[0].id]
    );
    await query(
      `
        delete from checkins
        where registration_id in (select id from registrations where workshop_id = $1)
      `,
      [paidWorkshop.rows[0].id]
    );
    await query(
      `
        delete from payments
        where registration_id in (select id from registrations where workshop_id = $1)
      `,
      [paidWorkshop.rows[0].id]
    );
    await query('delete from registrations where workshop_id = $1', [paidWorkshop.rows[0].id]);
    await query('delete from workshops where id = $1', [paidWorkshop.rows[0].id]);
    await cleanupFixture(fixture, [student.user.id, staff.user.id]);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

const registerHttp = (
  baseUrl: string,
  workshopId: string,
  accessToken: string,
  {
    key,
    body
  }: {
    key: string;
    body: Record<string, unknown>;
  }
) => {
  return fetch(`${baseUrl}/api/workshops/${workshopId}/register`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': key
    },
    body: JSON.stringify(body)
  });
};

const registerHttpUser = async (baseUrl: string, suffix: string, role: 'CHECKIN_STAFF') => {
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
};
