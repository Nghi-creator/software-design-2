import { RegistrationDependencies, registrationDependencies } from '../di';

export const getWorkshopPrice = async (
  workshopId: string,
  dependencies: RegistrationDependencies = registrationDependencies
) => {
  const result = await dependencies.withTransaction(async (client) => {
    const workshop = await client.query<{ price: string }>(
      'select price from workshops where id = $1',
      [workshopId]
    );

    return workshop.rows[0] ?? null;
  });

  if (!result) {
    throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
  }

  return Number(result.price);
};

export const reserveSeat = async ({
  workshopId,
  userId,
  idempotencyKey
}: {
  workshopId: string;
  userId: string;
  idempotencyKey: string;
}, dependencies: RegistrationDependencies = registrationDependencies) => {
  return dependencies.withTransaction(async (client) => {
    const existing = await client.query<{ id: string; status: string }>(
      'select id, status from registrations where user_id = $1 and workshop_id = $2 for update',
      [userId, workshopId]
    );
    const existingRegistration = existing.rows[0];

    if (existingRegistration && existingRegistration.status !== 'CANCELLED') {
      throw Object.assign(new Error('Already registered'), { statusCode: 400 });
    }

    const currentWorkshop = await client.query<{ id: string; seatsRemaining: number }>(
      'select id, seats_remaining as "seatsRemaining" from workshops where id = $1',
      [workshopId]
    );
    const currentWorkshopRow = currentWorkshop.rows[0];

    if (!currentWorkshopRow) {
      throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
    }

    if (currentWorkshopRow.seatsRemaining <= 0) {
      throw Object.assign(new Error('Workshop is full'), { statusCode: 400 });
    }

    const reservedWorkshops = await client.query<{
      id: string;
      price: string;
      seatsRemaining: number;
    }>(
      `
        update workshops
        set seats_remaining = seats_remaining - 1,
          updated_at = now()
        where id = $1
          and seats_remaining > 0
        returning id, price, seats_remaining as "seatsRemaining"
      `,
      [workshopId]
    );
    const workshop = reservedWorkshops.rows[0];

    if (!workshop) {
      throw Object.assign(new Error('Workshop is full'), { statusCode: 400 });
    }

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
};

export const markPaymentSuccessAndConfirmRegistration = async ({
  paymentId,
  transactionId,
  registrationId
}: {
  paymentId: string;
  transactionId: string;
  registrationId: string;
}, dependencies: RegistrationDependencies = registrationDependencies) => {
  return dependencies.withTransaction(async (client) => {
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

export const cancelReservation = async (
  registrationId: string,
  workshopId: string,
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
