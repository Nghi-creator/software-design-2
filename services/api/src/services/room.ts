import { query } from '../lib/db';

type RoomInput = {
  name: string;
  location: string;
  capacity: number;
};

export const listRooms = () => {
  return query('select id, name, location, capacity from rooms order by name asc')
    .then((result) => result.rows);
};

export const createRoom = ({ name, location, capacity }: RoomInput) => {
  return query(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id, name, location, capacity',
    [name, location, capacity]
  ).then((result) => result.rows[0]);
};

export const updateRoom = (id: string, { name, location, capacity }: RoomInput) => {
  return query(
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
  return query('delete from rooms where id = $1 returning id', [id])
    .then((result) => {
      if (!result.rows[0]) {
        throw new Error('Room not found');
      }
    });
};
