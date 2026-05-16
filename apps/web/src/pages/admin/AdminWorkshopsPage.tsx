import { PageHeader } from '../../components/PageHeader'
import { buttonClass, cardClass } from '../../components/styles'
import { sampleWorkshops } from '../../data/workshops'

export function AdminWorkshopsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Organizer"
        title="Workshop management"
        description="Foundation route for create, update, cancel/delete and capacity validation flows."
        action={<button className={buttonClass} type="button">Create workshop</button>}
      />
      <section className={`${cardClass} overflow-hidden`}>
        <div className="grid gap-theme-md border-border-subtle bg-background-subtle px-theme-md py-theme-md text-xs font-extrabold uppercase text-text-muted md:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr]">
          <span>Workshop</span>
          <span>Room</span>
          <span>Capacity</span>
          <span>Status</span>
        </div>
        {sampleWorkshops.map((workshop) => (
          <div className="grid gap-theme-md border-t border-border-subtle px-theme-md py-theme-md text-text-secondary md:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr]" key={workshop.id}>
            <span>{workshop.title}</span>
            <span>{workshop.room?.name ?? workshop.roomId}</span>
            <span>{workshop.capacity - workshop.seatsRemaining}/{workshop.capacity}</span>
            <span>{workshop.seatsRemaining > 0 ? 'Open' : 'Full'}</span>
          </div>
        ))}
      </section>
    </>
  )
}
