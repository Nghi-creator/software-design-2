import { Request, Response } from 'express';
import { getPaginationQuery } from '../lib/listQuery';
import {
  getStudentNotifications,
  readStudentNotification
} from '../services/studentNotifications';
import { getRequestUser } from '../types/request';

export const listStudentNotifications = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const notifications = await getStudentNotifications(user.id, getPaginationQuery(req.query));
    res.json({ success: true, ...notifications });
  } catch (error: any) {
    const statusCode = error.statusCode ?? (isValidationError(error) ? 400 : 500);
    res.status(statusCode).json({ success: false, error: error.message });
  }
};

export const markStudentNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    const notification = await readStudentNotification(user.id, req.params.id as string);
    res.json({ success: true, notification });
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ success: false, error: error.message });
  }
};

const isValidationError = (error: any) => (
  typeof error.message === 'string' &&
  (error.message.includes('page') || error.message.includes('pageSize'))
);
