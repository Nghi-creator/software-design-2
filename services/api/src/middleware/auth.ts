import { NextFunction, Request, Response } from 'express';
import { Role, Roles, roleValues } from '../types/domain';
import { RequestWithUser } from '../types/request';

const roles = new Set<string>(roleValues);

export const attachUser = (req: Request, _res: Response, next: NextFunction) => {
  const id = req.header('x-user-id') ?? req.body?.userId;
  const roleHeader = req.header('x-user-role') ?? req.body?.role ?? Roles.STUDENT;
  const role = roles.has(roleHeader) ? (roleHeader as Role) : Roles.STUDENT;

  if (id) {
    (req as RequestWithUser).user = { id, role };
  }

  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as RequestWithUser).user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  next();
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    next();
  };
};
