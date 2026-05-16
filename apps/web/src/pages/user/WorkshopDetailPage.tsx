import { EmptyState, StatePanel } from '../../components/State'
import { PageHeader } from '../../components/PageHeader'
import { RegistrationAction } from '../../components/RegistrationAction'
import { buttonClass, panelClass } from '../../components/styles'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { getWorkshopSummaryStatus } from '../../lib/workshopCatalog'
import { useWorkshopCatalog } from '../../lib/useWorkshopCatalog'
import type { AiSummaryStatus, SessionUser, Workshop } from '../../types'

export function WorkshopDetailPage({ user, workshopId }: { user: SessionUser | null; workshopId: string }) {
  const { error, isLoading, source, workshops } = useWorkshopCatalog()
  const workshop = workshops.find((item) => item.id === workshopId)

  if (!workshop) {
    return (
      <StatePanel
        title="Workshop not found"
        message={
          isLoading
            ? 'Live workshop data is still loading. If this takes too long, return to the schedule and try again.'
            : 'This workshop route exists, but the requested workshop is not in the current data set.'
        }
        action={<a className={buttonClass} href="#/workshops">Back to schedule</a>}
      />
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Workshop detail"
        title={workshop.title}
        description={`${workshop.speaker} in ${workshop.room?.name ?? workshop.roomId}. ${workshop.seatsRemaining} seats remain.`}
        action={<RegistrationAction user={user} workshop={workshop} />}
      />
      {error ? (
        <p className="rounded-theme-md border border-status-warning/40 bg-status-warningBg px-theme-md py-theme-sm text-sm font-bold text-status-warning">
          {error} This detail page is still available, and registration/payment actions can recover independently.
        </p>
      ) : null}
      <section className="grid gap-theme-md md:grid-cols-2">
        <article className={panelClass}>
          <h2 className="mb-theme-sm text-xl font-bold text-text-primary">Room and timing</h2>
          <dl className="grid gap-theme-sm">
            <div>
              <dt className="text-sm text-text-muted">Starts</dt>
              <dd className="font-bold text-text-primary">{formatDateTime(workshop.startTime)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Room layout</dt>
              <dd className="font-bold text-text-primary">
                {workshop.room?.layoutUrl ? (
                  <a className="text-brand-secondary hover:underline" href={workshop.room.layoutUrl}>
                    Open map reference
                  </a>
                ) : (
                  'Layout pending'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Fee</dt>
              <dd className="font-bold text-text-primary">{formatCurrency(workshop.price)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Seats</dt>
              <dd className="font-bold text-text-primary">
                {workshop.seatsRemaining} available from {workshop.capacity}
                {source === 'api' ? ' live seats' : ' demo seats'}
              </dd>
            </div>
          </dl>
        </article>
        <SummaryPanel workshop={workshop} />
      </section>
    </>
  )
}

function SummaryPanel({ workshop }: { workshop: Workshop }) {
  const status = getWorkshopSummaryStatus(workshop)
  const statusContent = getSummaryStatusContent(status)

  return (
    <article className={panelClass}>
      <div className="mb-theme-sm flex flex-wrap items-center justify-between gap-theme-sm">
        <h2 className="text-xl font-bold text-text-primary">AI summary</h2>
        <span className={`rounded-full px-theme-sm py-1 text-xs font-extrabold uppercase ${statusContent.badgeClass}`}>
          {statusContent.label}
        </span>
      </div>
      {status === 'ready' && workshop.aiSummary ? (
        <p className="text-text-secondary">{workshop.aiSummary}</p>
      ) : (
        <EmptyState title={statusContent.title} message={statusContent.message} />
      )}
    </article>
  )
}

function getSummaryStatusContent(status: AiSummaryStatus) {
  switch (status) {
    case 'ready':
      return {
        label: 'Ready',
        title: 'Summary ready',
        message: 'The AI-generated workshop summary is available.',
        badgeClass: 'bg-status-successBg text-status-success',
      }
    case 'processing':
      return {
        label: 'Processing',
        title: 'Summary processing',
        message: 'The workshop PDF is uploaded and the summary is still being generated.',
        badgeClass: 'bg-status-warningBg text-status-warning',
      }
    case 'failed':
      return {
        label: 'Needs review',
        title: 'Summary unavailable',
        message: 'The summary job failed. Browsing and registration remain available.',
        badgeClass: 'bg-status-dangerBg text-status-danger',
      }
    case 'not_uploaded':
      return {
        label: 'No PDF',
        title: 'No summary uploaded yet',
        message: 'The organizer has not linked a workshop PDF, so there is no AI summary yet.',
        badgeClass: 'bg-background-overlay text-text-muted',
      }
  }
}
