import assert from 'node:assert/strict';
import test from 'node:test';
import { attachUser, requireAuth, requireRole } from '../src/middleware/auth';
import { Roles } from '../src/types/domain';

test('attachUser authenticates trusted header users and defaults unknown roles to student', async () => {
  const trustedHeaderRequest = createRequest({
    'x-user-id': 'user-1',
    'x-user-role': Roles.ORGANIZER
  });
  const trustedHeaderNext = createNext();

  await attachUser(trustedHeaderRequest.req as any, createResponse() as any, trustedHeaderNext as any);

  assert.deepEqual((trustedHeaderRequest.req as any).user, {
    id: 'user-1',
    role: Roles.ORGANIZER
  });
  assert.equal(trustedHeaderNext.called, true);

  const unknownRoleRequest = createRequest({
    'x-user-id': 'user-2',
    'x-user-role': 'SUPER_ADMIN'
  });
  const unknownRoleNext = createNext();

  await attachUser(unknownRoleRequest.req as any, createResponse() as any, unknownRoleNext as any);

  assert.deepEqual((unknownRoleRequest.req as any).user, {
    id: 'user-2',
    role: Roles.STUDENT
  });
  assert.equal(unknownRoleNext.called, true);
});

test('requireAuth rejects unauthenticated requests', () => {
  const req = createRequest().req;
  const res = createResponse();
  const next = createNext();

  requireAuth(req as any, res as any, next as any);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Authentication required'
  });
  assert.equal(next.called, false);
});

test('requireAuth allows authenticated requests', () => {
  const req = createRequest().req as any;
  req.user = { id: 'user-1', role: Roles.STUDENT };
  const res = createResponse();
  const next = createNext();

  requireAuth(req, res as any, next as any);

  assert.equal(next.called, true);
  assert.equal(res.body, undefined);
});

test('requireRole rejects missing users and users without an allowed role', () => {
  const staffOnly = requireRole(Roles.CHECKIN_STAFF);

  const unauthenticatedRequest = createRequest().req;
  const unauthenticatedResponse = createResponse();
  const unauthenticatedNext = createNext();

  staffOnly(
    unauthenticatedRequest as any,
    unauthenticatedResponse as any,
    unauthenticatedNext as any
  );

  assert.equal(unauthenticatedResponse.statusCode, 401);
  assert.deepEqual(unauthenticatedResponse.body, {
    success: false,
    error: 'Authentication required'
  });
  assert.equal(unauthenticatedNext.called, false);

  const studentRequest = createRequest().req as any;
  studentRequest.user = { id: 'student-1', role: Roles.STUDENT };
  const studentResponse = createResponse();
  const studentNext = createNext();

  staffOnly(studentRequest, studentResponse as any, studentNext as any);

  assert.equal(studentResponse.statusCode, 403);
  assert.deepEqual(studentResponse.body, {
    success: false,
    error: 'Forbidden'
  });
  assert.equal(studentNext.called, false);
});

test('requireRole allows any explicitly permitted role', () => {
  const qrAccess = requireRole(Roles.STUDENT, Roles.ORGANIZER, Roles.CHECKIN_STAFF);

  for (const role of [Roles.STUDENT, Roles.ORGANIZER, Roles.CHECKIN_STAFF]) {
    const req = createRequest().req as any;
    req.user = { id: `${role.toLowerCase()}-1`, role };
    const res = createResponse();
    const next = createNext();

    qrAccess(req, res as any, next as any);

    assert.equal(next.called, true);
    assert.equal(res.body, undefined);
  }
});

const createRequest = (headers: Record<string, string> = {}) => ({
  req: {
    body: {},
    header(name: string) {
      return headers[name.toLowerCase()];
    }
  }
});

const createResponse = () => ({
  statusCode: 200,
  body: undefined as unknown,
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(body: unknown) {
    this.body = body;
    return this;
  }
});

const createNext = () => {
  const next = Object.assign(
    () => {
      next.called = true;
    },
    { called: false }
  );

  return next;
};
