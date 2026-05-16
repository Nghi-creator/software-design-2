import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cancelPendingReservation,
  registerForWorkshop
} from '../src/services/registration';

type RegistrationState = ReturnType<typeof createRegistrationState>;

const createRegistrationState = () => ({
  workshop: {
    id: 'workshop-1',
    price: '50.00',
    capacity: 1,
    seatsRemaining: 1
  },
  registration: undefined as
    | undefined
    | {
        id: string;
        userId: string;
        workshopId: string;
        qrCode: string;
        status: string;
        checkedInAt: Date | null;
      },
  payment: undefined as
    | undefined
    | {
        id: string;
        registrationId: string;
        amount: string;
        status: string;
        transactionId: string | null;
        idempotencyKey: string;
      },
  insertedRegistrations: 0,
  reusedCancelledRegistrations: 0,
  seatReleases: 0
});

const createRegistrationDependencies = (
  state: RegistrationState,
  processPayment: (userId: string, amount: number, token: string) => Promise<string>
) => ({
  processPayment,
  createQrCode: () => `qr-${state.insertedRegistrations + state.reusedCancelledRegistrations + 1}`,
  publishRegistrationConfirmed: async () => undefined,
  withTransaction: async <T>(callback: (client: { query: any }) => Promise<T>) => {
    const query = async <R = any>(text: string, params: unknown[] = []) => {
      const sql = text.replace(/\s+/g, ' ').trim();

      if (sql.startsWith('select id, price, seats_remaining')) {
        return { rows: [state.workshop] as R[] };
      }

      if (sql.startsWith('select id, status from registrations')) {
        const [userId, workshopId] = params;
        const currentRegistration = state.registration;
        const registration =
          currentRegistration &&
          currentRegistration.userId === userId &&
          currentRegistration.workshopId === workshopId
            ? { id: currentRegistration.id, status: currentRegistration.status }
            : undefined;
        return { rows: registration ? ([registration] as R[]) : [] };
      }

      if (sql.startsWith('update workshops set seats_remaining = seats_remaining - 1')) {
        state.workshop.seatsRemaining -= 1;
        return { rows: [] as R[] };
      }

      if (sql.startsWith('update registrations set qr_code')) {
        const [id, qrCode] = params as string[];
        assert.equal(state.registration?.id, id);
        state.reusedCancelledRegistrations += 1;
        state.registration = {
          ...state.registration,
          qrCode,
          status: 'PENDING',
          checkedInAt: null
        };
        return { rows: [toRegistrationRow(state)] as R[] };
      }

      if (sql.startsWith('insert into registrations')) {
        const [userId, workshopId, qrCode] = params as string[];
        state.insertedRegistrations += 1;
        state.registration = {
          id: 'registration-1',
          userId,
          workshopId,
          qrCode,
          status: 'PENDING',
          checkedInAt: null
        };
        return { rows: [toRegistrationRow(state)] as R[] };
      }

      if (sql.startsWith('insert into payments')) {
        const [registrationId, amount, idempotencyKey] = params as string[];
        state.payment = {
          id: 'payment-1',
          registrationId,
          amount,
          status: 'PENDING',
          transactionId: null,
          idempotencyKey
        };
        return { rows: [toPaymentRow(state)] as R[] };
      }

      if (sql.startsWith('update registrations set status = $2')) {
        const [registrationId, status] = params as string[];
        if (state.registration?.id !== registrationId || state.registration.status !== 'PENDING') {
          return { rows: [] as R[] };
        }

        state.registration.status = status;
        return { rows: [{ id: registrationId }] as R[] };
      }

      if (sql.startsWith('update payments set status = $2, updated_at')) {
        const [registrationId, status] = params as string[];
        if (state.payment?.registrationId === registrationId && state.payment.status === 'PENDING') {
          state.payment.status = status;
        }
        return { rows: [] as R[] };
      }

      if (sql.startsWith('update workshops set seats_remaining = least')) {
        state.workshop.seatsRemaining = Math.min(
          state.workshop.seatsRemaining + 1,
          state.workshop.capacity
        );
        state.seatReleases += 1;
        return { rows: [] as R[] };
      }

      if (sql.startsWith('update payments set status = $2, transaction_id')) {
        const [paymentId, status, transactionId] = params as string[];
        assert.equal(state.payment?.id, paymentId);
        state.payment.status = status;
        state.payment.transactionId = transactionId;
        return { rows: [] as R[] };
      }

      if (sql.startsWith("update registrations set status = 'CONFIRMED'")) {
        const [registrationId] = params as string[];
        if (state.registration?.id !== registrationId || state.registration.status !== 'PENDING') {
          return { rows: [] as R[] };
        }

        state.registration.status = 'CONFIRMED';
        return { rows: [toRegistrationRow(state)] as R[] };
      }

      if (sql.startsWith('select id, registration_id as "registrationId"')) {
        return { rows: [toPaymentRow(state)] as R[] };
      }

      throw new Error(`Unexpected query: ${sql}`);
    };

    return callback({ query });
  }
});

const toRegistrationRow = (state: RegistrationState) => {
  assert.ok(state.registration);
  return {
    id: state.registration.id,
    userId: state.registration.userId,
    workshopId: state.registration.workshopId,
    qrCode: state.registration.qrCode,
    status: state.registration.status,
    checkedInAt: state.registration.checkedInAt
  };
};

const toPaymentRow = (state: RegistrationState) => {
  assert.ok(state.payment);
  return {
    id: state.payment.id,
    registrationId: state.payment.registrationId,
    amount: state.payment.amount,
    status: state.payment.status,
    transactionId: state.payment.transactionId,
    idempotencyKey: state.payment.idempotencyKey
  };
};

test('paid registration failure releases the reserved seat and cancelled retry reuses the row', async () => {
  const state = createRegistrationState();
  let paymentAttempts = 0;
  const dependencies = createRegistrationDependencies(state, async () => {
    paymentAttempts += 1;
    if (paymentAttempts === 1) {
      throw new Error('gateway timeout');
    }
    return 'txn-success';
  });

  await assert.rejects(
    registerForWorkshop(
      {
        workshopId: 'workshop-1',
        userId: 'student-1',
        paymentToken: 'tok-first',
        idempotencyKey: 'idem-first'
      },
      dependencies
    ),
    /gateway timeout/
  );

  assert.equal(state.workshop.seatsRemaining, 1);
  assert.equal(state.registration?.status, 'CANCELLED');
  assert.equal(state.payment?.status, 'FAILED');
  assert.equal(state.seatReleases, 1);

  const registration = await registerForWorkshop(
    {
      workshopId: 'workshop-1',
      userId: 'student-1',
      paymentToken: 'tok-second',
      idempotencyKey: 'idem-second'
    },
    dependencies
  );

  assert.equal(registration.id, 'registration-1');
  assert.equal(registration.status, 'CONFIRMED');
  assert.equal(registration.payment.status, 'SUCCESS');
  assert.equal(registration.payment.transactionId, 'txn-success');
  assert.equal(state.insertedRegistrations, 1);
  assert.equal(state.reusedCancelledRegistrations, 1);
  assert.equal(state.workshop.seatsRemaining, 0);
  assert.equal(paymentAttempts, 2);
});

test('seat release is idempotent when a registration is already cancelled', async () => {
  const state = createRegistrationState();
  state.registration = {
    id: 'registration-1',
    userId: 'student-1',
    workshopId: 'workshop-1',
    qrCode: 'qr-old',
    status: 'CANCELLED',
    checkedInAt: null
  };
  state.payment = {
    id: 'payment-1',
    registrationId: 'registration-1',
    amount: '50.00',
    status: 'FAILED',
    transactionId: null,
    idempotencyKey: 'idem-old'
  };

  await cancelPendingReservation(
    'registration-1',
    'workshop-1',
    'late duplicate failure',
    createRegistrationDependencies(state, async () => 'unused')
  );

  assert.equal(state.workshop.seatsRemaining, 1);
  assert.equal(state.seatReleases, 0);
  assert.equal(state.payment.status, 'FAILED');
});

test('free registration confirms immediately and consumes exactly one seat', async () => {
  const state = createRegistrationState();
  state.workshop.price = '0.00';

  const registration = await registerForWorkshop(
    {
      workshopId: 'workshop-1',
      userId: 'student-1',
      idempotencyKey: 'idem-free'
    },
    createRegistrationDependencies(state, async () => {
      throw new Error('payment gateway should not run for free workshops');
    })
  );

  assert.equal(registration.status, 'CONFIRMED');
  assert.equal(registration.payment.status, 'SUCCESS');
  assert.equal(registration.payment.transactionId, 'free');
  assert.equal(state.workshop.seatsRemaining, 0);
  assert.equal(state.insertedRegistrations, 1);
  assert.equal(state.seatReleases, 0);
});

test('missing payment token releases the temporary reservation', async () => {
  const state = createRegistrationState();

  await assert.rejects(
    registerForWorkshop(
      {
        workshopId: 'workshop-1',
        userId: 'student-1',
        idempotencyKey: 'idem-missing-token'
      },
      createRegistrationDependencies(state, async () => 'unused')
    ),
    /Payment token required/
  );

  assert.equal(state.workshop.seatsRemaining, 1);
  assert.equal(state.registration?.status, 'CANCELLED');
  assert.equal(state.payment?.status, 'FAILED');
  assert.equal(state.seatReleases, 1);
});

test('full workshop rejects a new registration without creating rows', async () => {
  const state = createRegistrationState();
  state.workshop.seatsRemaining = 0;

  await assert.rejects(
    registerForWorkshop(
      {
        workshopId: 'workshop-1',
        userId: 'student-1',
        paymentToken: 'tok-unused',
        idempotencyKey: 'idem-full'
      },
      createRegistrationDependencies(state, async () => 'unused')
    ),
    /Workshop is full/
  );

  assert.equal(state.workshop.seatsRemaining, 0);
  assert.equal(state.registration, undefined);
  assert.equal(state.payment, undefined);
  assert.equal(state.insertedRegistrations, 0);
});

test('duplicate non-cancelled registration is rejected before another seat is consumed', async () => {
  const state = createRegistrationState();
  state.workshop.seatsRemaining = 0;
  state.registration = {
    id: 'registration-1',
    userId: 'student-1',
    workshopId: 'workshop-1',
    qrCode: 'qr-existing',
    status: 'CONFIRMED',
    checkedInAt: null
  };

  await assert.rejects(
    registerForWorkshop(
      {
        workshopId: 'workshop-1',
        userId: 'student-1',
        paymentToken: 'tok-unused',
        idempotencyKey: 'idem-duplicate'
      },
      createRegistrationDependencies(state, async () => 'unused')
    ),
    /Already registered/
  );

  assert.equal(state.workshop.seatsRemaining, 0);
  assert.equal(state.registration.status, 'CONFIRMED');
  assert.equal(state.insertedRegistrations, 0);
});

test('seat cancellation never raises seats remaining above workshop capacity', async () => {
  const state = createRegistrationState();
  state.registration = {
    id: 'registration-1',
    userId: 'student-1',
    workshopId: 'workshop-1',
    qrCode: 'qr-old',
    status: 'PENDING',
    checkedInAt: null
  };
  state.payment = {
    id: 'payment-1',
    registrationId: 'registration-1',
    amount: '50.00',
    status: 'PENDING',
    transactionId: null,
    idempotencyKey: 'idem-old'
  };

  await cancelPendingReservation(
    'registration-1',
    'workshop-1',
    'manual cancellation',
    createRegistrationDependencies(state, async () => 'unused')
  );

  assert.equal(state.workshop.seatsRemaining, 1);
  assert.equal(state.registration.status, 'CANCELLED');
  assert.equal(state.payment.status, 'FAILED');
});
