import { Router } from 'express';
import {
  listStudentNotifications,
  markStudentNotificationAsRead
} from '../controllers/notificationController';
import { requireRole } from '../middleware/auth';
import { validateUuidParam } from '../middleware/requestValidation';
import { Roles } from '../types/domain';

const router = Router();

router.get('/', requireRole(Roles.STUDENT), listStudentNotifications);
router.patch('/:id/read', requireRole(Roles.STUDENT), validateUuidParam('id'), markStudentNotificationAsRead);

export default router;
