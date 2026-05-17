import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getStudentNotifications,
  readStudentNotification
} from '../../../src/services/studentNotifications';
import { NotificationChannels, NotificationStatuses } from '../../../src/types/notification';

test('student notification list paginates repository results', async () => {
  const createdAt = new Date('2026-05-17T09:00:00.000Z');

  const result = await getStudentNotifications(
    'student-1',
    { page: 2, pageSize: 10 },
    {
      findNotifications: async (input) => {
        assert.deepEqual(input, { userId: 'student-1', limit: 10, offset: 10 });
        return {
          totalItems: 12,
          items: [
            {
              id: 'notification-1',
              userId: 'student-1',
              registrationId: 'registration-1',
              workshopId: 'workshop-1',
              channel: NotificationChannels.EMAIL,
              subject: 'Registration confirmed',
              body: 'You are confirmed.',
              status: NotificationStatuses.SENT,
              createdAt,
              sentAt: createdAt,
              readAt: null
            }
          ]
        };
      },
      markRead: async () => {
        throw new Error('markRead should not be called');
      }
    }
  );

  assert.equal(result.pagination.totalItems, 12);
  assert.equal(result.pagination.totalPages, 2);
  assert.equal(result.items[0].id, 'notification-1');
});

test('readStudentNotification rejects notifications outside the student account', async () => {
  await assert.rejects(
    readStudentNotification(
      'student-1',
      'notification-1',
      {
        findNotifications: async () => ({ items: [], totalItems: 0 }),
        markRead: async (input) => {
          assert.deepEqual(input, { userId: 'student-1', notificationId: 'notification-1' });
          return undefined;
        }
      }
    ),
    /Notification not found/
  );
});
