import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoomListQuery, parseWorkshopListQuery } from '../../../src/lib/browseQuery';

test('room browse query uses pagination and sort defaults', () => {
  const query = parseRoomListQuery({});

  assert.deepEqual(query, {
    q: undefined,
    location: undefined,
    minCapacity: undefined,
    maxCapacity: undefined,
    sortBy: undefined,
    sortOrder: 'asc',
    pagination: { page: 1, pageSize: 20 }
  });
});

test('workshop browse query uses pagination and sort defaults', () => {
  const query = parseWorkshopListQuery({});

  assert.deepEqual(query, {
    q: undefined,
    roomId: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    startsFrom: undefined,
    startsTo: undefined,
    hasSeats: undefined,
    sortBy: undefined,
    sortOrder: 'asc',
    pagination: { page: 1, pageSize: 20 }
  });
});

test('room browse query rejects invalid pagination params', () => {
  assert.throws(
    () => parseRoomListQuery({ page: '0' }),
    /page must be a positive integer/
  );

  assert.throws(
    () => parseRoomListQuery({ pageSize: '101' }),
    /pageSize must be less than or equal to 100/
  );
});

test('workshop browse query rejects invalid typed params', () => {
  assert.throws(
    () => parseWorkshopListQuery({ minPrice: 'free' }),
    /minPrice must be a number/
  );

  assert.throws(
    () => parseWorkshopListQuery({ hasSeats: 'yes' }),
    /hasSeats must be true or false/
  );

  assert.throws(
    () => parseWorkshopListQuery({ startsFrom: 'not-a-date' }),
    /startsFrom must be a valid date/
  );
});
