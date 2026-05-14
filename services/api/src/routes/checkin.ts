import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import { getRegistrationQr, postCheckin, postCheckinSync } from '../controllers/checkinController';
import { Roles } from '../types/domain';

const router = Router();

router.get('/qr/:registrationId', requireRole(Roles.STUDENT, Roles.ORGANIZER, Roles.CHECKIN_STAFF), getRegistrationQr);
router.post('/', requireRole(Roles.CHECKIN_STAFF), postCheckin);
router.post('/sync', requireRole(Roles.CHECKIN_STAFF), postCheckinSync);

export default router;
