import { Router } from 'express';
import { rateLimiter } from '../middleware/rateLimiter';
import { idempotency } from '../middleware/idempotency';
import { requireRole } from '../middleware/auth';
import multer from 'multer';
import { Roles } from '../types/domain';
import {
  deleteWorkshopById,
  getWorkshopSummaryStatusController,
  getWorkshops,
  getWorkshopStatistics,
  postWorkshop,
  postWorkshopRegistration,
  putWorkshop
} from '../controllers/workshopController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getWorkshops);
router.get('/:id/stats', requireRole(Roles.ORGANIZER), getWorkshopStatistics);
router.get('/:id/summary-status', requireRole(Roles.ORGANIZER), getWorkshopSummaryStatusController);
router.post('/', requireRole(Roles.ORGANIZER), upload.single('pdf'), postWorkshop);
router.put('/:id', requireRole(Roles.ORGANIZER), putWorkshop);
router.delete('/:id', requireRole(Roles.ORGANIZER), deleteWorkshopById);
router.post('/:id/register', requireRole(Roles.STUDENT), rateLimiter(5, 0.5), idempotency, postWorkshopRegistration);

export default router;
