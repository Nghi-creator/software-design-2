import { query } from '../lib/db';
import {
  PaginatedResult,
  Pagination,
  SortOrder,
  toPaginatedResult
} from '../lib/listQuery';
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

type Workshop = {
  id: string;
  title: string;
  speaker: string;
  roomId: string;
  capacity: number;
  seatsRemaining: number;
  price: string;
  startTime: Date;
  pdfUrl: string | null;
  aiSummary: string | null;
  room?: {
    id: string;
    name: string;
    location: string;
    capacity: number;
  };
};

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
}: ListWorkshopsOptions): Promise<PaginatedResult<Workshop>> => {
  validateWorkshopFilters(minPrice, maxPrice, startsFrom, startsTo);

  const values: unknown[] = [];
  const filters: string[] = [];

  if (q) {
    values.push(`%${q}%`);
    filters.push(`(w.title ilike $${values.length} or w.speaker ilike $${values.length})`);
  }

  if (roomId) {
    values.push(roomId);
    filters.push(`w.room_id = $${values.length}`);
  }

  if (minPrice !== undefined) {
    values.push(minPrice);
    filters.push(`w.price >= $${values.length}`);
  }

  if (maxPrice !== undefined) {
    values.push(maxPrice);
    filters.push(`w.price <= $${values.length}`);
  }

  if (startsFrom) {
    values.push(startsFrom);
    filters.push(`w.start_time >= $${values.length}`);
  }

  if (startsTo) {
    values.push(startsTo);
    filters.push(`w.start_time <= $${values.length}`);
  }

  if (hasSeats !== undefined) {
    filters.push(hasSeats ? 'w.seats_remaining > 0' : 'w.seats_remaining = 0');
  }

  const whereClause = filters.length > 0 ? `where ${filters.join(' and ')}` : '';
  const orderBy = resolveWorkshopSortColumn(sortBy);
  const offset = (pagination.page - 1) * pagination.pageSize;

  values.push(pagination.pageSize, offset);

  const [itemsResult, countResult] = await Promise.all([
    query<Workshop>(
      `
        select
          w.id,
          w.title,
          w.speaker,
          w.room_id as "roomId",
          w.capacity,
          w.seats_remaining as "seatsRemaining",
          w.price,
          w.start_time as "startTime",
          w.pdf_url as "pdfUrl",
          w.ai_summary as "aiSummary",
          json_build_object(
            'id', r.id,
            'name', r.name,
            'location', r.location,
            'capacity', r.capacity
          ) as room
        from workshops w
        join rooms r on r.id = w.room_id
        ${whereClause}
        order by ${orderBy} ${sortOrder}
        limit $${values.length - 1}
        offset $${values.length}
      `,
      values
    ),
    query<{ totalItems: string }>(
      `
        select count(*)::text as "totalItems"
        from workshops w
        ${whereClause}
      `,
      values.slice(0, -2)
    )
  ]);

  return toPaginatedResult(itemsResult.rows, Number(countResult.rows[0].totalItems), pagination);
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
  const aiSummary = pdfBuffer ? await generateWorkshopSummary(pdfBuffer) : null;

  return query<Workshop>(
    `
      insert into workshops (
        title, speaker, room_id, capacity, seats_remaining, price, start_time, pdf_url, ai_summary
      )
      values ($1, $2, $3, $4, $4, $5, $6, $7, $8)
      returning
        id, title, speaker, room_id as "roomId", capacity, seats_remaining as "seatsRemaining",
        price, start_time as "startTime", pdf_url as "pdfUrl", ai_summary as "aiSummary"
    `,
    [title, speaker, roomId, capacity, price ?? 0, new Date(startTime), pdfUrl, aiSummary]
  ).then((result) => result.rows[0]);
};
