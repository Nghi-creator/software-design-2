import { withTransaction } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export const reserveSeat = async ({
  workshopId,
  userId,
  idempotencyKey
}: {
  workshopId: string;
  userId: string;
  idempotencyKey: string;
}) => {
  return withTransaction(async (client) => {
    const lockedWorkshops = await client.query<{
      id: string;
      price: string;
      seatsRemaining: number;
    }>(
      'select id, price, seats_remaining as "seatsRemaining" from workshops where id = $1 for update',
      [workshopId]
    );

    const workshop = lockedWorkshops.rows[0];
    if (!workshop) {
      throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
    }

    const existing = await client.query<{ id: string; status: string }>(
      'select id, status from registrations where user_id = $1 and workshop_id = $2 for update',
      [userId, workshopId]
    );
    const existingRegistration = existing.rows[0];

    if (existingRegistration && existingRegistration.status !== 'CANCELLED') {
      throw Object.assign(new Error('Already registered'), { statusCode: 400 });
    }

    if (workshop.seatsRemaining <= 0) {
      throw Object.assign(new Error('Workshop is full'), { statusCode: 400 });
    }

    await client.query(
      'update workshops set seats_remaining = seats_remaining - 1, updated_at = now() where id = $1',
      [workshopId]
    );

    const registration = existingRegistration
      ? await client.query(
          `
            update registrations
            set qr_code = $2, status = 'PENDING', checked_in_at = null, updated_at = now()
            where id = $1
            returning id, user_id as "userId", workshop_id as "workshopId", qr_code as "qrCode", status
          `,
          [existingRegistration.id, uuidv4()]
        )
      : await client.query(
          `
            insert into registrations (user_id, workshop_id, qr_code, status)
            values ($1, $2, $3, 'PENDING')
            returning id, user_id as "userId", workshop_id as "workshopId", qr_code as "qrCode", status
          `,
          [userId, workshopId, uuidv4()]
        );

    const payment = await client.query(
      `
        insert into payments (registration_id, amount, status, idempotency_key)
        values ($1, $2, 'PENDING', $3)
        on conflict (registration_id) do update
        set amount = excluded.amount,
          status = 'PENDING',
          transaction_id = null,
          idempotency_key = excluded.idempotency_key,
          updated_at = now()
        returning id, registration_id as "registrationId", amount, status, idempotency_key as "idempotencyKey"
      `,
      [registration.rows[0].id, workshop.price, idempotencyKey]
    );

    return {
      registration: registration.rows[0],
      payment: payment.rows[0],
      price: Number(workshop.price)
    };
  });
};

export const markPaymentSuccessAndConfirmRegistration = async ({
  paymentId,
  transactionId,
  registrationId
}: {
  paymentId: string;
  transactionId: string;
  registrationId: string;
}) => {
  return withTransaction(async (client) => {
    await client.query(
      'update payments set status = $2, transaction_id = $3, updated_at = now() where id = $1',
      [paymentId, 'SUCCESS', transactionId]
    );

    const result = await client.query(
      `
        update registrations
        set status = 'CONFIRMED', updated_at = now()
        where id = $1 and status = 'PENDING'
        returning id, user_id as "userId", workshop_id as "workshopId", qr_code as "qrCode", status, checked_in_at as "checkedInAt"
      `,
      [registrationId]
    );

    if (!result.rows[0]) {
      throw Object.assign(new Error('Registration is not pending'), { statusCode: 409 });
    }

    const payment = await client.query(
      `
        select id, registration_id as "registrationId", amount, status, transaction_id as "transactionId",
          idempotency_key as "idempotencyKey"
        from payments
        where registration_id = $1
      `,
      [registrationId]
    );

    return { ...result.rows[0], payment: payment.rows[0] };
  });
};

export const cancelReservation = async (registrationId: string, workshopId: string) => {
  await withTransaction(async (client) => {
    const cancelled = await client.query(
      `
        update registrations
        set status = $2, updated_at = now()
        where id = $1 and status = 'PENDING'
        returning id
      `,
      [registrationId, 'CANCELLED']
    );

    if (!cancelled.rows[0]) {
      return;
    }

    await client.query(
      'update payments set status = $2, updated_at = now() where registration_id = $1 and status = $3',
      [registrationId, 'FAILED', 'PENDING']
    );

    await client.query(
      `
        update workshops
        set seats_remaining = least(seats_remaining + 1, capacity), updated_at = now()
        where id = $1
      `,
      [workshopId]
    );
  });
};
