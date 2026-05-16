import { query } from '../lib/db';
import {
  NotificationChannel,
  NotificationContext,
  NotificationStatuses
} from '../types/notification';

export const findRegistrationNotificationContext = async (
  registrationId: string
): Promise<NotificationContext | undefined> => {
  const result = await query<NotificationContext>(
    `
      select
        registrations.id as "registrationId",
        users.id as "userId",
        users.name as "recipientName",
        users.email as "recipientEmail",
        workshops.title as "workshopTitle",
        workshops.start_time as "workshopStartTime"
      from registrations
      join users on users.id = registrations.user_id
      join workshops on workshops.id = registrations.workshop_id
      where registrations.id = $1
        and registrations.status = 'CONFIRMED'
    `,
    [registrationId]
  );

  return result.rows[0];
};

export const findOrCreateNotification = async ({
  eventKey,
  channel,
  context,
  subject,
  body
}: {
  eventKey: string;
  channel: NotificationChannel;
  context: NotificationContext;
  subject: string;
  body: string;
}) => {
  const result = await query<{
    id: string;
    status: string;
    attemptCount: number;
  }>(
    `
      insert into notifications (
        user_id,
        registration_id,
        event_key,
        channel,
        subject,
        body
      )
      values ($1, $2, $3, $4, $5, $6)
      on conflict (event_key, channel) do update
      set updated_at = notifications.updated_at
      returning id, status, attempt_count as "attemptCount"
    `,
    [context.userId, context.registrationId, eventKey, channel, subject, body]
  );

  return result.rows[0];
};

export const markNotificationSent = async (notificationId: string) => {
  await query(
    `
      update notifications
      set status = $2,
        sent_at = now(),
        last_error = null,
        attempt_count = attempt_count + 1,
        updated_at = now()
      where id = $1
    `,
    [notificationId, NotificationStatuses.SENT]
  );
};

export const markNotificationFailed = async (notificationId: string, error: string) => {
  await query(
    `
      update notifications
      set status = $2,
        last_error = $3,
        attempt_count = attempt_count + 1,
        updated_at = now()
      where id = $1
    `,
    [notificationId, NotificationStatuses.FAILED, error]
  );
};
