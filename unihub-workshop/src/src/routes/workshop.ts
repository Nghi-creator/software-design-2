import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { rateLimiter } from '../middleware/rateLimiter';
import { idempotency } from '../middleware/idempotency';
import { paymentCircuitBreaker } from '../services/payment';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { generateWorkshopSummary } from '../services/ai';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all workshops
router.get('/', async (req, res) => {
  const workshops = await prisma.workshop.findMany();
  res.json(workshops);
});

// Create workshop (Admin) with AI PDF summary
router.post('/', upload.single('pdf'), async (req, res) => {
  const { title, speaker, room, totalSeats, price, startTime, endTime } = req.body;
  
  let summary = null;
  if (req.file) {
    summary = await generateWorkshopSummary(req.file.buffer);
  }

  const workshop = await prisma.workshop.create({
    data: {
      title,
      speaker,
      room,
      totalSeats: Number(totalSeats),
      availableSeats: Number(totalSeats),
      price: Number(price),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      summary
    }
  });

  res.json(workshop);
});

// Register for workshop (Student)
// Rate limited: 5 requests per 10 seconds per IP
router.post('/:id/register', rateLimiter(5, 0.5), idempotency, async (req, res) => {
  const workshopId = req.params.id as string;
  const { userId, paymentToken } = req.body; // In real app, userId from JWT

  try {
    // 1. Transaction with Pessimistic Locking
    const result = await prisma.$transaction(async (tx) => {
      // Lock the row
      const workshop = await tx.$queryRaw<any[]>`
        SELECT * FROM "Workshop" WHERE id = ${workshopId} FOR UPDATE
      `;

      if (!workshop.length) {
        throw new Error('Workshop not found');
      }

      const ws = workshop[0];

      if (ws.availableSeats <= 0) {
        throw new Error('Workshop is full');
      }

      // Check if already registered
      const existing = await tx.registration.findUnique({
        where: { userId_workshopId: { userId, workshopId } }
      });

      if (existing) {
        throw new Error('Already registered');
      }

      // 2. Process Payment if not free
      if (ws.price > 0) {
        if (!paymentToken) throw new Error('Payment token required');
        
        // Will throw if circuit breaker is open or payment fails
        await paymentCircuitBreaker.fire(userId, ws.price, paymentToken);
      }

      // 3. Update seats and create registration
      await tx.workshop.update({
        where: { id: workshopId },
        data: { availableSeats: { decrement: 1 } }
      });

      const qrCode = uuidv4();
      
      const registration = await tx.registration.create({
        data: {
          userId,
          workshopId,
          qrCode,
          status: 'SUCCESS'
        }
      });

      return registration;
    });

    res.json({ success: true, registration: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
