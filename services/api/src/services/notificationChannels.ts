import {
  NotificationChannel,
  NotificationChannels,
  NotificationContent,
  NotificationContext
} from '../types/notification';

export type NotificationChannelAdapter = {
  channel: NotificationChannel;
  send: (context: NotificationContext, content: NotificationContent) => Promise<void>;
};

export type EmailTransport = {
  send: (message: {
    to: string;
    subject: string;
    text: string;
  }) => Promise<void>;
};

export class EmailNotificationChannel implements NotificationChannelAdapter {
  readonly channel = NotificationChannels.EMAIL;

  constructor(private readonly transport: EmailTransport) {}

  async send(context: NotificationContext, content: NotificationContent) {
    await this.transport.send({
      to: context.recipientEmail,
      subject: content.subject,
      text: content.text
    });
  }
}

export class ConsoleEmailTransport implements EmailTransport {
  async send(message: { to: string; subject: string; text: string }) {
    console.log('Email notification sent', {
      to: message.to,
      subject: message.subject
    });
  }
}
