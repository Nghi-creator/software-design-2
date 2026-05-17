import { Router } from 'express';
import { getMyRegistrations } from '../controllers/registrationController';
import { requireRole } from '../middleware/auth';
import { Roles } from '../types/domain';

const router = Router();

router.get('/me', requireRole(Roles.STUDENT), getMyRegistrations);

export default router;
