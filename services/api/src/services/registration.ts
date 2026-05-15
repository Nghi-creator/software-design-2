import { paymentCircuitBreaker } from './payment';
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
}: RegisterInput) => {
  const reservation = await reserveSeat({ workshopId, userId, idempotencyKey });

  if (reservation.price > 0) {
    if (!paymentToken) {
      await cancelReservation(reservation.registration.id, workshopId);
      throw Object.assign(new Error('Payment token required'), { statusCode: 400 });
    }

    try {
      const transactionId = await paymentCircuitBreaker.fire(userId, reservation.price, paymentToken);

      return markPaymentSuccessAndConfirmRegistration({
        paymentId: reservation.payment.id,
        transactionId,
        registrationId: reservation.registration.id
      });
    } catch (error: any) {
      await cancelReservation(reservation.registration.id, workshopId);
      throw Object.assign(new Error(error.message), { statusCode: 503 });
    }
  }

  return markPaymentSuccessAndConfirmRegistration({
    paymentId: reservation.payment.id,
    transactionId: 'free',
    registrationId: reservation.registration.id
  });
};
