import { prisma } from '../lib/prisma';
import { generateWorkshopSummary } from './ai';

type CreateWorkshopInput = {
  title: string;
  speaker: string;
  roomId: string;
  capacity: number;
  price?: number;
  startTime: string;
  pdfUrl?: string;
  pdfBuffer?: Buffer;
};

export const listWorkshops = () => {
  return prisma.workshop.findMany({
    include: { room: true },
    orderBy: { startTime: 'asc' }
  });
};

export const createWorkshop = async ({
  title,
  speaker,
  roomId,
  capacity,
  price,
  startTime,
  pdfUrl,
  pdfBuffer
}: CreateWorkshopInput) => {
  const aiSummary = pdfBuffer ? await generateWorkshopSummary(pdfBuffer) : null;

  return prisma.workshop.create({
    data: {
      title,
      speaker,
      roomId,
      capacity,
      seatsRemaining: capacity,
      price: price ?? 0,
      startTime: new Date(startTime),
      pdfUrl,
      aiSummary
    }
  });
};
