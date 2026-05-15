import { query } from '../lib/db';
import {
  PaginatedResult,
  Pagination,
  SortOrder,
  toPaginatedResult
} from '../lib/listQuery';

type RoomInput = {
  name: string;
  location: string;
  capacity: number;
};

type Room = {
  id: string;
  name: string;
  location: string;
  capacity: number;
};

type ListRoomsOptions = {
  q?: string;
  location?: string;
  minCapacity?: number;
  maxCapacity?: number;
  sortBy?: string;
  sortOrder: SortOrder;
  pagination: Pagination;
};

const roomSortColumns: Record<string, string> = {
  name: 'name',
  location: 'location',
  capacity: 'capacity'
};

export const listRooms = async ({
  q,
  location,
  minCapacity,
  maxCapacity,
  sortBy,
  sortOrder,
  pagination
}: ListRoomsOptions): Promise<PaginatedResult<Room>> => {
  validateCapacityRange(minCapacity, maxCapacity);

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
  const orderBy = resolveRoomSortColumn(sortBy);
  const offset = (pagination.page - 1) * pagination.pageSize;

  values.push(pagination.pageSize, offset);

  const [itemsResult, countResult] = await Promise.all([
    query<Room>(
      `
        select id, name, location, capacity
        from rooms
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
        from rooms
        ${whereClause}
      `,
      values.slice(0, -2)
    )
  ]);

  return toPaginatedResult(itemsResult.rows, Number(countResult.rows[0].totalItems), pagination);
};

const resolveRoomSortColumn = (sortBy?: string) => {
  if (!sortBy) {
    return roomSortColumns.name;
  }

  const sortColumn = roomSortColumns[sortBy];

  if (!sortColumn) {
    throw new Error('sortBy must be one of name, location, capacity');
  }

  return sortColumn;
};

const validateCapacityRange = (minCapacity?: number, maxCapacity?: number) => {
  if (minCapacity !== undefined && minCapacity < 0) {
    throw new Error('minCapacity must be greater than or equal to 0');
  }

  if (maxCapacity !== undefined && maxCapacity < 0) {
    throw new Error('maxCapacity must be greater than or equal to 0');
  }

  if (minCapacity !== undefined && maxCapacity !== undefined && minCapacity > maxCapacity) {
    throw new Error('minCapacity must be less than or equal to maxCapacity');
  }
};

export const createRoom = ({ name, location, capacity }: RoomInput) => {
  return query<Room>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id, name, location, capacity',
    [name, location, capacity]
  ).then((result) => result.rows[0]);
};

export const updateRoom = (id: string, { name, location, capacity }: RoomInput) => {
  return query<Room>(
    'update rooms set name = $2, location = $3, capacity = $4 where id = $1 returning id, name, location, capacity',
    [id, name, location, capacity]
  ).then((result) => {
    if (!result.rows[0]) {
      throw new Error('Room not found');
    }

    return result.rows[0];
  });
};

export const deleteRoom = (id: string) => {
  return query<{ id: string }>('delete from rooms where id = $1 returning id', [id])
    .then((result) => {
      if (!result.rows[0]) {
        throw new Error('Room not found');
      }
    });
};
