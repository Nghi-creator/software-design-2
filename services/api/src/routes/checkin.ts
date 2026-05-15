import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import { getRegistrationQr, postCheckin, postCheckinSync } from '../controllers/checkinController';
import { Roles } from '../types/domain';
import {
  validateCheckinPayload,
  validateCheckinSyncPayload,
  validateUuidParam
} from '../middleware/requestValidation';

const router = Router();

router.get(
  '/qr/:registrationId',
  requireRole(Roles.STUDENT, Roles.ORGANIZER, Roles.CHECKIN_STAFF),
  validateUuidParam('registrationId'),
  getRegistrationQr
);
router.post('/', requireRole(Roles.CHECKIN_STAFF), validateCheckinPayload, postCheckin);
router.post('/sync', requireRole(Roles.CHECKIN_STAFF), validateCheckinSyncPayload, postCheckinSync);

export default router;
