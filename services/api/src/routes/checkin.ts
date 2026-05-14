import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/auth';
import { postCheckin, postCheckinSync } from '../controllers/checkinController';

const router = Router();

router.post('/', requireRole(Role.CHECKIN_STAFF), postCheckin);
router.post('/sync', requireRole(Role.CHECKIN_STAFF), postCheckinSync);

export default router;
