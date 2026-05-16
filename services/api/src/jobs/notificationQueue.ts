import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { RegistrationConfirmedEvent } from '../types/notification';

export const notificationQueueName = 'notification-delivery';
export const registrationConfirmedJobName = 'registration.confirmed';

const queue = new Queue<RegistrationConfirmedEvent>(notificationQueueName, {
  connection: redis
});

export const publishRegistrationConfirmed = async (registrationId: string) => {
  await queue.add(
    registrationConfirmedJobName,
    { registrationId },
    {
      jobId: `${registrationConfirmedJobName}:${registrationId}`,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1_000
      }
    }
  );
};
