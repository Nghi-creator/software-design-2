import { Request, Response } from 'express';
import { getStudentRegistrations } from '../services/registration';
import { getRequestUser } from '../types/request';

export const getMyRegistrations = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const registrations = await getStudentRegistrations(user.id);

    res.json({ success: true, items: registrations });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
};
