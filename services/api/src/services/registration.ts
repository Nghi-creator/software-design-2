import { RegistrationDependencies, registrationDependencies } from '../di';

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
}: RegisterInput, dependencies: RegistrationDependencies = registrationDependencies) => {
  const reservation = await dependencies.withTransaction(async (client) => {
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

    const existing = await client.query<{
      id: string;
      status: string;
    }>(
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
          [existingRegistration.id, dependencies.createQrCode()]
        )
      : await client.query(
          `
            insert into registrations (user_id, workshop_id, qr_code, status)
            values ($1, $2, $3, 'PENDING')
            returning id, user_id as "userId", workshop_id as "workshopId", qr_code as "qrCode", status
          `,
          [userId, workshopId, dependencies.createQrCode()]
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

  if (reservation.price > 0) {
    if (!paymentToken) {
      await cancelPendingReservation(
        reservation.registration.id,
        workshopId,
        'Payment token required',
        dependencies
      );
      throw Object.assign(new Error('Payment token required'), { statusCode: 400 });
    }

    try {
      const transactionId = await dependencies.processPayment(userId, reservation.price, paymentToken);

      return dependencies.withTransaction(async (client) => {
        await client.query(
          'update payments set status = $2, transaction_id = $3, updated_at = now() where id = $1',
          [reservation.payment.id, 'SUCCESS', transactionId]
        );

        return confirmRegistration(client, reservation.registration.id);
      });
    } catch (error: any) {
      await cancelPendingReservation(reservation.registration.id, workshopId, error.message, dependencies);
      throw Object.assign(new Error(error.message), { statusCode: 503 });
    }
  }

  return dependencies.withTransaction(async (client) => {
    await client.query(
      'update payments set status = $2, transaction_id = $3, updated_at = now() where id = $1',
      [reservation.payment.id, 'SUCCESS', 'free']
    );

    return confirmRegistration(client, reservation.registration.id);
  });
};

export const cancelPendingReservation = async (
  registrationId: string,
  workshopId: string,
  _reason: string,
  dependencies: RegistrationDependencies = registrationDependencies
) => {
  await dependencies.withTransaction(async (client) => {
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

const confirmRegistration = async (client: any, registrationId: string) => {
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
};
