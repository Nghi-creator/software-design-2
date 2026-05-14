import { CheckinSource } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type SyncItem = {
  localId?: string;
  qrCode: string;
  scannedAt?: string;
};

export const checkInOnline = async (qrCode: string, staffId: string) => {
  return checkInOne({ qrCode, staffId, source: 'ONLINE' });
};

export const syncOfflineCheckins = async (items: SyncItem[], staffId: string) => {
  const results = [];

  for (const item of items) {
    if (!item.qrCode) {
      results.push({ localId: item.localId, qrCode: item.qrCode, status: 'invalid' });
      continue;
    }

    try {
      const result = await checkInOne({
        qrCode: item.qrCode,
        staffId,
        source: 'OFFLINE_SYNC',
        scannedAt: item.scannedAt
      });

      results.push({
        localId: item.localId,
        qrCode: item.qrCode,
        status: result.status,
        registrationId: result.registrationId
      });
    } catch {
      results.push({ localId: item.localId, qrCode: item.qrCode, status: 'failed' });
    }
  }

  return results;
};

const checkInOne = async ({
  qrCode,
  staffId,
  source,
  scannedAt
}: {
  qrCode: string;
  staffId: string;
  source: CheckinSource;
  scannedAt?: string;
}) => {
  const registration = await prisma.registration.findUnique({
    where: { qrCode },
    include: { checkin: true }
  });

  if (!registration || registration.status !== 'CONFIRMED') {
    return { status: 'invalid', registrationId: registration?.id };
  }

  if (registration.checkedInAt || registration.checkin) {
    return { status: 'already_checked_in', registrationId: registration.id };
  }

  const checkinTime = scannedAt ? new Date(scannedAt) : new Date();

  await prisma.$transaction(async (tx) => {
    const updated = await tx.registration.updateMany({
      where: {
        id: registration.id,
        checkedInAt: null
      },
      data: { checkedInAt: checkinTime }
    });

    if (updated.count === 0) {
      return;
    }

    await tx.checkin.create({
      data: {
        registrationId: registration.id,
        staffId,
        checkinTime,
        source
      }
    });
  });

  return { status: 'checked_in', registrationId: registration.id };
};
