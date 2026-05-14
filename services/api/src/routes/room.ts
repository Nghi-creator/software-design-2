import { Router } from 'express';
import {
  deleteRoomById,
  getRooms,
  postRoom,
  putRoom
} from '../controllers/roomController';
import { requireRole } from '../middleware/auth';
import { Roles } from '../types/domain';

const router = Router();

router.get('/', getRooms);
router.post('/', requireRole(Roles.ORGANIZER), postRoom);
router.put('/:id', requireRole(Roles.ORGANIZER), putRoom);
router.delete('/:id', requireRole(Roles.ORGANIZER), deleteRoomById);

export default router;
