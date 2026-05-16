import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { query } from '../../../src/lib/db';
import { syncOfflineCheckins } from '../../../src/services/checkin';
import {
  cleanupFixture,
  createConfirmedRegistration,
  createFixture,
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

  try {
    const first = await syncOfflineCheckins(
      [{ localId: 'scan-1', qrCode, scannedAt: '2026-05-16T08:00:00.000Z' }],
      fixture.staffId
    );
    const second = await syncOfflineCheckins(
      [{ localId: 'scan-2', qrCode, scannedAt: '2026-05-16T08:01:00.000Z' }],
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
