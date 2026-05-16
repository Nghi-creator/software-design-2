import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverRegistrationConfirmedNotification } from '../src/services/notifications';
import { NotificationChannels, NotificationStatuses } from '../src/types/notification';

const context = {
  registrationId: 'registration-1',
  userId: 'student-1',
  recipientName: 'Ada Lovelace',
  recipientEmail: 'ada@example.com',
  workshopTitle: 'Distributed Systems',
  workshopStartTime: new Date('2026-05-17T09:00:00.000Z')
};

test('registration confirmed notification composes content and sends through registered channel', async () => {
  const sentMessages: Array<{ subject: string; text: string }> = [];
  const markedSent: string[] = [];

  await deliverRegistrationConfirmedNotification(
    { registrationId: context.registrationId },
    {
      findContext: async () => context,
      findOrCreate: async ({ subject, body }) => {
        sentMessages.push({ subject, text: body });
        return { id: 'notification-1', status: NotificationStatuses.PENDING, attemptCount: 0 };
      },
      markSent: async (id) => {
        markedSent.push(id);
      },
      markFailed: async () => undefined,
      channels: [
        {
          channel: NotificationChannels.EMAIL,
          send: async (_notificationContext, content) => {
            sentMessages.push(content);
          }
        }
      ]
    }
  );

  assert.equal(sentMessages[0].subject, 'Registration confirmed: Distributed Systems');
  assert.match(sentMessages[0].text, /Ada Lovelace/);
  assert.match(sentMessages[0].text, /2026-05-17T09:00:00.000Z/);
  assert.deepEqual(markedSent, ['notification-1']);
});

test('already sent registration notification is idempotent', async () => {
  let sendAttempts = 0;

  await deliverRegistrationConfirmedNotification(
    { registrationId: context.registrationId },
    {
      findContext: async () => context,
      findOrCreate: async () => ({
        id: 'notification-1',
        status: NotificationStatuses.SENT,
        attemptCount: 1
      }),
      markSent: async () => undefined,
      markFailed: async () => undefined,
      channels: [
        {
          channel: NotificationChannels.EMAIL,
          send: async () => {
            sendAttempts += 1;
          }
        }
      ]
    }
  );

  assert.equal(sendAttempts, 0);
});

test('failed channel delivery is persisted before retrying', async () => {
  const failures: string[] = [];

  await assert.rejects(
    deliverRegistrationConfirmedNotification(
      { registrationId: context.registrationId },
      {
        findContext: async () => context,
        findOrCreate: async () => ({
          id: 'notification-1',
          status: NotificationStatuses.PENDING,
          attemptCount: 0
        }),
        markSent: async () => undefined,
        markFailed: async (_id, error) => {
          failures.push(error);
        },
        channels: [
          {
            channel: NotificationChannels.EMAIL,
            send: async () => {
              throw new Error('smtp timeout');
            }
          }
        ]
      }
    ),
    /smtp timeout/
  );

  assert.deepEqual(failures, ['smtp timeout']);
});
