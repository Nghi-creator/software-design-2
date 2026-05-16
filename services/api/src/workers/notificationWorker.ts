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

const worker = new Worker<RegistrationConfirmedEvent>(
  notificationQueueName,
  async (job) => {
    if (job.name !== registrationConfirmedJobName) {
      throw new Error(`Unsupported notification job: ${job.name}`);
    }

    await deliverRegistrationConfirmedNotification(job.data);
  },
  { connection: redis }
);

worker.on('completed', (job) => {
  console.log(`Notification job completed: ${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(`Notification job failed: ${job?.id}`, error);
});
