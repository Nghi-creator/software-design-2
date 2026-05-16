import { query } from '../lib/db';
import { PaginatedResult, Pagination, SortOrder, toPaginatedResult } from '../lib/listQuery';

export type RoomInput = {
  name: string;
  location: string;
  capacity: number;
  layoutUrl?: string | null;
};

export type Room = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  layoutUrl: string | null;
};

export type ListRoomsQuery = {
  q?: string;
  location?: string;
  minCapacity?: number;
  maxCapacity?: number;
  sortBy: string;
  sortOrder: SortOrder;
  pagination: Pagination;
};

export const findRooms = async ({
  q,
  location,
  minCapacity,
  maxCapacity,
  sortBy,
  sortOrder,
  pagination
}: ListRoomsQuery): Promise<PaginatedResult<Room>> => {
  const values: unknown[] = [];
  const filters: string[] = [];

  if (q) {
    values.push(`%${q}%`);
    filters.push(`(name ilike $${values.length} or location ilike $${values.length})`);
  }

  if (location) {
    values.push(location);
    filters.push(`location ilike $${values.length}`);
  }

  if (minCapacity !== undefined) {
    values.push(minCapacity);
    filters.push(`capacity >= $${values.length}`);
  }

  if (maxCapacity !== undefined) {
    values.push(maxCapacity);
    filters.push(`capacity <= $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `where ${filters.join(' and ')}` : '';
  const offset = (pagination.page - 1) * pagination.pageSize;

  values.push(pagination.pageSize, offset);

  const [itemsResult, countResult] = await Promise.all([
    query<Room>(
      `
        select id, name, location, capacity, layout_url as "layoutUrl"
        from rooms
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
        from rooms
        ${whereClause}
      `,
      values.slice(0, -2)
    )
  ]);

  return toPaginatedResult(itemsResult.rows, Number(countResult.rows[0].totalItems), pagination);
};

export const createRoom = ({ name, location, capacity, layoutUrl }: RoomInput) => {
  return query<Room>(
    'insert into rooms (name, location, capacity, layout_url) values ($1, $2, $3, $4) returning id, name, location, capacity, layout_url as "layoutUrl"',
    [name, location, capacity, layoutUrl ?? null]
  ).then((result) => result.rows[0]);
};

export const updateRoom = (id: string, { name, location, capacity, layoutUrl }: RoomInput) => {
  return query<Room>(
    'update rooms set name = $2, location = $3, capacity = $4, layout_url = $5 where id = $1 returning id, name, location, capacity, layout_url as "layoutUrl"',
    [id, name, location, capacity, layoutUrl ?? null]
  ).then((result) => result.rows[0] ?? null);
};

export const deleteRoom = (id: string) => {
  return query<{ id: string }>('delete from rooms where id = $1 returning id', [id])
    .then((result) => Boolean(result.rows[0]));
};
