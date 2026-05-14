import { withTransaction } from '../lib/db';
import { paymentCircuitBreaker } from './payment';
import { v4 as uuidv4 } from 'uuid';

type RegisterInput = {
  workshopId: string;
  userId: string;
  paymentToken?: string;
  idempotencyKey: string;
};

export const registerForWorkshop = async ({
  workshopId,
  userId,
  paymentToken,
  idempotencyKey
}: RegisterInput) => {
  const reservation = await withTransaction(async (client) => {
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

    const existing = await client.query(
      'select id from registrations where user_id = $1 and workshop_id = $2',
      [userId, workshopId]
    );

    if (existing.rows[0]) {
      throw Object.assign(new Error('Already registered'), { statusCode: 400 });
    }

    if (workshop.seatsRemaining <= 0) {
      throw Object.assign(new Error('Workshop is full'), { statusCode: 400 });
    }

    await client.query(
      'update workshops set seats_remaining = seats_remaining - 1, updated_at = now() where id = $1',
      [workshopId]
    );

    const registration = await client.query(
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

  if (reservation.price > 0) {
    if (!paymentToken) {
      await cancelReservation(reservation.registration.id, workshopId, 'Payment token required');
      throw Object.assign(new Error('Payment token required'), { statusCode: 400 });
    }

    try {
      const transactionId = await paymentCircuitBreaker.fire(userId, reservation.price, paymentToken);

      return withTransaction(async (client) => {
        await client.query(
          'update payments set status = $2, transaction_id = $3, updated_at = now() where id = $1',
          [reservation.payment.id, 'SUCCESS', transactionId]
        );

        return confirmRegistration(client, reservation.registration.id);
      });
    } catch (error: any) {
      await cancelReservation(reservation.registration.id, workshopId, error.message);
      throw Object.assign(new Error(error.message), { statusCode: 503 });
    }
  }

  return withTransaction(async (client) => {
    await client.query(
      'update payments set status = $2, transaction_id = $3, updated_at = now() where id = $1',
      [reservation.payment.id, 'SUCCESS', 'free']
    );

    return confirmRegistration(client, reservation.registration.id);
  });
};

const cancelReservation = async (registrationId: string, workshopId: string, _reason: string) => {
  await withTransaction(async (client) => {
    await client.query(
      'update payments set status = $2, updated_at = now() where registration_id = $1',
      [registrationId, 'FAILED']
    );

    await client.query(
      'update registrations set status = $2, updated_at = now() where id = $1',
      [registrationId, 'CANCELLED']
    );

    await client.query(
      'update workshops set seats_remaining = seats_remaining + 1, updated_at = now() where id = $1',
      [workshopId]
    );
  });
};

const confirmRegistration = async (client: any, registrationId: string) => {
  const result = await client.query(
    `
      update registrations
      set status = 'CONFIRMED', updated_at = now()
      where id = $1
      returning id, user_id as "userId", workshop_id as "workshopId", qr_code as "qrCode", status, checked_in_at as "checkedInAt"
    `,
    [registrationId]
  );

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
};
