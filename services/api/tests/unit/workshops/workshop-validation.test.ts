import assert from 'node:assert/strict';
import test from 'node:test';
import { validateWorkshopInput } from '../../../src/services/workshop';

const validInput = {
  title: 'Distributed Systems',
  speaker: 'Ada Lovelace',
  roomId: 'room-1',
  capacity: 30,
  price: 0,
  startTime: '2026-07-01T09:00:00.000Z'
};

test('workshop validation accepts a complete valid payload', () => {
  assert.doesNotThrow(() => validateWorkshopInput(validInput));
});

test('workshop validation requires core admin-managed fields', () => {
  assert.throws(
    () => validateWorkshopInput({ ...validInput, title: '' }),
    /title, speaker, roomId, and startTime are required/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, speaker: '' }),
    /title, speaker, roomId, and startTime are required/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, roomId: '' }),
    /title, speaker, roomId, and startTime are required/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, startTime: '' }),
    /title, speaker, roomId, and startTime are required/
  );
});

test('workshop validation rejects impossible capacity, price, and time values', () => {
  assert.throws(
    () => validateWorkshopInput({ ...validInput, capacity: 0 }),
    /capacity must be greater than 0/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, capacity: Number.NaN }),
    /capacity must be greater than 0/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, price: -1 }),
    /price must be greater than or equal to 0/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, price: Number.POSITIVE_INFINITY }),
    /price must be greater than or equal to 0/
  );
  assert.throws(
    () => validateWorkshopInput({ ...validInput, startTime: 'not-a-date' }),
    /startTime must be a valid date/
  );
});
