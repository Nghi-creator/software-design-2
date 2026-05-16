import { useEffect, useMemo, useState } from 'react'
import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { CenteredLoadingState } from '../../components/State'
import { buttonClass, cardClass } from '../../components/styles'

import { formatDateTime } from '../../lib/format'
import { getWorkshopStats, listWorkshops } from '../../lib/workshopApi'
import type { Workshop, WorkshopStats } from '../../types'

export function AdminHomePage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [stats, setStats] = useState<Record<string, WorkshopStats>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const totals = useMemo(() => getAdminTotals(workshops, stats), [stats, workshops])

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await listWorkshops()
        const statsEntries = await Promise.all(
          response.items.map(async (workshop) => [workshop.id, await getWorkshopStats(workshop.id)] as const),
        )
        if (!isMounted) return
        setWorkshops(response.items)
        setStats(Object.fromEntries(statsEntries))
      } catch {
        if (!isMounted) return
        setWorkshops([])
        setError('Live organizer metrics are unavailable. Please try again later.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="Organizer"
        title="Admin dashboard"
        description="Operational snapshot for workshop capacity, registrations, check-ins and paid seats."
        action={<a className={buttonClass} href="#/admin/workshops">Manage workshops</a>}
      />
      {error ? (
        <p className="rounded-theme-md border border-status-warning/40 bg-status-warningBg px-theme-md py-theme-sm text-sm font-bold text-status-warning">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <CenteredLoadingState label="Loading organizer dashboard..." />
      ) : (
        <>
          <section className="grid gap-theme-md md:grid-cols-4">
            <MetricCard label="Workshops" value={String(workshops.length)} note="Current event catalog" />
            <MetricCard label="Reserved seats" value={String(totals.reservedSeats)} note="Capacity already claimed" />
            <MetricCard label="Checked in" value={String(totals.checkedInCount)} note="Confirmed on-site entries" />
            <MetricCard label="Paid seats" value={String(totals.successfulPaymentCount)} note="Successful paid registrations" />
          </section>
          <section className={`${cardClass} overflow-hidden`}>
            <div className="grid gap-theme-md border-border-subtle bg-background-subtle px-theme-md py-theme-md text-xs font-extrabold uppercase text-text-muted md:grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr]">
              <span>Next workshop</span>
              <span>Room</span>
              <span>Remaining</span>
              <span>Starts</span>
            </div>
            {workshops.slice(0, 4).map((workshop) => (
              <div className="grid gap-theme-md border-t border-border-subtle px-theme-md py-theme-md text-text-secondary md:grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr]" key={workshop.id}>
                <span className="font-bold text-text-primary">{workshop.title}</span>
                <span>{workshop.room?.name ?? workshop.roomId}</span>
                <span>{workshop.seatsRemaining}/{workshop.capacity}</span>
                <span>{formatDateTime(workshop.startTime)}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </>
  )
}

function getAdminTotals(workshops: Workshop[], stats: Record<string, WorkshopStats>) {
  return workshops.reduce(
    (totals, workshop) => {
      const workshopStats = stats[workshop.id]
      totals.reservedSeats += workshop.capacity - workshop.seatsRemaining
      totals.checkedInCount += workshopStats?.checkedInCount ?? 0
      totals.successfulPaymentCount += workshopStats?.successfulPaymentCount ?? 0
      return totals
    },
    { reservedSeats: 0, checkedInCount: 0, successfulPaymentCount: 0 },
  )
}
