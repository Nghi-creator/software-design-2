import assert from 'node:assert/strict';
import test from 'node:test';
import { generateRegistrationQr } from '../../../src/services/checkin';
import { Roles } from '../../../src/types/domain';

test('registration QR retrieval uses injected repository access and enforces authorization', async () => {
  const queries: Array<{ text: string; params?: unknown[] }> = [];
  const dependencies = {
    query: async (text: string, params?: unknown[]) => {
      queries.push({ text, params });
      return {
        rows: [
          {
            id: 'registration-1',
            userId: 'student-1',
            workshopId: 'workshop-1',
            workshopTitle: 'Intro Workshop',
            qrCode: 'qr-confirmed',
            status: 'CONFIRMED'
          }
        ]
      };
    },
    withTransaction: async <T>() => {
      throw new Error('QR retrieval should not open a transaction');
    }
  };

  const qr = await generateRegistrationQr(
    {
      registrationId: 'registration-1',
      requesterId: 'staff-1',
      requesterRole: Roles.CHECKIN_STAFF
    },
    dependencies
  );

  assert.deepEqual(qr, {
    registrationId: 'registration-1',
    workshopId: 'workshop-1',
    workshopTitle: 'Intro Workshop',
    qrCode: 'qr-confirmed'
  });
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, ['registration-1']);

  await assert.rejects(
    generateRegistrationQr(
      {
        registrationId: 'registration-1',
        requesterId: 'other-student',
        requesterRole: Roles.STUDENT
      },
      dependencies
    ),
    /Forbidden/
  );
});

test('registration QR retrieval allows the owning student and organizers', async () => {
  const dependencies = createQrDependencies('CONFIRMED');

  const ownerQr = await generateRegistrationQr(
    {
      registrationId: 'registration-1',
      requesterId: 'student-1',
      requesterRole: Roles.STUDENT
    },
    dependencies
  );
  const organizerQr = await generateRegistrationQr(
    {
      registrationId: 'registration-1',
      requesterId: 'organizer-1',
      requesterRole: Roles.ORGANIZER
    },
    dependencies
  );

  assert.equal(ownerQr.qrCode, 'qr-confirmed');
  assert.equal(organizerQr.qrCode, 'qr-confirmed');
});

test('registration QR retrieval distinguishes missing and unconfirmed registrations', async () => {
  await assert.rejects(
    generateRegistrationQr(
      {
        registrationId: 'missing',
        requesterId: 'student-1',
        requesterRole: Roles.STUDENT
      },
      {
        query: async () => ({ rows: [] }),
        withTransaction: async <T>() => {
          throw new Error('not used');
        }
      }
    ),
    /Registration not found/
  );

  await assert.rejects(
    generateRegistrationQr(
      {
        registrationId: 'registration-1',
        requesterId: 'student-1',
        requesterRole: Roles.STUDENT
      },
      createQrDependencies('PENDING')
    ),
    /Registration is not confirmed/
  );
});

const createQrDependencies = (status: string) => ({
  query: async () => ({
    rows: [
      {
        id: 'registration-1',
        userId: 'student-1',
        workshopId: 'workshop-1',
        workshopTitle: 'Intro Workshop',
        qrCode: 'qr-confirmed',
        status
      }
    ]
  }),
  withTransaction: async <T>() => {
    throw new Error('QR retrieval should not open a transaction');
  }
});
