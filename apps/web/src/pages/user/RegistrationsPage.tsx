import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/State'

export function RegistrationsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Student"
        title="My registrations"
        description="A protected route for confirmed workshops, payment states, and QR ticket retrieval."
      />
      <EmptyState
        title="No registrations loaded yet"
        message="Once registration API wiring is added, pending, confirmed, cancelled and failed-payment states will appear here."
      />
    </>
  )
}
