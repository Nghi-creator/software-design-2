import { query, withTransaction } from '../lib/db';
import { CheckinSource, Role, Roles } from '../types/domain';

export type SyncItem = {
  localId?: string;
  qrCode: string;
  scannedAt?: string;
};

export const checkInOnline = async (qrCode: string, staffId: string) => {
  return checkInOne({ qrCode, staffId, source: 'ONLINE' });
};

export const generateRegistrationQr = async ({
  registrationId,
  requesterId,
  requesterRole
}: {
  registrationId: string;
  requesterId: string;
  requesterRole: Role;
}) => {
  const result = await query<{
    id: string;
    userId: string;
    workshopId: string;
    workshopTitle: string;
    qrCode: string;
    status: string;
  }>(
    `
      select
        r.id,
        r.user_id as "userId",
        r.workshop_id as "workshopId",
        w.title as "workshopTitle",
        r.qr_code as "qrCode",
        r.status
      from registrations r
      join workshops w on w.id = r.workshop_id
      where r.id = $1
    `,
    [registrationId]
  );
  const registration = result.rows[0];

  if (!registration) {
    throw Object.assign(new Error('Registration not found'), { statusCode: 404 });
  }

  const canRead =
    requesterRole === Roles.CHECKIN_STAFF ||
    requesterRole === Roles.ORGANIZER ||
    registration.userId === requesterId;

  if (!canRead) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }

  if (registration.status !== 'CONFIRMED') {
    throw Object.assign(new Error('Registration is not confirmed'), { statusCode: 409 });
  }

  return {
    registrationId: registration.id,
    workshopId: registration.workshopId,
    workshopTitle: registration.workshopTitle,
    qrCode: registration.qrCode
  };
};

export const syncOfflineCheckins = async (items: SyncItem[], staffId: string) => {
  const results = [];

  for (const item of items) {
    if (!item.qrCode) {
      results.push({ localId: item.localId, qrCode: item.qrCode, status: 'invalid' });
      continue;
    }

    try {
      const result = await checkInOne({
        qrCode: item.qrCode,
        staffId,
        source: 'OFFLINE_SYNC',
        scannedAt: item.scannedAt
      });

      results.push({
        localId: item.localId,
        qrCode: item.qrCode,
        status: result.status,
        registrationId: result.registrationId
      });
    } catch {
      results.push({ localId: item.localId, qrCode: item.qrCode, status: 'failed' });
    }
  }

  return results;
};

const checkInOne = async ({
  qrCode,
  staffId,
  source,
  scannedAt
}: {
  qrCode: string;
  staffId: string;
  source: CheckinSource;
  scannedAt?: string;
}) => {
  const registrationResult = await query<{
    id: string;
    status: string;
    checkedInAt: Date | null;
    checkinId: string | null;
  }>(
    `
      select
        r.id,
        r.status,
        r.checked_in_at as "checkedInAt",
        c.id as "checkinId"
      from registrations r
      left join checkins c on c.registration_id = r.id
      where r.qr_code = $1
    `,
    [qrCode]
  );
  const registration = registrationResult.rows[0];

  if (!registration || registration.status !== 'CONFIRMED') {
    return { status: 'invalid', registrationId: registration?.id };
  }

  if (registration.checkedInAt || registration.checkinId) {
    return { status: 'already_checked_in', registrationId: registration.id };
  }

  const checkinTime = scannedAt ? new Date(scannedAt) : new Date();

  await withTransaction(async (client) => {
    const updated = await client.query(
      'update registrations set checked_in_at = $2 where id = $1 and checked_in_at is null returning id',
      [registration.id, checkinTime]
    );

    if (updated.rowCount === 0) {
      return;
    }

    await client.query(
      'insert into checkins (registration_id, staff_id, checkin_time, source) values ($1, $2, $3, $4)',
      [registration.id, staffId, checkinTime, source]
    );
  });

  return { status: 'checked_in', registrationId: registration.id };
};
