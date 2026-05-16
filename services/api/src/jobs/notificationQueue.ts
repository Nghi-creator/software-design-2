import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { RegistrationConfirmedEvent } from '../types/notification';

export const notificationQueueName = 'notification-delivery';
export const registrationConfirmedJobName = 'registration.confirmed';

let queue: Queue<RegistrationConfirmedEvent> | undefined;

const getQueue = () => {
  if (!queue) {
    queue = new Queue<RegistrationConfirmedEvent>(notificationQueueName, {
      connection: redis
    });
  }

  return queue;
};

export const publishRegistrationConfirmed = async (registrationId: string) => {
  await getQueue().add(
    registrationConfirmedJobName,
    { registrationId },
    {
      jobId: `${registrationConfirmedJobName}-${registrationId}`,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1_000
      }
    }
  );
};

export const drainNotificationQueue = async () => {
  await getQueue().drain(true);
};

export const closeNotificationQueue = async () => {
  if (!queue) {
    return;
  }

  await queue.close();
  queue = undefined;
};
