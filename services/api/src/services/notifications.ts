import {
  findOrCreateNotification,
  findRegistrationNotificationContext,
  markNotificationFailed,
  markNotificationSent
} from '../repositories/notificationRepository';
import {
  NotificationChannels,
  NotificationContent,
  NotificationContext,
  NotificationStatuses,
  RegistrationConfirmedEvent
} from '../types/notification';
import {
  EmailNotificationChannel,
  GmailEmailTransport,
  NotificationChannelAdapter
} from './notificationChannels';

type NotificationServiceDependencies = {
  findContext: typeof findRegistrationNotificationContext;
  findOrCreate: typeof findOrCreateNotification;
  markSent: typeof markNotificationSent;
  markFailed: typeof markNotificationFailed;
  channels: NotificationChannelAdapter[];
};

const composeRegistrationConfirmed = (
  context: NotificationContext
): NotificationContent => ({
  subject: `Registration confirmed: ${context.workshopTitle}`,
  text: [
    `Hi ${context.recipientName},`,
    '',
    `Your registration for "${context.workshopTitle}" is confirmed.`,
    `Start time: ${context.workshopStartTime.toISOString()}`,
    '',
    'See you there!'
  ].join('\n')
});

const createDefaultDependencies = (): NotificationServiceDependencies => {
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_PASS;

  if (!mailUser || !mailPass) {
    throw new Error('MAIL_USER and MAIL_PASS must be configured for email notifications');
  }

  return {
    findContext: findRegistrationNotificationContext,
    findOrCreate: findOrCreateNotification,
    markSent: markNotificationSent,
    markFailed: markNotificationFailed,
    channels: [new EmailNotificationChannel(new GmailEmailTransport({ user: mailUser, pass: mailPass }))]
  };
};

export const deliverRegistrationConfirmedNotification = async (
  event: RegistrationConfirmedEvent,
  dependencies: NotificationServiceDependencies = createDefaultDependencies()
) => {
  const context = await dependencies.findContext(event.registrationId);
  if (!context) {
    return;
  }

  const content = composeRegistrationConfirmed(context);
  const channel = dependencies.channels.find(
    (candidate) => candidate.channel === NotificationChannels.EMAIL
  );

  if (!channel) {
    throw new Error(`No channel registered for ${NotificationChannels.EMAIL}`);
  }

  const notification = await dependencies.findOrCreate({
    eventKey: `registration.confirmed:${context.registrationId}`,
    channel: channel.channel,
    context,
    subject: content.subject,
    body: content.text
  });

  if (notification.status === NotificationStatuses.SENT) {
    return;
  }

  try {
    await channel.send(context, content);
    await dependencies.markSent(notification.id);
  } catch (error: any) {
    await dependencies.markFailed(notification.id, error.message);
    throw error;
  }
};
