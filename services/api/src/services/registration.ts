import { RegistrationDependencies, registrationDependencies } from '../di';
import {
  cancelReservation,
  getWorkshopPrice,
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
  const workshopPrice = await getWorkshopPrice(workshopId, dependencies);

  if (workshopPrice > 0 && !paymentToken) {
    throw Object.assign(new Error('Payment token required'), { statusCode: 400 });
  }

  const reservation = await reserveSeat({ workshopId, userId, idempotencyKey }, dependencies);

  if (reservation.price > 0) {
    try {
      const transactionId = await dependencies.processPayment(userId, reservation.price, paymentToken!);

      const registration = await markPaymentSuccessAndConfirmRegistration(
        {
          paymentId: reservation.payment.id,
          transactionId,
          registrationId: reservation.registration.id
        },
        dependencies
      );
      await dependencies.publishRegistrationConfirmed(registration.id);
      return registration;
    } catch (error: any) {
      await cancelPendingReservation(reservation.registration.id, workshopId, error.message, dependencies);
      throw Object.assign(new Error(error.message), { statusCode: 503 });
    }
  }

  const registration = await markPaymentSuccessAndConfirmRegistration(
    {
      paymentId: reservation.payment.id,
      transactionId: 'free',
      registrationId: reservation.registration.id
    },
    dependencies
  );
  await dependencies.publishRegistrationConfirmed(registration.id);
  return registration;
};

export const cancelPendingReservation = async (
  registrationId: string,
  workshopId: string,
  _reason: string,
  dependencies: RegistrationDependencies = registrationDependencies
) => {
  await cancelReservation(registrationId, workshopId, dependencies);
};
