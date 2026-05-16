import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { query } from '../../../src/lib/db';
import {
  drainNotificationQueue,
  publishRegistrationConfirmed
} from '../../../src/jobs/notificationQueue';
import { createNotificationWorker } from '../../../src/workers/notificationWorker';
import {
  findOrCreateNotification,
  findRegistrationNotificationContext,
  markNotificationFailed,
  markNotificationSent
} from '../../../src/repositories/notificationRepository';
import { deliverRegistrationConfirmedNotification } from '../../../src/services/notifications';
import { NotificationChannels } from '../../../src/types/notification';
import {
  cleanupFixture,
  createConfirmedRegistration,
  createFixture,
  registerRealServiceCleanup,
  skipReason
} from './support';

registerRealServiceCleanup();

test('real BullMQ worker delivers registration notification and persists sent status', {
  skip: skipReason
}, async () => {
  await drainNotificationQueue();
  const fixture = await createFixture();
  const registration = await createConfirmedRegistration(fixture, `qr-notify-${fixture.suffix}`);
  const sentTo: string[] = [];
  const worker = createNotificationWorker((event) =>
    deliverRegistrationConfirmedNotification(event, {
      findContext: findRegistrationNotificationContext,
      findOrCreate: findOrCreateNotification,
      markSent: markNotificationSent,
      markFailed: markNotificationFailed,
      channels: [
        {
          channel: NotificationChannels.EMAIL,
          send: async (context) => {
            sentTo.push(context.recipientEmail);
          }
        }
      ]
    })
  );

  try {
    await publishRegistrationConfirmed(registration.id);
    const notification = await waitForNotification(registration.id);

    assert.equal(notification.status, 'SENT');
    assert.equal(notification.channel, 'EMAIL');
    assert.equal(notification.attemptCount, 1);
    assert.match(notification.subject, /Registration confirmed/);
    assert.deepEqual(sentTo, [`student.${fixture.suffix}@example.test`]);
  } finally {
    await worker.close();
    await query('delete from notifications where registration_id = $1', [registration.id]);
    await cleanupFixture(fixture);
  }
});

const waitForNotification = async (registrationId: string) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await query<{
      status: string;
      channel: string;
      attemptCount: number;
      subject: string;
    }>(
      `
        select status, channel, attempt_count as "attemptCount", subject
        from notifications
        where registration_id = $1
      `,
      [registrationId]
    );

    if (result.rows[0]?.status === 'SENT') {
      return result.rows[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for notification delivery');
};
