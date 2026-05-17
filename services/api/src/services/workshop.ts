import { Pagination, SortOrder } from '../lib/listQuery';
import {
  createWorkshop as createWorkshopRecord,
  deleteWorkshop as deleteWorkshopRecord,
  findWorkshopById,
  findWorkshopSummaryStatus,
  findWorkshops,
  updateWorkshop as updateWorkshopRecord
} from '../repositories/workshopRepository';
import { findWorkshopStats } from '../repositories/workshopStatsRepository';
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

type UpdateWorkshopInput = CreateWorkshopInput;

type ListWorkshopsOptions = {
  q?: string;
  roomId?: string;
  minPrice?: number;
  maxPrice?: number;
  startsFrom?: Date;
  startsTo?: Date;
  hasSeats?: boolean;
  sortBy?: string;
  sortOrder: SortOrder;
  pagination: Pagination;
};

const workshopSortColumns: Record<string, string> = {
  startTime: 'w.start_time',
  title: 'w.title',
  speaker: 'w.speaker',
  price: 'w.price',
  capacity: 'w.capacity',
  seatsRemaining: 'w.seats_remaining'
};

export const listWorkshops = async ({
  q,
  roomId,
  minPrice,
  maxPrice,
  startsFrom,
  startsTo,
  hasSeats,
  sortBy,
  sortOrder,
  pagination
}: ListWorkshopsOptions) => {
  validateWorkshopFilters(minPrice, maxPrice, startsFrom, startsTo);
  const orderBy = resolveWorkshopSortColumn(sortBy);

  return findWorkshops({
    q,
    roomId,
    minPrice,
    maxPrice,
    startsFrom,
    startsTo,
    hasSeats,
    sortBy: orderBy,
    sortOrder,
    pagination
  });
};

const resolveWorkshopSortColumn = (sortBy?: string) => {
  if (!sortBy) {
    return workshopSortColumns.startTime;
  }

  const sortColumn = workshopSortColumns[sortBy];

  if (!sortColumn) {
    throw new Error('sortBy must be one of startTime, title, speaker, price, capacity, seatsRemaining');
  }

  return sortColumn;
};

const validateWorkshopFilters = (
  minPrice?: number,
  maxPrice?: number,
  startsFrom?: Date,
  startsTo?: Date
) => {
  if (minPrice !== undefined && minPrice < 0) {
    throw new Error('minPrice must be greater than or equal to 0');
  }

  if (maxPrice !== undefined && maxPrice < 0) {
    throw new Error('maxPrice must be greater than or equal to 0');
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new Error('minPrice must be less than or equal to maxPrice');
  }

  if (startsFrom && startsTo && startsFrom > startsTo) {
    throw new Error('startsFrom must be before or equal to startsTo');
  }
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
  validateWorkshopInput({ title, speaker, roomId, capacity, price, startTime });

  const aiSummary = pdfBuffer ? await generateWorkshopSummary(pdfBuffer) : null;

  return createWorkshopRecord({
    title,
    speaker,
    roomId,
    capacity,
    price: price ?? 0,
    startTime: new Date(startTime),
    pdfUrl,
    aiSummary
  });
};

export const updateWorkshop = async (
  workshopId: string,
  { title, speaker, roomId, capacity, price, startTime, pdfUrl, pdfBuffer }: UpdateWorkshopInput
) => {
  const currentWorkshop = await findWorkshopById(workshopId);

  if (!currentWorkshop) {
    throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
  }

  validateWorkshopInput({ title, speaker, roomId, capacity, price, startTime });

  const reservedSeatCount = currentWorkshop.capacity - currentWorkshop.seatsRemaining;

  if (capacity < reservedSeatCount) {
    throw Object.assign(new Error('capacity cannot be less than reserved seat count'), { statusCode: 409 });
  }

  const aiSummary = pdfBuffer ? await generateWorkshopSummary(pdfBuffer) : currentWorkshop.aiSummary;

  return updateWorkshopRecord(workshopId, {
    title,
    speaker,
    roomId,
    capacity,
    seatsRemaining: capacity - reservedSeatCount,
    price: price ?? 0,
    startTime: new Date(startTime),
    pdfUrl: pdfUrl === undefined ? currentWorkshop.pdfUrl : pdfUrl,
    aiSummary
  });
};

export const deleteWorkshop = async (workshopId: string) => {
  const wasDeleted = await deleteWorkshopRecord(workshopId);

  if (!wasDeleted) {
    throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
  }
};

export const getWorkshopStats = async (workshopId: string) => {
  const stats = await findWorkshopStats(workshopId);

  if (!stats) {
    throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
  }

  return {
    workshopId: stats.workshopId,
    capacity: stats.capacity,
    seatsRemaining: stats.seatsRemaining,
    registrations: {
      pending: Number(stats.pendingRegistrations),
      confirmed: Number(stats.confirmedRegistrations),
      cancelled: Number(stats.cancelledRegistrations)
    },
    checkedInCount: Number(stats.checkedInCount),
    successfulPaymentCount: Number(stats.successfulPaymentCount)
  };
};

export const getWorkshopSummaryStatus = async (workshopId: string) => {
  const workshop = await findWorkshopSummaryStatus(workshopId);

  if (!workshop) {
    throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
  }

  return {
    workshopId: workshop.id,
    status: workshop.aiSummary ? 'ready' : workshop.pdfUrl ? 'processing' : 'not_uploaded',
    pdfUrl: workshop.pdfUrl
  };
};

export const validateWorkshopInput = ({
  title,
  speaker,
  roomId,
  capacity,
  price,
  startTime
}: Omit<UpdateWorkshopInput, 'pdfUrl'>) => {
  if (!title || !speaker || !roomId || !startTime) {
    throw Object.assign(new Error('title, speaker, roomId, and startTime are required'), { statusCode: 400 });
  }

  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw Object.assign(new Error('capacity must be greater than 0'), { statusCode: 400 });
  }

  if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
    throw Object.assign(new Error('price must be greater than or equal to 0'), { statusCode: 400 });
  }

  if (Number.isNaN(new Date(startTime).getTime())) {
    throw Object.assign(new Error('startTime must be a valid date'), { statusCode: 400 });
  }
};
