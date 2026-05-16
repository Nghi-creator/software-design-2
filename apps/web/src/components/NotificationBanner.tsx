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

  if (!user || !notification) return null

  return (
    <section className="grid gap-theme-sm rounded-theme-md border border-status-success/40 bg-status-successBg px-theme-md py-theme-sm text-status-success md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="text-xs font-extrabold uppercase">{formatNotificationChannel(notification.channel)}</p>
        <strong className="block text-text-primary">{notification.title}</strong>
        <p className="text-sm font-bold">{notification.message}</p>
      </div>
      <div className="flex flex-wrap gap-theme-sm">
        <a className={linkButtonClass} href="#/notifications">History</a>
        <button
          className={linkButtonClass}
          type="button"
          onClick={() => markNotificationRead(notification.id)}
        >
          Dismiss
        </button>
      </div>
    </section>
  )
}
