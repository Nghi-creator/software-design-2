import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/State'

export function AdminImportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Organizer"
        title="CSV import health"
        description="Protected route for latest legacy student import status and row-level validation errors."
      />
      <LoadingState label="Import endpoints are ready to connect..." />
    </>
  )
}
