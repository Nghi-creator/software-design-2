import { Request, Response } from 'express';
import { createRoom, deleteRoom, listRooms, updateRoom } from '../services/room';

export const getRooms = async (_req: Request, res: Response) => {
  const rooms = await listRooms();
  res.json(rooms);
};

export const postRoom = async (req: Request, res: Response) => {
  const { name, location, capacity } = req.body;

  try {
    const room = await createRoom({ name, location, capacity: Number(capacity) });
    res.status(201).json(room);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const putRoom = async (req: Request, res: Response) => {
  const { name, location, capacity } = req.body;

  try {
    const room = await updateRoom(req.params.id as string, {
      name,
      location,
      capacity: Number(capacity)
    });

    res.json(room);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
};

export const deleteRoomById = async (req: Request, res: Response) => {
  try {
    await deleteRoom(req.params.id as string);
    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
};
