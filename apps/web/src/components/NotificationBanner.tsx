import { useEffect, useState } from 'react'
import {
  getStoredNotifications,
  markNotificationRead,
  subscribeToNotificationChanges,
} from '../lib/notificationStore'
import { formatNotificationChannel } from '../lib/notificationFormat'
import type { SessionUser, StoredNotification } from '../types'
import { linkButtonClass } from './styles'

export function NotificationBanner({ user }: { user: SessionUser | null }) {
  const [notification, setNotification] = useState<StoredNotification | null>(null)

  useEffect(() => {
    if (!user) return undefined
    const userId = user.id

    function refreshNotification() {
      const latestUnread = getStoredNotifications(userId).find((item) => !item.readAt)
      setNotification(latestUnread ?? null)
    }

    refreshNotification()
    return subscribeToNotificationChanges(refreshNotification)
  }, [user])

  useEffect(() => {
    if (!notification) return undefined
    const timeoutId = window.setTimeout(() => markNotificationRead(notification.id), 10000)
    return () => window.clearTimeout(timeoutId)
  }, [notification])

  if (!user || !notification) return null

  return (
    <section className="fixed bottom-theme-lg left-theme-md right-theme-md z-50 grid gap-theme-xs rounded-theme-md border border-status-success/40 bg-status-successBg px-theme-md py-theme-sm text-status-success shadow-theme-glow animate-fade-in md:left-auto md:max-w-md">
      <div>
        <p className="text-xs font-extrabold uppercase">{formatNotificationChannel(notification.channel)}</p>
        <strong className="block text-text-primary">{notification.title}</strong>
        <p className="text-sm font-bold">{notification.message}</p>
      </div>
      <a className={`${linkButtonClass} min-h-0 justify-self-start px-0 py-0`} href="#/notifications">History</a>
    </section>
  )
}
