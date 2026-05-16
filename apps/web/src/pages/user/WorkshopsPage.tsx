import { useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState, LoadingState } from '../../components/State'
import { WorkshopCard } from '../../components/WorkshopCard'
import { cardClass, linkButtonClass } from '../../components/styles'
import {
  defaultWorkshopFilters,
  filterAndSortWorkshops,
  getEventWeekRange,
  getWorkshopDayOptions,
} from '../../lib/workshopCatalog'
import { useWorkshopCatalog } from '../../lib/useWorkshopCatalog'
import type { SessionUser, WorkshopAvailabilityFilter, WorkshopFilters, WorkshopSortBy } from '../../types'

export function WorkshopsPage({ user }: { user: SessionUser | null }) {
  const { error, isLoading, source, workshops } = useWorkshopCatalog()
  const [filters, setFilters] = useState<WorkshopFilters>(defaultWorkshopFilters)
  const filteredWorkshops = useMemo(
    () => filterAndSortWorkshops(workshops, filters),
    [filters, workshops],
  )
  const dayOptions = useMemo(() => getWorkshopDayOptions(workshops), [workshops])
  const eventWeekRange = getEventWeekRange(workshops)

  function updateFilter<Value extends keyof WorkshopFilters>(key: Value, value: WorkshopFilters[Value]) {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }))
  }

  return (
    <>
      <PageHeader
        eyebrow="Student schedule"
        title={eventWeekRange ? `Browse workshops for ${eventWeekRange}` : 'Browse workshops'}
        description="Search the event-week schedule by topic, speaker, room, day, availability and fee. Seat counts refresh from the live workshop API when it is reachable."
      />
      {error ? (
        <p className="rounded-theme-md border border-status-warning/40 bg-status-warningBg px-theme-md py-theme-sm text-sm font-bold text-status-warning">
          {error} Browsing and details remain available while registration/payment services recover.
        </p>
      ) : null}
      <section className={`${cardClass} grid gap-theme-md p-theme-md md:grid-cols-[2fr_1fr_1fr_1fr]`} aria-label="Workshop filters">
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Search
          <input
            className={fieldClass}
            type="search"
            placeholder="Speaker, topic, room..."
            value={filters.query}
            onChange={(event) => updateFilter('query', event.target.value)}
          />
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Day
          <select
            className={fieldClass}
            value={filters.day}
            onChange={(event) => updateFilter('day', event.target.value)}
          >
            <option value="all">All days</option>
            {dayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Availability
          <select
            className={fieldClass}
            value={filters.availability}
            onChange={(event) =>
              updateFilter('availability', event.target.value as WorkshopAvailabilityFilter)
            }
          >
            <option value="all">Any availability</option>
            <option value="hasSeats">Has seats</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </select>
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Sort
          <select
            className={fieldClass}
            value={filters.sortBy}
            onChange={(event) => updateFilter('sortBy', event.target.value as WorkshopSortBy)}
          >
            <option value="startTime">Time</option>
            <option value="title">Title</option>
            <option value="speaker">Speaker</option>
            <option value="price">Fee</option>
            <option value="seatsRemaining">Seats remaining</option>
          </select>
        </label>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-theme-sm">
        <p className="text-sm font-bold text-text-secondary">
          Showing {filteredWorkshops.length} of {workshops.length} workshops
          {source === 'api' ? ' with live seat counts.' : ' from seed data.'}
        </p>
        <button className={linkButtonClass} type="button" onClick={() => setFilters(defaultWorkshopFilters)}>
          Reset filters
        </button>
      </div>
      {isLoading ? <LoadingState label="Refreshing live workshop seats..." /> : null}
      {filteredWorkshops.length === 0 ? (
        <EmptyState
          title="No workshops match these filters"
          message="Try a broader search, another day, or a different fee and availability filter."
        />
      ) : null}
      <section className="grid gap-theme-md md:grid-cols-3">
        {filteredWorkshops.map((workshop) => (
          <WorkshopCard key={workshop.id} user={user} workshop={workshop} />
        ))}
      </section>
    </>
  )
}

const fieldClass =
  'min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none'
