import { MetricCard } from '../../components/MetricCard'
import { PageHeader } from '../../components/PageHeader'
import { buttonClass } from '../../components/styles'

export function AdminHomePage() {
  return (
    <>
      <PageHeader
        eyebrow="Organizer"
        title="Admin dashboard"
        description="Protected organizer route for workshop operations, event stats, PDF summary status and import health."
        action={<a className={buttonClass} href="#/admin/workshops">Manage workshops</a>}
      />
      <section className="grid gap-theme-md md:grid-cols-3">
        <MetricCard label="Active workshops" value="42" note="Across the 5-day event week" />
        <MetricCard label="Confirmed seats" value="4,218" note="Live count from registrations" />
        <MetricCard label="CSV import" value="Healthy" note="Latest nightly sync completed" />
      </section>
    </>
  )
}
