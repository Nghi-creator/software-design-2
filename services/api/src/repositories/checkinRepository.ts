import { query, withTransaction } from '../lib/db';
import { CheckinSource } from '../types/domain';

export const findRegistrationQrById = async (registrationId: string) => {
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

  return result.rows[0] ?? null;
};

export const findRegistrationForCheckin = async (qrCode: string) => {
  const result = await query<{
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

  return result.rows[0] ?? null;
};

export const createCheckinIfPending = async ({
  registrationId,
  staffId,
  checkinTime,
  source
}: {
  registrationId: string;
  staffId: string;
  checkinTime: Date;
  source: CheckinSource;
}) => {
  return withTransaction(async (client) => {
    const updated = await client.query(
      'update registrations set checked_in_at = $2 where id = $1 and checked_in_at is null returning id',
      [registrationId, checkinTime]
    );

    if (updated.rowCount === 0) {
      return false;
    }

    await client.query(
      'insert into checkins (registration_id, staff_id, checkin_time, source) values ($1, $2, $3, $4)',
      [registrationId, staffId, checkinTime, source]
    );

    return true;
  });
};
