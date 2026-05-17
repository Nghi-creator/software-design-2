import { query } from '../lib/db';
import {
  NotificationChannel,
  NotificationContext,
  NotificationStatuses,
  StudentNotification
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

export const findStudentNotifications = async ({
  userId,
  limit,
  offset
}: {
  userId: string;
  limit: number;
  offset: number;
}) => {
  const result = await query<StudentNotification & { totalCount: number }>(
    `
      select
        notifications.id,
        notifications.user_id as "userId",
        notifications.registration_id as "registrationId",
        registrations.workshop_id as "workshopId",
        notifications.channel,
        notifications.subject,
        notifications.body,
        notifications.status,
        notifications.created_at as "createdAt",
        notifications.sent_at as "sentAt",
        notifications.read_at as "readAt",
        count(*) over()::int as "totalCount"
      from notifications
      left join registrations on registrations.id = notifications.registration_id
      where notifications.user_id = $1
      order by notifications.created_at desc, notifications.id desc
      limit $2 offset $3
    `,
    [userId, limit, offset]
  );

  return {
    items: result.rows.map(({ totalCount: _totalCount, ...notification }) => notification),
    totalItems: result.rows[0]?.totalCount ?? 0
  };
};

export const markStudentNotificationRead = async ({
  notificationId,
  userId
}: {
  notificationId: string;
  userId: string;
}) => {
  const result = await query<StudentNotification>(
    `
      with updated_notification as (
        update notifications
        set read_at = coalesce(read_at, now()),
          updated_at = now()
        where id = $1
          and user_id = $2
        returning *
      )
      select
        updated_notification.id,
        updated_notification.user_id as "userId",
        updated_notification.registration_id as "registrationId",
        registrations.workshop_id as "workshopId",
        updated_notification.channel,
        updated_notification.subject,
        updated_notification.body,
        updated_notification.status,
        updated_notification.created_at as "createdAt",
        updated_notification.sent_at as "sentAt",
        updated_notification.read_at as "readAt"
      from updated_notification
      left join registrations on registrations.id = updated_notification.registration_id
    `,
    [notificationId, userId]
  );

  return result.rows[0];
};
