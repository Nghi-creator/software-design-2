import {
  NotificationChannel,
  NotificationChannels,
  NotificationContent,
  NotificationContext
} from '../types/notification';
import nodemailer from 'nodemailer';

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

type GmailTransportConfig = {
  user: string;
  pass: string;
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

export class GmailEmailTransport implements EmailTransport {
  private readonly transporter;

  constructor(config: GmailTransportConfig) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass
      }
    });
  }

  async send(message: { to: string; subject: string; text: string }) {
    await this.transporter.sendMail({
      from: process.env.MAIL_USER,
      to: message.to,
      subject: message.subject,
      text: message.text
    });
  }
}
