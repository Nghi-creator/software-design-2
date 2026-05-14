import { Router } from 'express';
import { Role } from '@prisma/client';
import { rateLimiter } from '../middleware/rateLimiter';
import { idempotency } from '../middleware/idempotency';
import { requireRole } from '../middleware/auth';
import multer from 'multer';
import {
  getWorkshops,
  postWorkshop,
  postWorkshopRegistration
} from '../controllers/workshopController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getWorkshops);
router.post('/', requireRole(Role.ORGANIZER), upload.single('pdf'), postWorkshop);
router.post('/:id/register', requireRole(Role.STUDENT), rateLimiter(5, 0.5), idempotency, postWorkshopRegistration);

export default router;
