import { prisma } from '../lib/prisma';

type RoomInput = {
  name: string;
  location: string;
  capacity: number;
};

export const listRooms = () => {
  return prisma.room.findMany({
    orderBy: { name: 'asc' }
  });
};

export const createRoom = ({ name, location, capacity }: RoomInput) => {
  return prisma.room.create({
    data: {
      name,
      location,
      capacity
    }
  });
};

export const updateRoom = (id: string, { name, location, capacity }: RoomInput) => {
  return prisma.room.update({
    where: { id },
    data: {
      name,
      location,
      capacity
    }
  });
};

export const deleteRoom = (id: string) => {
  return prisma.room.delete({
    where: { id }
  });
};
