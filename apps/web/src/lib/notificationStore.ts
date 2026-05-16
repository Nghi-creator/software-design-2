import type { NotificationChannel, StoredNotification } from '../types'

const NOTIFICATION_STORAGE_KEY = 'unihub.notifications'
const NOTIFICATION_EVENT = 'unihub:notifications-changed'

export function getStoredNotifications(userId: string) {
  return readStoredNotifications()
    .filter((notification) => notification.userId === userId)
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
}

export function addStoredNotification(input: {
  userId: string
  title: string
  message: string
  channel?: NotificationChannel
  registrationId?: string
  workshopId?: string
}) {
  const now = new Date().toISOString()
  const notification: StoredNotification = {
    id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: input.userId,
    title: input.title,
    message: input.message,
    channel: input.channel ?? 'in_app',
    status: 'sent',
    createdAt: now,
    registrationId: input.registrationId,
    workshopId: input.workshopId,
  }

  writeStoredNotifications([notification, ...readStoredNotifications()])
  return notification
}

export function markNotificationRead(notificationId: string) {
  const now = new Date().toISOString()
  const nextNotifications = readStoredNotifications().map((notification) =>
    notification.id === notificationId ? { ...notification, readAt: now } : notification,
  )

  writeStoredNotifications(nextNotifications)
}

export function subscribeToNotificationChanges(listener: () => void) {
  window.addEventListener(NOTIFICATION_EVENT, listener)
  window.addEventListener('storage', listener)

  return () => {
    window.removeEventListener(NOTIFICATION_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

function readStoredNotifications(): StoredNotification[] {
  const rawNotifications = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
  if (!rawNotifications) return []

  try {
    const notifications = JSON.parse(rawNotifications) as StoredNotification[]
    return Array.isArray(notifications) ? notifications.filter(isStoredNotification) : []
  } catch {
    localStorage.removeItem(NOTIFICATION_STORAGE_KEY)
    return []
  }
}

function writeStoredNotifications(notifications: StoredNotification[]) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications))
  window.dispatchEvent(new Event(NOTIFICATION_EVENT))
}

function isStoredNotification(value: unknown): value is StoredNotification {
  if (!value || typeof value !== 'object') return false
  const notification = value as Partial<StoredNotification>

  return (
    typeof notification.id === 'string' &&
    typeof notification.userId === 'string' &&
    typeof notification.title === 'string' &&
    typeof notification.message === 'string' &&
    isNotificationChannel(notification.channel)
  )
}

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return value === 'in_app' || value === 'email' || value === 'telegram'
}
