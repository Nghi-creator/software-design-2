import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { rateLimiter } from '../middleware/rateLimiter';
import { idempotency } from '../middleware/idempotency';
import { requireRole } from '../middleware/auth';
import multer from 'multer';
import { generateWorkshopSummary } from '../services/ai';
import { registerForWorkshop } from '../services/registration';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all workshops
router.get('/', async (req, res) => {
  const workshops = await prisma.workshop.findMany({
    include: { room: true },
    orderBy: { startTime: 'asc' }
  });
  res.json(workshops);
});

// Create workshop (Admin) with AI PDF summary
router.post('/', requireRole(Role.ORGANIZER), upload.single('pdf'), async (req, res) => {
  const { title, speaker, roomId, capacity, price, startTime, pdfUrl } = req.body;
  
  try {
    let aiSummary = null;
    if (req.file) {
      aiSummary = await generateWorkshopSummary(req.file.buffer);
    }

    const workshop = await prisma.workshop.create({
      data: {
        title,
        speaker,
        roomId,
        capacity: Number(capacity),
        seatsRemaining: Number(capacity),
        price: Number(price ?? 0),
        startTime: new Date(startTime),
        pdfUrl,
        aiSummary
      }
    });

    res.json(workshop);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Register for workshop (Student)
// Rate limited: 5 requests per 10 seconds per IP
router.post('/:id/register', requireRole(Role.STUDENT), rateLimiter(5, 0.5), idempotency, async (req, res) => {
  const workshopId = req.params.id as string;
  const { paymentToken } = req.body;
  const idempotencyKey = req.header('idempotency-key') as string;

  try {
    const registration = await registerForWorkshop({
      workshopId,
      userId: req.user!.id,
      paymentToken,
      idempotencyKey
    });

    res.json({ success: true, registration });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
});

export default router;
