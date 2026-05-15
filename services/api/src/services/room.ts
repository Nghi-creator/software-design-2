import { Pagination, SortOrder } from '../lib/listQuery';
import {
  createRoom as createRoomRecord,
  deleteRoom as deleteRoomRecord,
  findRooms,
  RoomInput,
  updateRoom as updateRoomRecord
} from '../repositories/roomRepository';

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
}: ListRoomsOptions) => {
  validateCapacityRange(minCapacity, maxCapacity);
  const orderBy = resolveRoomSortColumn(sortBy);

  return findRooms({ q, location, minCapacity, maxCapacity, sortBy: orderBy, sortOrder, pagination });
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
  return createRoomRecord({ name, location, capacity });
};

export const updateRoom = async (id: string, { name, location, capacity }: RoomInput) => {
  const room = await updateRoomRecord(id, { name, location, capacity });

  if (!room) {
    throw new Error('Room not found');
  }

  return room;
};

export const deleteRoom = async (id: string) => {
  const wasDeleted = await deleteRoomRecord(id);

  if (!wasDeleted) {
    throw new Error('Room not found');
  }
};
