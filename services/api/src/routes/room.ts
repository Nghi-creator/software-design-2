import { Role } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', async (_req, res) => {
  const rooms = await prisma.room.findMany({
    orderBy: { name: 'asc' }
  });

  res.json(rooms);
});

router.post('/', requireRole(Role.ORGANIZER), async (req, res) => {
  const { name, location, capacity } = req.body;

  try {
    const room = await prisma.room.create({
      data: {
        name,
        location,
        capacity: Number(capacity)
      }
    });

    res.status(201).json(room);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireRole(Role.ORGANIZER), async (req, res) => {
  const { name, location, capacity } = req.body;
  const roomId = req.params.id as string;

  try {
    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        name,
        location,
        capacity: Number(capacity)
      }
    });

    res.json(room);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

router.delete('/:id', requireRole(Role.ORGANIZER), async (req, res) => {
  const roomId = req.params.id as string;

  try {
    await prisma.room.delete({
      where: { id: roomId }
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

export default router;
