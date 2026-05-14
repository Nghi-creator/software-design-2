import { Role } from '@prisma/client';
import { Router } from 'express';
import {
  deleteRoomById,
  getRooms,
  postRoom,
  putRoom
} from '../controllers/roomController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', getRooms);
router.post('/', requireRole(Role.ORGANIZER), postRoom);
router.put('/:id', requireRole(Role.ORGANIZER), putRoom);
router.delete('/:id', requireRole(Role.ORGANIZER), deleteRoomById);

export default router;
