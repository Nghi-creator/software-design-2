import { Role } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';

const roles = new Set<string>(Object.values(Role));

export const attachUser = (req: Request, _res: Response, next: NextFunction) => {
  const id = req.header('x-user-id') ?? req.body?.userId;
  const roleHeader = req.header('x-user-role') ?? req.body?.role ?? Role.STUDENT;
  const role = roles.has(roleHeader) ? (roleHeader as Role) : Role.STUDENT;

  if (id) {
    req.user = { id, role };
  }

  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  next();
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    next();
  };
};
