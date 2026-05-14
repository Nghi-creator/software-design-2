import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Normal online check-in
router.post('/', async (req, res) => {
  const { qrCode } = req.body;

  try {
    const registration = await prisma.registration.findUnique({
      where: { qrCode }
    });

    if (!registration) {
      return res.status(404).json({ success: false, error: 'QR Code not found' });
    }

    if (registration.status === 'CHECKED_IN') {
      return res.status(400).json({ success: false, error: 'Already checked in' });
    }

    await prisma.registration.update({
      where: { id: registration.id },
      data: { status: 'CHECKED_IN' }
    });

    res.json({ success: true, message: 'Check-in successful' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Offline sync batch check-in
router.post('/sync', async (req, res) => {
  const { qrCodes } = req.body; // Array of QR codes scanned offline

  if (!Array.isArray(qrCodes)) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }

  try {
    const result = await prisma.registration.updateMany({
      where: {
        qrCode: { in: qrCodes },
        status: { not: 'CHECKED_IN' } // Only update if not already checked in
      },
      data: {
        status: 'CHECKED_IN'
      }
    });

    res.json({ success: true, synced: result.count });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
