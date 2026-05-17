export const NotificationChannels = {
  EMAIL: 'EMAIL'
} as const;

export type NotificationChannel =
  (typeof NotificationChannels)[keyof typeof NotificationChannels];

export const NotificationStatuses = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED'
} as const;

export type NotificationStatus =
  (typeof NotificationStatuses)[keyof typeof NotificationStatuses];

export type RegistrationConfirmedEvent = {
  registrationId: string;
};

export type NotificationContext = {
  registrationId: string;
  userId: string;
  recipientName: string;
  recipientEmail: string;
  workshopTitle: string;
  workshopStartTime: Date;
};

export type NotificationContent = {
  subject: string;
  text: string;
};

export type StudentNotification = {
  id: string;
  userId: string;
  registrationId?: string | null;
  workshopId?: string | null;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  createdAt: Date;
  sentAt?: Date | null;
  readAt?: Date | null;
};
