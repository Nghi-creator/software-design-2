import assert from 'node:assert/strict';
import test from 'node:test';
import { Request, Response } from 'express';
import {
  validateCheckinPayload,
  validateCheckinSyncPayload,
  validateCsvImportErrorQuery,
  validateUuidParam
} from '../src/middleware/requestValidation';

test('check-in payload validation rejects missing qrCode', () => {
  const { req, res, nextCalled } = runMiddleware(validateCheckinPayload, {
    body: { qrCode: '   ' }
  });

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, error: 'qrCode is required' });
  assert.deepEqual(req.body, { qrCode: '   ' });
});

test('offline sync validation normalizes qrCodes compatibility payloads', () => {
  const { req, res, nextCalled } = runMiddleware(validateCheckinSyncPayload, {
    body: { qrCodes: ['qr-1', 'qr-2'] }
  });

  assert.equal(nextCalled(), true);
  assert.equal(res.statusCode, undefined);
  assert.deepEqual(req.body.items, [{ qrCode: 'qr-1' }, { qrCode: 'qr-2' }]);
});

test('offline sync validation rejects invalid item fields', () => {
  const { res, nextCalled } = runMiddleware(validateCheckinSyncPayload, {
    body: {
      items: [{ qrCode: 'qr-1', scannedAt: 'not-a-date' }]
    }
  });

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    error: 'items[0].scannedAt must be a valid date'
  });
});

test('UUID param validation rejects malformed route params', () => {
  const { res, nextCalled } = runMiddleware(validateUuidParam('id'), {
    params: { id: 'not-a-uuid' }
  });

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, error: 'Invalid id' });
});

test('CSV import error query validation rejects invalid pagination', () => {
  const { res, nextCalled } = runMiddleware(validateCsvImportErrorQuery, {
    query: { limit: '501', offset: '0' }
  });

  assert.equal(nextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    error: 'limit must be an integer from 1 to 500'
  });
});

const runMiddleware = (
  middleware: (req: Request, res: Response, next: () => void) => unknown,
  request: Partial<Request>
) => {
  let called = false;
  const req = request as Request;
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    }
  } as Response & { statusCode?: number; body?: unknown };

  middleware(req, res, () => {
    called = true;
  });

  return { req, res, nextCalled: () => called };
};
