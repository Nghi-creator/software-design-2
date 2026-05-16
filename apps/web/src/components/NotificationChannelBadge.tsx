import type { NotificationChannel, NotificationDeliveryStatus } from '../types'
import { formatNotificationChannel } from '../lib/notificationFormat'

export function NotificationChannelBadge({
  channel,
  status,
}: {
  channel: NotificationChannel
  status: NotificationDeliveryStatus
}) {
  return (
    <span className="inline-flex min-h-8 items-center gap-theme-xs rounded-full bg-background-overlay px-theme-sm text-xs font-extrabold uppercase text-text-secondary">
      {formatNotificationChannel(channel)}
      <span className={`size-2 rounded-full ${getStatusClass(status)}`} aria-hidden="true" />
    </span>
  )
}

function getStatusClass(status: NotificationDeliveryStatus) {
  switch (status) {
    case 'sent':
      return 'bg-status-success'
    case 'queued':
      return 'bg-status-warning'
    case 'failed':
      return 'bg-status-danger'
  }
}
