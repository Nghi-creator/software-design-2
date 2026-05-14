import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
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
  const reservation = await prisma.$transaction(async (tx) => {
    const lockedWorkshops = await tx.$queryRaw<Array<{
      id: string;
      price: Prisma.Decimal;
      seatsRemaining: number;
    }>>`
      SELECT id, price, "seatsRemaining" FROM "Workshop" WHERE id = ${workshopId} FOR UPDATE
    `;

    const workshop = lockedWorkshops[0];
    if (!workshop) {
      throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
    }

    const existing = await tx.registration.findUnique({
      where: { userId_workshopId: { userId, workshopId } }
    });

    if (existing) {
      throw Object.assign(new Error('Already registered'), { statusCode: 400 });
    }

    if (workshop.seatsRemaining <= 0) {
      throw Object.assign(new Error('Workshop is full'), { statusCode: 400 });
    }

    await tx.workshop.update({
      where: { id: workshopId },
      data: { seatsRemaining: { decrement: 1 } }
    });

    const registration = await tx.registration.create({
      data: {
        userId,
        workshopId,
        qrCode: uuidv4(),
        status: 'PENDING'
      }
    });

    const payment = await tx.payment.create({
      data: {
        registrationId: registration.id,
        amount: workshop.price,
        status: 'PENDING',
        idempotencyKey
      }
    });

    return {
      registration,
      payment,
      price: workshop.price
    };
  });

  if (reservation.price.greaterThan(0)) {
    if (!paymentToken) {
      await cancelReservation(reservation.registration.id, workshopId, 'Payment token required');
      throw Object.assign(new Error('Payment token required'), { statusCode: 400 });
    }

    try {
      const transactionId = await paymentCircuitBreaker.fire(userId, Number(reservation.price), paymentToken);

      return prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: reservation.payment.id },
          data: { status: 'SUCCESS', transactionId }
        });

        return tx.registration.update({
          where: { id: reservation.registration.id },
          data: { status: 'CONFIRMED' },
          include: { payment: true }
        });
      });
    } catch (error: any) {
      await cancelReservation(reservation.registration.id, workshopId, error.message);
      throw Object.assign(new Error(error.message), { statusCode: 503 });
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: reservation.payment.id },
      data: { status: 'SUCCESS', transactionId: 'free' }
    });

    return tx.registration.update({
      where: { id: reservation.registration.id },
      data: { status: 'CONFIRMED' },
      include: { payment: true }
    });
  });
};

const cancelReservation = async (registrationId: string, workshopId: string, _reason: string) => {
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { registrationId },
      data: { status: 'FAILED' }
    });

    await tx.registration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED' }
    });

    await tx.workshop.update({
      where: { id: workshopId },
      data: { seatsRemaining: { increment: 1 } }
    });
  });
};
