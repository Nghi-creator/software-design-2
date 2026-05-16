import { EmptyState, StatePanel } from '../../components/State'
import { PageHeader } from '../../components/PageHeader'
import { RegistrationAction } from '../../components/RegistrationAction'
import { buttonClass, panelClass } from '../../components/styles'
import { sampleWorkshops } from '../../data/workshops'
import { formatCurrency, formatDateTime } from '../../lib/format'
import type { SessionUser } from '../../types'

export function WorkshopDetailPage({ user, workshopId }: { user: SessionUser | null; workshopId: string }) {
  const workshop = sampleWorkshops.find((item) => item.id === workshopId)

  if (!workshop) {
    return (
      <StatePanel
        title="Workshop not found"
        message="This workshop route exists, but the requested workshop is not in the current local data set."
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
              <dd className="font-bold text-text-primary">{workshop.room?.layoutUrl ?? 'Layout pending'}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">Fee</dt>
              <dd className="font-bold text-text-primary">{formatCurrency(workshop.price)}</dd>
            </div>
          </dl>
        </article>
        <article className={panelClass}>
          <h2 className="mb-theme-sm text-xl font-bold text-text-primary">AI summary</h2>
          {workshop.aiSummary ? (
            <p className="text-text-secondary">{workshop.aiSummary}</p>
          ) : (
            <EmptyState
              title="Summary processing"
              message="The detail route already has a stable place for AI PDF summary states."
            />
          )}
        </article>
      </section>
    </>
  )
}
