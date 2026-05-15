import assert from 'node:assert/strict';
import test from 'node:test';
import { syncOfflineCheckins } from '../src/services/checkin';

test('offline sync is item-level and idempotent for duplicate QR scans', async () => {
  const registrations = new Map([
    [
      'qr-confirmed',
      {
        id: 'registration-1',
        status: 'CONFIRMED',
        checkedInAt: null as Date | null,
        checkinId: null as string | null
      }
    ],
    [
      'qr-cancelled',
      {
        id: 'registration-2',
        status: 'CANCELLED',
        checkedInAt: null as Date | null,
        checkinId: null as string | null
      }
    ]
  ]);
  const insertedCheckins: Array<{
    registrationId: string;
    staffId: string;
    checkinTime: Date;
    source: string;
  }> = [];

  const dependencies = {
    query: async <T = any>(_text: string, params: unknown[] = []) => {
      const registration = registrations.get(params[0] as string);
      return {
        rows: registration
          ? ([
              {
                id: registration.id,
                status: registration.status,
                checkedInAt: registration.checkedInAt,
                checkinId: registration.checkinId
              }
            ] as T[])
          : []
      };
    },
    withTransaction: async <T>(callback: (client: { query: any }) => Promise<T>) => {
      const clientQuery = async <R = any>(text: string, params: unknown[] = []) => {
        const sql = text.replace(/\s+/g, ' ').trim();

        if (sql.startsWith('update registrations set checked_in_at')) {
          const [registrationId, checkinTime] = params as [string, Date];
          const registration = [...registrations.values()].find((item) => item.id === registrationId);
          if (!registration || registration.checkedInAt) {
            return { rows: [] as R[], rowCount: 0 };
          }

          registration.checkedInAt = checkinTime;
          return { rows: [{ id: registrationId }] as R[], rowCount: 1 };
        }

        if (sql.startsWith('insert into checkins')) {
          const [registrationId, staffId, checkinTime, source] = params as [string, string, Date, string];
          const registration = [...registrations.values()].find((item) => item.id === registrationId);
          assert.ok(registration);
          registration.checkinId = `checkin-${insertedCheckins.length + 1}`;
          insertedCheckins.push({ registrationId, staffId, checkinTime, source });
          return { rows: [] as R[] };
        }

        throw new Error(`Unexpected query: ${sql}`);
      };

      return callback({ query: clientQuery });
    }
  };

  const results = await syncOfflineCheckins(
    [
      { localId: 'scan-1', qrCode: 'qr-confirmed', scannedAt: '2026-05-15T08:00:00.000Z' },
      { localId: 'scan-2', qrCode: 'qr-confirmed', scannedAt: '2026-05-15T08:01:00.000Z' },
      { localId: 'scan-3', qrCode: 'qr-missing' },
      { localId: 'scan-4', qrCode: 'qr-cancelled' },
      { localId: 'scan-5', qrCode: '' }
    ],
    'staff-1',
    dependencies
  );

  assert.deepEqual(results, [
    {
      localId: 'scan-1',
      qrCode: 'qr-confirmed',
      status: 'checked_in',
      registrationId: 'registration-1'
    },
    {
      localId: 'scan-2',
      qrCode: 'qr-confirmed',
      status: 'already_checked_in',
      registrationId: 'registration-1'
    },
    { localId: 'scan-3', qrCode: 'qr-missing', status: 'invalid', registrationId: undefined },
    { localId: 'scan-4', qrCode: 'qr-cancelled', status: 'invalid', registrationId: 'registration-2' },
    { localId: 'scan-5', qrCode: '', status: 'invalid' }
  ]);
  assert.equal(insertedCheckins.length, 1);
  assert.equal(insertedCheckins[0].source, 'OFFLINE_SYNC');
});

test('offline sync reports already checked in when concurrent update wins the race', async () => {
  const dependencies = {
    query: async <T = any>() => ({
      rows: [
        {
          id: 'registration-1',
          status: 'CONFIRMED',
          checkedInAt: null,
          checkinId: null
        }
      ] as T[]
    }),
    withTransaction: async <T>(callback: (client: { query: any }) => Promise<T>) => {
      const client = {
        query: async <R = any>(text: string) => {
          const sql = text.replace(/\s+/g, ' ').trim();

          if (sql.startsWith('update registrations set checked_in_at')) {
            return { rows: [] as R[], rowCount: 0 };
          }

          throw new Error(`Unexpected query: ${sql}`);
        }
      };

      return callback(client);
    }
  };

  const results = await syncOfflineCheckins(
    [{ localId: 'scan-1', qrCode: 'qr-confirmed' }],
    'staff-1',
    dependencies
  );

  assert.deepEqual(results, [
    {
      localId: 'scan-1',
      qrCode: 'qr-confirmed',
      status: 'already_checked_in',
      registrationId: 'registration-1'
    }
  ]);
});
