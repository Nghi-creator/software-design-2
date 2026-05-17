import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { query } from '../../../src/lib/db';
import { syncOfflineCheckins } from '../../../src/services/checkin';
import {
  cleanupFixture,
  createConfirmedRegistration,
  createFixture,
  createStudent,
  registerRealServiceCleanup,
  skipReason
} from './support';

registerRealServiceCleanup();

test('real Postgres offline check-in sync is idempotent for repeated QR scans', {
  skip: skipReason
}, async () => {
  const fixture = await createFixture();
  const qrCode = `qr-sync-${fixture.suffix}`;
  const registration = await createConfirmedRegistration(fixture, qrCode);
  const workshopDayScan = fixture.workshopStartTime.toISOString();

  try {
    const first = await syncOfflineCheckins(
      [{ localId: 'scan-1', qrCode, scannedAt: workshopDayScan }],
      fixture.staffId
    );
    const second = await syncOfflineCheckins(
      [{ localId: 'scan-2', qrCode, scannedAt: workshopDayScan }],
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

test('real Postgres QR retrieval exposes confirmed tickets and rejects pending tickets', {
  skip: skipReason
}, async () => {
  const fixture = await createFixture();
  const confirmedQrCode = `qr-confirmed-${fixture.suffix}`;
  const confirmedRegistration = await createConfirmedRegistration(fixture, confirmedQrCode);
  const pendingStudentId = await createStudent(fixture.suffix, 'pending');
  const pendingRegistration = await query<{ id: string }>(
    `
      insert into registrations (user_id, workshop_id, qr_code, status)
      values ($1, $2, $3, 'PENDING')
      returning id
    `,
    [pendingStudentId, fixture.workshopId, `qr-pending-${fixture.suffix}`]
  );

  try {
    const { generateRegistrationQr } = await import('../../../src/services/checkin');
    const qr = await generateRegistrationQr({
      registrationId: confirmedRegistration.id,
      requesterId: fixture.studentId,
      requesterRole: 'STUDENT'
    });

    assert.deepEqual(qr, {
      registrationId: confirmedRegistration.id,
      workshopId: fixture.workshopId,
      workshopTitle: `Workshop ${fixture.suffix}`,
      qrCode: confirmedQrCode
    });

    await assert.rejects(
      generateRegistrationQr({
        registrationId: pendingRegistration.rows[0].id,
        requesterId: pendingStudentId,
        requesterRole: 'STUDENT'
      }),
      /Registration is not confirmed/
    );
  } finally {
    await cleanupFixture(fixture, [pendingStudentId]);
  }
});
