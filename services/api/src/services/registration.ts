import { RegistrationDependencies, registrationDependencies } from '../di';
import {
  cancelReservation,
  markPaymentSuccessAndConfirmRegistration,
  reserveSeat
} from '../repositories/registrationRepository';

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
  const reservation = await reserveSeat({ workshopId, userId, idempotencyKey }, dependencies);

  if (reservation.price > 0) {
    if (!paymentToken) {
      await cancelPendingReservation(reservation.registration.id, workshopId, 'Payment token required', dependencies);
      throw Object.assign(new Error('Payment token required'), { statusCode: 400 });
    }

    try {
      const transactionId = await dependencies.processPayment(userId, reservation.price, paymentToken);

      return markPaymentSuccessAndConfirmRegistration(
        {
          paymentId: reservation.payment.id,
          transactionId,
          registrationId: reservation.registration.id
        },
        dependencies
      );
    } catch (error: any) {
      await cancelPendingReservation(reservation.registration.id, workshopId, error.message, dependencies);
      throw Object.assign(new Error(error.message), { statusCode: 503 });
    }
  }

  return markPaymentSuccessAndConfirmRegistration(
    {
      paymentId: reservation.payment.id,
      transactionId: 'free',
      registrationId: reservation.registration.id
    },
    dependencies
  );
};

export const cancelPendingReservation = async (
  registrationId: string,
  workshopId: string,
  _reason: string,
  dependencies: RegistrationDependencies = registrationDependencies
) => {
  await cancelReservation(registrationId, workshopId, dependencies);
};
