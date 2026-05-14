import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/auth';
import { checkInOnline, syncOfflineCheckins } from '../services/checkin';

const router = Router();

// Normal online check-in
router.post('/', requireRole(Role.CHECKIN_STAFF), async (req, res) => {
  const { qrCode } = req.body;

  try {
    const result = await checkInOnline(qrCode, req.user!.id);
    if (result.status === 'invalid') {
      return res.status(404).json({ success: false, error: 'QR Code not found or not confirmed' });
    }

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Offline sync batch check-in
router.post('/sync', requireRole(Role.CHECKIN_STAFF), async (req, res) => {
  const items = req.body.items ?? req.body.qrCodes?.map((qrCode: string) => ({ qrCode }));

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  try {
    const results = await syncOfflineCheckins(items, req.user!.id);
    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
