import { FeatureCard } from '../../components/FeatureCard'
import { PageHeader } from '../../components/PageHeader'
import { buttonClass } from '../../components/styles'

export function HomePage() {
  return (
    <>
      <PageHeader
        eyebrow="React web foundation"
        title="Workshop registration and admin operations in one web app"
        description="This shell is ready for public workshop browsing, student registration pages, organizer dashboards and RBAC-protected routes."
        action={<a className={buttonClass} href="#/workshops">Browse schedule</a>}
      />
      <section className="grid gap-theme-md md:grid-cols-3">
        <FeatureCard
          title="Student surface"
          body="Browse workshops, inspect speaker and room details, register, and retrieve QR tickets after confirmation."
        />
        <FeatureCard
          title="Organizer surface"
          body="Manage workshop CRUD, view capacity pressure, inspect check-in counts, and follow CSV import health."
        />
        <FeatureCard
          title="Resilient flow"
          body="The frontend API layer is prepared for bearer auth, idempotency keys, rate-limit errors and degraded payment states."
        />
      </section>
    </>
  )
}
