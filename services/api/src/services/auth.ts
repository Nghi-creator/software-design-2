import crypto from 'crypto';
import { promisify } from 'util';
import { Role, Roles, roleValues } from '../types/domain';
import { RequestUser } from '../types/request';
import {
  AuthUserRow,
  createUser,
  findUserByEmail,
  findUserById
} from '../repositories/authRepository';

const scrypt = promisify(crypto.scrypt);
const tokenTtlSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 24);
const roles = new Set<string>(roleValues);

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId: string | null;
};

type RegisterInput = {
  email: string;
  password: string;
  name: string;
  role?: string;
  studentId?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw Object.assign(new Error('JWT_SECRET must be at least 32 characters'), { statusCode: 500 });
  }

  return secret;
};

const toAuthUser = (row: AuthUserRow): AuthUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  studentId: row.student_id
});

const base64UrlEncode = (value: Buffer | string) => {
  return Buffer.from(value).toString('base64url');
};

const base64UrlJson = (value: unknown) => {
  return base64UrlEncode(JSON.stringify(value));
};

const sign = (value: string) => {
  return crypto.createHmac('sha256', getJwtSecret()).update(value).digest('base64url');
};

const createAccessToken = (user: AuthUser) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlJson({
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + tokenTtlSeconds
  });
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
};

const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
};

const verifyPassword = async (password: string, storedHash: string | null) => {
  if (!storedHash) {
    return false;
  }

  const [algorithm, salt, hash] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'base64url');

  return expected.length === derivedKey.length && crypto.timingSafeEqual(expected, derivedKey);
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const validatePassword = (password: string) => {
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { statusCode: 400 });
  }
};

const resolveRole = (role?: string): Role => {
  if (!role) {
    return Roles.STUDENT;
  }

  if (!roles.has(role)) {
    throw Object.assign(new Error('Invalid role'), { statusCode: 400 });
  }

  if (role !== Roles.STUDENT && process.env.AUTH_ALLOW_ROLE_REGISTRATION !== 'true') {
    throw Object.assign(new Error('Elevated roles cannot self-register'), { statusCode: 403 });
  }

  return role as Role;
};

export const register = async ({ email, password, name, role, studentId }: RegisterInput) => {
  const normalizedEmail = normalizeEmail(email);
  validatePassword(password);

  if (!normalizedEmail || !name?.trim()) {
    throw Object.assign(new Error('Email and name are required'), { statusCode: 400 });
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = toAuthUser(await createUser({
      email: normalizedEmail,
      name: name.trim(),
      role: resolveRole(role),
      studentId: studentId || null,
      passwordHash
    }));

    return { user, accessToken: createAccessToken(user) };
  } catch (error: any) {
    if (error.code === '23505') {
      throw Object.assign(new Error('Email or student ID already exists'), { statusCode: 409 });
    }

    throw error;
  }
};

export const login = async ({ email, password }: LoginInput) => {
  const userRow = await findUserByEmail(normalizeEmail(email));

  if (!userRow || !(await verifyPassword(password, userRow.password_hash))) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const user = toAuthUser(userRow);

  return { user, accessToken: createAccessToken(user) };
};

export const getCurrentUser = async (id: string) => {
  const userRow = await findUserById(id);

  if (!userRow) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return toAuthUser(userRow);
};

export const verifyAccessToken = async (token: string): Promise<RequestUser> => {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    throw new Error('Malformed token');
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = sign(unsignedToken);
  const actual = Buffer.from(signature, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');

  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    throw new Error('Invalid token signature');
  }

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub?: string;
    role?: string;
    exp?: number;
  };

  if (!claims.sub || !claims.role || !roles.has(claims.role)) {
    throw new Error('Invalid token claims');
  }

  if (!claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  const user = await findUserById(claims.sub);

  if (!user || user.role !== claims.role) {
    throw new Error('User no longer valid');
  }

  return { id: user.id, role: user.role };
};
