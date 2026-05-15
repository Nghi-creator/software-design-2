import { CheckinDependencies, checkinDependencies } from '../di';
import { CheckinSource, Role, Roles } from '../types/domain';
import {
  createCheckinIfPending,
  findRegistrationForCheckin,
  findRegistrationQrById
} from '../repositories/checkinRepository';

export type SyncItem = {
  localId?: string;
  qrCode: string;
  scannedAt?: string;
};

export const checkInOnline = async (
  qrCode: string,
  staffId: string,
  dependencies: CheckinDependencies = checkinDependencies
) => {
  return checkInOne({ qrCode, staffId, source: 'ONLINE' }, dependencies);
};

export const generateRegistrationQr = async ({
  registrationId,
  requesterId,
  requesterRole
}: {
  registrationId: string;
  requesterId: string;
  requesterRole: Role;
}, dependencies: CheckinDependencies = checkinDependencies) => {
  const registration = await findRegistrationQrById(registrationId, dependencies);

  if (!registration) {
    throw Object.assign(new Error('Registration not found'), { statusCode: 404 });
  }

  const canRead =
    requesterRole === Roles.CHECKIN_STAFF ||
    requesterRole === Roles.ORGANIZER ||
    registration.userId === requesterId;

  if (!canRead) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }

  if (registration.status !== 'CONFIRMED') {
    throw Object.assign(new Error('Registration is not confirmed'), { statusCode: 409 });
  }

  return {
    registrationId: registration.id,
    workshopId: registration.workshopId,
    workshopTitle: registration.workshopTitle,
    qrCode: registration.qrCode
  };
};

export const syncOfflineCheckins = async (
  items: SyncItem[],
  staffId: string,
  dependencies: CheckinDependencies = checkinDependencies
) => {
  const results = [];

  for (const item of items) {
    if (!item.qrCode) {
      results.push({ localId: item.localId, qrCode: item.qrCode, status: 'invalid' });
      continue;
    }

    try {
      const result = await checkInOne(
        {
          qrCode: item.qrCode,
          staffId,
          source: 'OFFLINE_SYNC',
          scannedAt: item.scannedAt
        },
        dependencies
      );

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

const checkInOne = async (
  {
    qrCode,
    staffId,
    source,
    scannedAt
  }: {
    qrCode: string;
    staffId: string;
    source: CheckinSource;
    scannedAt?: string;
  },
  dependencies: CheckinDependencies = checkinDependencies
) => {
  const registration = await findRegistrationForCheckin(qrCode, dependencies);

  if (!registration || registration.status !== 'CONFIRMED') {
    return { status: 'invalid', registrationId: registration?.id };
  }

  if (registration.checkedInAt || registration.checkinId) {
    return { status: 'already_checked_in', registrationId: registration.id };
  }

  const checkinTime = scannedAt ? new Date(scannedAt) : new Date();

  await createCheckinIfPending(
    {
      registrationId: registration.id,
      staffId,
      checkinTime,
      source
    },
    dependencies
  );

  return { status: 'checked_in', registrationId: registration.id };
};
