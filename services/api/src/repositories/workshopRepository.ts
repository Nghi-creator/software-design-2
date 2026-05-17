import { query } from '../lib/db';
import { PaginatedResult, Pagination, SortOrder, toPaginatedResult } from '../lib/listQuery';

export type Workshop = {
  id: string;
  title: string;
  speaker: string;
  roomId: string;
  capacity: number;
  seatsRemaining: number;
  price: number;
  startTime: string;
  pdfUrl: string | null;
  aiSummary: string | null;
  room?: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    layoutUrl: string | null;
  };
};

type WorkshopRow = Omit<Workshop, 'price' | 'startTime' | 'room'> & {
  price: string;
  startTime: Date;
  room?: Workshop['room'];
};

export type ListWorkshopsQuery = {
  q?: string;
  roomId?: string;
  minPrice?: number;
  maxPrice?: number;
  startsFrom?: Date;
  startsTo?: Date;
  hasSeats?: boolean;
  sortBy: string;
  sortOrder: SortOrder;
  pagination: Pagination;
};

export type WorkshopSummaryStatusRow = {
  id: string;
  pdfUrl: string | null;
  aiSummary: string | null;
};

export type WorkshopUpdateInput = {
  title: string;
  speaker: string;
  roomId: string;
  capacity: number;
  seatsRemaining: number;
  price: number;
  startTime: Date;
  pdfUrl?: string | null;
};

export const findWorkshops = async ({
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
}: ListWorkshopsQuery): Promise<PaginatedResult<Workshop>> => {
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
  const offset = (pagination.page - 1) * pagination.pageSize;

  values.push(pagination.pageSize, offset);

  const [itemsResult, countResult] = await Promise.all([
    query<WorkshopRow>(
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
            'capacity', r.capacity,
            'layoutUrl', r.layout_url
          ) as room
        from workshops w
        join rooms r on r.id = w.room_id
        ${whereClause}
        order by ${sortBy} ${sortOrder}
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

  return toPaginatedResult(itemsResult.rows.map(mapWorkshopRow), Number(countResult.rows[0].totalItems), pagination);
};

export const createWorkshop = ({
  title,
  speaker,
  roomId,
  capacity,
  price,
  startTime,
  pdfUrl,
  aiSummary
}: {
  title: string;
  speaker: string;
  roomId: string;
  capacity: number;
  price: number;
  startTime: Date;
  pdfUrl?: string;
  aiSummary: string | null;
}) => {
  return query<WorkshopRow>(
    `
      insert into workshops (
        title, speaker, room_id, capacity, seats_remaining, price, start_time, pdf_url, ai_summary
      )
      values ($1, $2, $3, $4, $4, $5, $6, $7, $8)
      returning
        id, title, speaker, room_id as "roomId", capacity, seats_remaining as "seatsRemaining",
        price, start_time as "startTime", pdf_url as "pdfUrl", ai_summary as "aiSummary"
    `,
    [title, speaker, roomId, capacity, price, startTime, pdfUrl, aiSummary]
  ).then((result) => mapWorkshopRow(result.rows[0]));
};

export const findWorkshopById = async (workshopId: string) => {
  const result = await query<WorkshopRow>(
    `
      select
        id,
        title,
        speaker,
        room_id as "roomId",
        capacity,
        seats_remaining as "seatsRemaining",
        price,
        start_time as "startTime",
        pdf_url as "pdfUrl",
        ai_summary as "aiSummary"
      from workshops
      where id = $1
    `,
    [workshopId]
  );

  return result.rows[0] ? mapWorkshopRow(result.rows[0]) : null;
};

export const updateWorkshop = (
  workshopId: string,
  { title, speaker, roomId, capacity, seatsRemaining, price, startTime, pdfUrl }: WorkshopUpdateInput
) => {
  return query<WorkshopRow>(
    `
      update workshops
      set
        title = $2,
        speaker = $3,
        room_id = $4,
        capacity = $5,
        seats_remaining = $6,
        price = $7,
        start_time = $8,
        pdf_url = $9,
        updated_at = now()
      where id = $1
      returning
        id, title, speaker, room_id as "roomId", capacity, seats_remaining as "seatsRemaining",
        price, start_time as "startTime", pdf_url as "pdfUrl", ai_summary as "aiSummary"
    `,
    [workshopId, title, speaker, roomId, capacity, seatsRemaining, price, startTime, pdfUrl]
  ).then((result) => result.rows[0] ? mapWorkshopRow(result.rows[0]) : null);
};

export const deleteWorkshop = async (workshopId: string) => {
  try {
    const result = await query<{ id: string }>('delete from workshops where id = $1 returning id', [workshopId]);
    return Boolean(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23503') {
      throw Object.assign(new Error('Workshop has existing registrations'), { statusCode: 409 });
    }

    throw error;
  }
};

export const findWorkshopSummaryStatus = async (workshopId: string) => {
  const result = await query<WorkshopSummaryStatusRow>(
    `
      select id, pdf_url as "pdfUrl", ai_summary as "aiSummary"
      from workshops
      where id = $1
    `,
    [workshopId]
  );

  return result.rows[0] ?? null;
};

const mapWorkshopRow = (row: WorkshopRow): Workshop => ({
  ...row,
  price: Number(row.price),
  startTime: row.startTime.toISOString()
});
