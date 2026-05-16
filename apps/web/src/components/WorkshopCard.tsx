import { formatCurrency, formatDateTime } from '../lib/format'
import { getWorkshopSummaryStatus } from '../lib/workshopCatalog'
import type { SessionUser, Workshop } from '../types'
import { RegistrationAction } from './RegistrationAction'
import { buttonClass, cardClass } from './styles'

export function WorkshopCard({ user, workshop }: { user: SessionUser | null; workshop: Workshop }) {
  const seatsUsed = workshop.capacity - workshop.seatsRemaining
  const fillPercent = Math.round((seatsUsed / workshop.capacity) * 100)
  const seatStatus = getSeatStatus(workshop)
  const summaryStatus = getWorkshopSummaryStatus(workshop)

  return (
    <article className={`${cardClass} p-theme-lg transition hover:border-border-strong hover:bg-surface-cardHover`}>
      <div className="mb-theme-md flex items-center justify-between gap-theme-sm">
        <span className="inline-flex min-h-8 items-center rounded-full bg-background-overlay px-theme-sm text-xs font-extrabold uppercase text-text-secondary">
          {formatDateTime(workshop.startTime)}
        </span>
        <span className="inline-flex min-h-8 items-center gap-theme-sm rounded-full border border-white/12 bg-black/30 px-theme-sm text-xs font-extrabold uppercase text-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <span className={`size-2 rounded-full ${seatStatus.dotClass}`} aria-hidden="true" />
          {seatStatus.label}
        </span>
      </div>
      <h2 className="mb-theme-sm break-words text-xl font-bold text-text-primary">{workshop.title}</h2>
      <p className="text-text-secondary">{workshop.speaker}</p>
      <dl className="my-theme-lg grid gap-theme-sm md:grid-cols-2">
        <div>
          <dt className="text-sm text-text-muted">Room</dt>
          <dd className="font-bold text-text-primary">{workshop.room?.name ?? workshop.roomId}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Location</dt>
          <dd className="font-bold text-text-primary">{workshop.room?.location ?? 'To be announced'}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Fee</dt>
          <dd className="font-bold text-text-primary">{formatCurrency(workshop.price)}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Room layout</dt>
          <dd className="font-bold text-text-primary">
            {workshop.room?.layoutUrl ? (
              <a className="text-brand-secondary hover:underline" href={workshop.room.layoutUrl}>
                Map reference
              </a>
            ) : (
              'Layout pending'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">AI summary</dt>
          <dd className="font-bold text-text-primary">{formatSummaryStatus(summaryStatus)}</dd>
        </div>
      </dl>
      <div className="my-theme-lg h-2.5 overflow-hidden rounded-full bg-background-overlay" aria-label={`${fillPercent}% seats reserved`}>
        <span className="block h-full rounded-full bg-brand-primary" style={{ width: `${fillPercent}%` }} />
      </div>
      <p className="mb-theme-md text-sm font-bold text-text-secondary">
        {workshop.seatsRemaining} of {workshop.capacity} seats available.
      </p>
      <div className="flex flex-wrap gap-theme-sm">
        <a className={buttonClass} href={`#/workshops/${workshop.id}`}>
          View details
        </a>
        <RegistrationAction user={user} workshop={workshop} />
      </div>
    </article>
  )
}

function getSeatStatus(workshop: Workshop) {
  if (workshop.seatsRemaining === 0) {
    return {
      label: 'Full',
      dotClass: 'bg-text-muted',
    }
  }

  if (workshop.seatsRemaining <= 10) {
    return {
      label: `${workshop.seatsRemaining} left`,
      dotClass: 'bg-status-warning',
    }
  }

  return {
    label: `${workshop.seatsRemaining} seats left`,
    dotClass: 'bg-status-success',
  }
}

function formatSummaryStatus(status: ReturnType<typeof getWorkshopSummaryStatus>) {
  switch (status) {
    case 'ready':
      return 'Ready'
    case 'processing':
      return 'Processing'
    case 'failed':
      return 'Needs review'
    case 'not_uploaded':
      return 'No PDF yet'
  }
}
