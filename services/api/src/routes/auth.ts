import { Router } from 'express';
import { getMe, postLogin, postRegister } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', postRegister);
router.post('/login', postLogin);
router.get('/me', requireAuth, getMe);

export default router;
