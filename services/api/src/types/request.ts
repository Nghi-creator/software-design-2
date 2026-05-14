import { Request } from 'express';
import { Role } from './domain';

export type RequestUser = {
  id: string;
  role: Role;
};

export type RequestWithUser = Request & {
  user?: RequestUser;
};

export const getRequestUser = (req: Request): RequestUser => {
  const user = (req as RequestWithUser).user;

  if (!user) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }

  return user;
};
