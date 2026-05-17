import { CheckinDependencies, checkinDependencies } from '../di';
import { CheckinSource } from '../types/domain';

export const findRegistrationQrById = async (
  registrationId: string,
  dependencies: CheckinDependencies = checkinDependencies
) => {
  const result = await dependencies.query(
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

  return (result.rows[0] as {
    id: string;
    userId: string;
    workshopId: string;
    workshopTitle: string;
    qrCode: string;
    status: string;
  } | undefined) ?? null;
};

export const findRegistrationForCheckin = async (
  qrCode: string,
  dependencies: CheckinDependencies = checkinDependencies
) => {
  const result = await dependencies.query(
    `
      select
        r.id,
        r.status,
        r.checked_in_at as "checkedInAt",
        c.id as "checkinId",
        w.start_time as "workshopStartTime"
      from registrations r
      join workshops w on w.id = r.workshop_id
      left join checkins c on c.registration_id = r.id
      where r.qr_code = $1
    `,
    [qrCode]
  );

  return (result.rows[0] as {
    id: string;
    status: string;
    checkedInAt: Date | null;
    checkinId: string | null;
    workshopStartTime: Date;
  } | undefined) ?? null;
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
}, dependencies: CheckinDependencies = checkinDependencies) => {
  return dependencies.withTransaction(async (client) => {
    const inserted = await client.query(
      `
        insert into checkins (registration_id, staff_id, checkin_time, source)
        values ($1, $2, $3, $4)
        on conflict (registration_id) do nothing
        returning id
      `,
      [registrationId, staffId, checkinTime, source]
    );

    if (inserted.rowCount === 0) {
      return false;
    }

    await client.query(
      'update registrations set checked_in_at = $2 where id = $1',
      [registrationId, checkinTime]
    );

    return true;
  });
};
