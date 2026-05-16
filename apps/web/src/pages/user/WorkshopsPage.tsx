import { PageHeader } from '../../components/PageHeader'
import { WorkshopCard } from '../../components/WorkshopCard'
import { cardClass } from '../../components/styles'
import { sampleWorkshops } from '../../data/workshops'
import type { SessionUser } from '../../types'

export function WorkshopsPage({ user }: { user: SessionUser | null }) {
  return (
    <>
      <PageHeader
        eyebrow="Student schedule"
        title="Browse workshops"
        description="The route is in place for the live workshop API. The seed cards below mirror the required room, speaker, fee and seat signals."
      />
      <section className={`${cardClass} grid gap-theme-md p-theme-md md:grid-cols-[2fr_1fr_1fr]`} aria-label="Workshop filters">
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Search
          <input className="min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none" type="search" placeholder="Speaker, topic, room..." />
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Day
          <select className="min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary focus:border-border-focus focus:outline-none" defaultValue="all">
            <option value="all">All days</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
          </select>
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Availability
          <select className="min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary focus:border-border-focus focus:outline-none" defaultValue="all">
            <option value="all">Any availability</option>
            <option value="has-seats">Has seats</option>
            <option value="free">Free workshops</option>
          </select>
        </label>
      </section>
      <section className="grid gap-theme-md md:grid-cols-3">
        {sampleWorkshops.map((workshop) => (
          <WorkshopCard key={workshop.id} user={user} workshop={workshop} />
        ))}
      </section>
    </>
  )
}
