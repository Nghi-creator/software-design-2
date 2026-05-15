import { query } from '../lib/db';

export type WorkshopStatsRow = {
  workshopId: string;
  capacity: number;
  seatsRemaining: number;
  pendingRegistrations: string;
  confirmedRegistrations: string;
  cancelledRegistrations: string;
  checkedInCount: string;
  successfulPaymentCount: string;
};

export const findWorkshopStats = async (workshopId: string) => {
  const result = await query<WorkshopStatsRow>(
    `
      select
        w.id as "workshopId",
        w.capacity,
        w.seats_remaining as "seatsRemaining",
        count(r.id) filter (where r.status = 'PENDING')::text as "pendingRegistrations",
        count(r.id) filter (where r.status = 'CONFIRMED')::text as "confirmedRegistrations",
        count(r.id) filter (where r.status = 'CANCELLED')::text as "cancelledRegistrations",
        count(r.id) filter (where r.checked_in_at is not null)::text as "checkedInCount",
        count(p.id) filter (where p.status = 'SUCCESS')::text as "successfulPaymentCount"
      from workshops w
      left join registrations r on r.workshop_id = w.id
      left join payments p on p.registration_id = r.id
      where w.id = $1
      group by w.id
    `,
    [workshopId]
  );

  return result.rows[0] ?? null;
};
