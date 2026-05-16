import { useEffect, useState } from 'react'
import { NotificationChannelBadge } from '../../components/NotificationChannelBadge'
import { EmptyState } from '../../components/State'
import { cardClass, linkButtonClass } from '../../components/styles'
import {
  getStoredNotifications,
  markNotificationRead,
  subscribeToNotificationChanges,
} from '../../lib/notificationStore'
import type { SessionUser, StoredNotification } from '../../types'

export function NotificationsPage({ user }: { user: SessionUser }) {
  const [notifications, setNotifications] = useState<StoredNotification[]>(() =>
    getStoredNotifications(user.id),
  )

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getStoredNotifications(user.id))
    }

    refreshNotifications()
    return subscribeToNotificationChanges(refreshNotifications)
  }, [user.id])

  return (
    <>
      <h1 className="text-3xl font-extrabold leading-tight text-text-primary md:text-4xl">Notifications</h1>
      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          message="Successful registrations will create in-app confirmation notifications here."
        />
      ) : (
        <section className="grid gap-theme-md">
          {notifications.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </section>
      )}
    </>
  )
}

function NotificationCard({ notification }: { notification: StoredNotification }) {
  return (
    <article className={`${cardClass} grid gap-theme-md p-theme-lg md:grid-cols-[minmax(0,1fr)_auto] md:items-start`}>
      <div className="grid gap-theme-sm">
        <div className="flex flex-wrap items-center gap-theme-sm">
          <NotificationChannelBadge channel={notification.channel} status={notification.status} />
          <span className="text-sm font-bold text-text-muted">
            {new Intl.DateTimeFormat('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(notification.createdAt))}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-text-primary">{notification.title}</h2>
          <p className="text-text-secondary">{notification.message}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-theme-sm">
        {notification.registrationId ? (
          <a className={linkButtonClass} href="#/registrations">View ticket</a>
        ) : null}
        {!notification.readAt ? (
          <button className={linkButtonClass} type="button" onClick={() => markNotificationRead(notification.id)}>
            Mark read
          </button>
        ) : (
          <span className="inline-flex min-h-10 items-center px-theme-sm text-sm font-bold text-text-muted">
            Read
          </span>
        )}
      </div>
    </article>
  )
}
