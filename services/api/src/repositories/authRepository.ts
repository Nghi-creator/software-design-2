import { query } from '../lib/db';
import { Role } from '../types/domain';

export type AuthUserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  student_id: string | null;
  password_hash: string | null;
};

export const findUserByEmail = async (email: string) => {
  const result = await query<AuthUserRow>(
    'select id, email, name, role, student_id, password_hash from users where email = $1',
    [email]
  );

  return result.rows[0] ?? null;
};

export const findUserById = async (id: string) => {
  const result = await query<AuthUserRow>(
    'select id, email, name, role, student_id, password_hash from users where id = $1',
    [id]
  );

  return result.rows[0] ?? null;
};

export const createUser = async ({
  email,
  name,
  role,
  studentId,
  passwordHash
}: {
  email: string;
  name: string;
  role: Role;
  studentId: string | null;
  passwordHash: string;
}) => {
  const result = await query<AuthUserRow>(
    `insert into users (email, name, role, student_id, password_hash)
     values ($1, $2, $3, $4, $5)
     returning id, email, name, role, student_id, password_hash`,
    [email, name, role, studentId, passwordHash]
  );

  return result.rows[0];
};
