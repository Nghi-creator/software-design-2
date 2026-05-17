import { useEffect, useState } from 'react'
import { getStoredNotifications, markNotificationRead } from '../lib/notificationStore'
import { formatNotificationChannel } from '../lib/notificationFormat'
import type { SessionUser, StoredNotification } from '../types'
import { linkButtonClass } from './styles'

export function NotificationBanner({
  autoReadDelayMs = 5_000,
  user,
}: {
  autoReadDelayMs?: number
  user: SessionUser | null
}) {
  const [notification, setNotification] = useState<StoredNotification | null>(null)

  useEffect(() => {
    if (!user) return undefined
    let isMounted = true

    async function refreshNotification() {
      try {
        const notifications = await getStoredNotifications()
        if (!isMounted) return
        setNotification(notifications.find((item) => !item.readAt) ?? null)
      } catch {
        if (isMounted) setNotification(null)
      }
    }

    void refreshNotification()
    const intervalId = window.setInterval(refreshNotification, 30_000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [user])

  useEffect(() => {
    if (!notification) return undefined
    const timeoutId = window.setTimeout(() => {
      void markNotificationRead(notification.id)
        .then(() => setNotification(null))
        .catch(() => undefined)
    }, autoReadDelayMs)
    return () => window.clearTimeout(timeoutId)
  }, [autoReadDelayMs, notification])

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
