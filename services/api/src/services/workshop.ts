import { query } from '../lib/db';
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

export const listWorkshops = () => {
  return query<Workshop>(`
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
    order by w.start_time asc
  `).then((result) => result.rows);
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
