import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import { postCheckin, postCheckinSync } from '../controllers/checkinController';
import { Roles } from '../types/domain';

const router = Router();

router.post('/', requireRole(Roles.CHECKIN_STAFF), postCheckin);
router.post('/sync', requireRole(Roles.CHECKIN_STAFF), postCheckinSync);

export default router;
