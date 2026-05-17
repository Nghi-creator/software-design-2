import { Pagination, toPaginatedResult } from '../lib/listQuery';
import {
  findStudentNotifications,
  markStudentNotificationRead
} from '../repositories/notificationRepository';
import { StudentNotification } from '../types/notification';

type StudentNotificationDependencies = {
  findNotifications: typeof findStudentNotifications;
  markRead: (input: {
    notificationId: string;
    userId: string;
  }) => Promise<StudentNotification | undefined>;
};

const defaultDependencies: StudentNotificationDependencies = {
  findNotifications: findStudentNotifications,
  markRead: markStudentNotificationRead
};

export const getStudentNotifications = async (
  userId: string,
  pagination: Pagination,
  dependencies: StudentNotificationDependencies = defaultDependencies
) => {
  const offset = (pagination.page - 1) * pagination.pageSize;
  const result = await dependencies.findNotifications({
    userId,
    limit: pagination.pageSize,
    offset
  });

  return toPaginatedResult(result.items, result.totalItems, pagination);
};

export const readStudentNotification = async (
  userId: string,
  notificationId: string,
  dependencies: StudentNotificationDependencies = defaultDependencies
) => {
  const notification = await dependencies.markRead({ userId, notificationId });

  if (!notification) {
    throw Object.assign(new Error('Notification not found'), { statusCode: 404 });
  }

  return notification;
};
