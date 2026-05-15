import assert from 'node:assert/strict';
import test from 'node:test';
import { listRooms } from '../src/services/room';
import { listWorkshops } from '../src/services/workshop';

test('room browse validation rejects invalid sort and capacity range before repository access', async () => {
  await assert.rejects(
    () => listRooms({
      sortBy: 'createdAt',
      sortOrder: 'asc',
      pagination: { page: 1, pageSize: 20 }
    }),
    /sortBy must be one of name, location, capacity/
  );

  await assert.rejects(
    () => listRooms({
      minCapacity: 50,
      maxCapacity: 10,
      sortOrder: 'asc',
      pagination: { page: 1, pageSize: 20 }
    }),
    /minCapacity must be less than or equal to maxCapacity/
  );
});

test('workshop browse validation rejects invalid sort and filter ranges before repository access', async () => {
  await assert.rejects(
    () => listWorkshops({
      sortBy: 'createdAt',
      sortOrder: 'asc',
      pagination: { page: 1, pageSize: 20 }
    }),
    /sortBy must be one of startTime, title, speaker, price, capacity, seatsRemaining/
  );

  await assert.rejects(
    () => listWorkshops({
      minPrice: 100,
      maxPrice: 10,
      sortOrder: 'asc',
      pagination: { page: 1, pageSize: 20 }
    }),
    /minPrice must be less than or equal to maxPrice/
  );

  await assert.rejects(
    () => listWorkshops({
      startsFrom: new Date('2026-05-16T00:00:00.000Z'),
      startsTo: new Date('2026-05-15T00:00:00.000Z'),
      sortOrder: 'asc',
      pagination: { page: 1, pageSize: 20 }
    }),
    /startsFrom must be before or equal to startsTo/
  );
});
