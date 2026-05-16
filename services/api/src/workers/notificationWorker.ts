import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import {
  notificationQueueName,
  registrationConfirmedJobName
} from '../jobs/notificationQueue';
import { deliverRegistrationConfirmedNotification } from '../services/notifications';
import { RegistrationConfirmedEvent } from '../types/notification';

export const createNotificationWorker = (
  deliverNotification = deliverRegistrationConfirmedNotification
) => {
  const worker = new Worker<RegistrationConfirmedEvent>(
    notificationQueueName,
    async (job) => {
      if (job.name !== registrationConfirmedJobName) {
        throw new Error(`Unsupported notification job: ${job.name}`);
      }

      await deliverNotification(job.data);
    },
    { connection: redis }
  );

  worker.on('completed', (job) => {
    console.log(`Notification job completed: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Notification job failed: ${job?.id}`, error);
  });

  return worker;
};

if (require.main === module) {
  createNotificationWorker();
}
