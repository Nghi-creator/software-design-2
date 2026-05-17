import type { NotificationChannel, NotificationDeliveryStatus, PaginatedResponse, StoredNotification } from '../types'
import { apiRequest } from './api'

type ApiNotification = {
  id: string
  userId: string
  registrationId?: string | null
  workshopId?: string | null
  channel: 'EMAIL'
  subject: string
  body: string
  status: 'PENDING' | 'SENT' | 'FAILED'
  createdAt: string
  sentAt?: string | null
  readAt?: string | null
}

type NotificationListResponse = PaginatedResponse<ApiNotification> & {
  success: true
}

type NotificationReadResponse = {
  success: true
  notification: ApiNotification
}

export async function getStoredNotifications() {
  const response = await apiRequest<NotificationListResponse>('/notifications?pageSize=50')
  return response.items.map(toStoredNotification)
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiRequest<NotificationReadResponse>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })

  return toStoredNotification(response.notification)
}

function toStoredNotification(notification: ApiNotification): StoredNotification {
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.subject,
    message: notification.body,
    channel: toNotificationChannel(notification.channel),
    status: toNotificationDeliveryStatus(notification.status),
    createdAt: notification.createdAt,
    readAt: notification.readAt,
    registrationId: notification.registrationId ?? undefined,
    workshopId: notification.workshopId ?? undefined,
  }
}

function toNotificationChannel(channel: ApiNotification['channel']): NotificationChannel {
  if (channel === 'EMAIL') return 'email'
  return 'in_app'
}

function toNotificationDeliveryStatus(status: ApiNotification['status']): NotificationDeliveryStatus {
  if (status === 'PENDING') return 'queued'
  if (status === 'FAILED') return 'failed'
  return 'sent'
}
