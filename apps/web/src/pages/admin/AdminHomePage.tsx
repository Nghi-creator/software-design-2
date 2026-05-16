import { useEffect, useMemo, useState } from 'react'
import { MetricCard } from '../../components/MetricCard'
import { DashboardSkeleton, EmptyState, Notice } from '../../components/State'
import { cardClass } from '../../components/styles'

import { formatDateTime } from '../../lib/format'
import { getUserFacingError } from '../../lib/apiErrorMessages'
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
          response.items.map(async (workshop) => [workshop.id, await getOptionalDashboardStats(workshop)] as const),
        )
        if (!isMounted) return
        setWorkshops(response.items)
        setStats(Object.fromEntries(statsEntries))
      } catch (caughtError) {
        if (!isMounted) return
        setWorkshops([])
        setStats({})
        setError(getUserFacingError(caughtError, { action: 'Organizer metrics' }))
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
      <h1 className="text-3xl font-extrabold leading-tight text-text-primary md:text-4xl">Admin dashboard</h1>
      {error ? <Notice tone="warning" message={error} /> : null}
      {isLoading ? (
        <DashboardSkeleton />
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
            {workshops.length === 0 ? (
              <div className="border-t border-border-subtle p-theme-md">
                <EmptyState title="No dashboard stats yet" message="Organizer metrics will appear after workshops are published." />
              </div>
            ) : (
              workshops.slice(0, 4).map((workshop) => (
                <div className="grid gap-theme-md border-t border-border-subtle px-theme-md py-theme-md text-text-secondary md:grid-cols-[minmax(260px,2fr)_1fr_1fr_1fr]" key={workshop.id}>
                  <span className="font-bold text-text-primary">{workshop.title}</span>
                  <span>{workshop.room?.name ?? workshop.roomId}</span>
                  <span>{workshop.seatsRemaining}/{workshop.capacity}</span>
                  <span>{formatDateTime(workshop.startTime)}</span>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </>
  )
}

async function getOptionalDashboardStats(workshop: Workshop) {
  try {
    return await getWorkshopStats(workshop.id)
  } catch {
    const reservedSeats = workshop.capacity - workshop.seatsRemaining
    return {
      workshopId: workshop.id,
      capacity: workshop.capacity,
      seatsRemaining: workshop.seatsRemaining,
      registrations: { pending: 0, confirmed: reservedSeats, cancelled: 0 },
      checkedInCount: 0,
      successfulPaymentCount: workshop.price > 0 ? reservedSeats : 0,
    }
  }
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
