import type { NotificationChannel } from '../types'

export function formatNotificationChannel(channel: NotificationChannel) {
  switch (channel) {
    case 'in_app':
      return 'In-app'
    case 'email':
      return 'Email'
    case 'telegram':
      return 'Telegram'
  }
}
