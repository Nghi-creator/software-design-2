import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { AddressInfo } from 'node:net';
import app from '../src/app';
import { db, query } from '../src/lib/db';

const suffix = `browse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const roomIds: string[] = [];
const workshopIds: string[] = [];
let baseUrl = '';
let server: ReturnType<typeof app.listen>;
let workshopRoomId = '';

before(async () => {
  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const rooms = await Promise.all([
    createRoom(`Alpha ${suffix}`, `North ${suffix}`, 20),
    createRoom(`Beta ${suffix}`, `North ${suffix}`, 40),
    createRoom(`Gamma ${suffix}`, `North ${suffix}`, 60)
  ]);
  roomIds.push(...rooms.map((room) => room.id));

  workshopRoomId = rooms[0].id;
  const workshops = await Promise.all([
    createWorkshop(`Intro ${suffix}`, workshopRoomId, 25, 12, 0),
    createWorkshop(`Systems ${suffix}`, workshopRoomId, 35, 20, 50),
    createWorkshop(`Advanced ${suffix}`, workshopRoomId, 45, 0, 100)
  ]);
  workshopIds.push(...workshops.map((workshop) => workshop.id));
});

after(async () => {
  if (workshopIds.length > 0) {
    await query('delete from workshops where id = any($1::uuid[])', [workshopIds]);
  }

  if (roomIds.length > 0) {
    await query('delete from rooms where id = any($1::uuid[])', [roomIds]);
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await db?.end();
});

test('GET /api/rooms filters, sorts, and paginates live data', async () => {
  const response = await fetch(
    `${baseUrl}/api/rooms?q=${suffix}&sortBy=capacity&sortOrder=desc&page=1&pageSize=2`
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.items.map((room: { name: string; capacity: number }) => [room.name, room.capacity]),
    [
      [`Gamma ${suffix}`, 60],
      [`Beta ${suffix}`, 40]
    ]
  );
  assert.deepEqual(body.pagination, {
    page: 1,
    pageSize: 2,
    totalItems: 3,
    totalPages: 2
  });
});

test('GET /api/rooms returns 400 for invalid pagination', async () => {
  const response = await fetch(`${baseUrl}/api/rooms?pageSize=101`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /pageSize must be less than or equal to 100/);
});

test('GET /api/workshops filters, sorts, and paginates live data', async () => {
  const response = await fetch(
    `${baseUrl}/api/workshops?q=${suffix}&roomId=${workshopRoomId}&hasSeats=true&sortBy=price&sortOrder=desc&page=1&pageSize=1`
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.items.map((workshop: { title: string; price: string }) => [workshop.title, workshop.price]),
    [[`Systems ${suffix}`, '50.00']]
  );
  assert.equal(body.items[0].room.id, workshopRoomId);
  assert.deepEqual(body.pagination, {
    page: 1,
    pageSize: 1,
    totalItems: 2,
    totalPages: 2
  });
});

test('GET /api/workshops returns 400 for invalid typed params', async () => {
  const response = await fetch(`${baseUrl}/api/workshops?hasSeats=yes`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /hasSeats must be true or false/);
});

async function createRoom(name: string, location: string, capacity: number) {
  const result = await query<{ id: string }>(
    'insert into rooms (name, location, capacity) values ($1, $2, $3) returning id',
    [name, location, capacity]
  );

  return result.rows[0];
}

async function createWorkshop(
  title: string,
  roomId: string,
  capacity: number,
  seatsRemaining: number,
  price: number
) {
  const result = await query<{ id: string }>(
    `
      insert into workshops (
        title, speaker, room_id, capacity, seats_remaining, price, start_time
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [title, `Speaker ${suffix}`, roomId, capacity, seatsRemaining, price, new Date('2026-06-01T09:00:00.000Z')]
  );

  return result.rows[0];
}
