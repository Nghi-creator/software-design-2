import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/State'
import { cardClass, secondaryButtonClass } from '../../components/styles'
import { formatCurrency, formatDateTime } from '../../lib/format'
import { getQrTicket } from '../../lib/registrationApi'
import {
  getStoredRegistrations,
  saveStoredRegistration,
  subscribeToRegistrationChanges,
} from '../../lib/registrationStore'
import type { SessionUser, StoredRegistration } from '../../types'

export function RegistrationsPage({ user }: { user: SessionUser }) {
  const [registrations, setRegistrations] = useState<StoredRegistration[]>(() =>
    getStoredRegistrations(user.id),
  )

  useEffect(() => {
    function refreshRegistrations() {
      setRegistrations(getStoredRegistrations(user.id))
    }

    refreshRegistrations()
    return subscribeToRegistrationChanges(refreshRegistrations)
  }, [user.id])

  return (
    <>
      <PageHeader
        eyebrow="Student"
        title="My registrations"
        description="Track pending, confirmed, cancelled and failed payment cases. Confirmed registrations can display their QR ticket here."
      />
      {registrations.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          message="Register for a workshop from the schedule and confirmed tickets will appear here."
        />
      ) : (
        <section className="grid gap-theme-md">
          {registrations.map((registration) => (
            <RegistrationCard
              key={`${registration.id}-${registration.updatedAt}`}
              registration={registration}
              onRegistrationChange={(nextRegistration) => saveStoredRegistration(nextRegistration)}
            />
          ))}
        </section>
      )}
    </>
  )
}

function RegistrationCard({
  registration,
  onRegistrationChange,
}: {
  registration: StoredRegistration
  onRegistrationChange: (registration: StoredRegistration) => void
}) {
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const statusContent = getRegistrationStatusContent(registration)

  return (
    <article className={`${cardClass} grid gap-theme-md p-theme-lg lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]`}>
      <div className="grid gap-theme-md">
        <div className="flex flex-wrap items-start justify-between gap-theme-sm">
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary">{registration.workshop.title}</h2>
            <p className="text-text-secondary">
              {registration.workshop.speaker} · {formatDateTime(registration.workshop.startTime)}
            </p>
          </div>
          <span className={`rounded-full px-theme-sm py-1 text-xs font-extrabold uppercase ${statusContent.badgeClass}`}>
            {statusContent.label}
          </span>
        </div>
        <dl className="grid gap-theme-sm text-sm md:grid-cols-3">
          <div>
            <dt className="text-text-muted">Room</dt>
            <dd className="font-bold text-text-primary">
              {registration.workshop.room?.name ?? registration.workshop.roomId}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Fee</dt>
            <dd className="font-bold text-text-primary">{formatCurrency(registration.workshop.price)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Payment</dt>
            <dd className="font-bold text-text-primary">{formatPaymentStatus(registration)}</dd>
          </div>
        </dl>
        {registration.message ? (
          <p className="rounded-theme-md border border-status-warning/40 bg-status-warningBg px-theme-md py-theme-sm text-sm font-bold text-status-warning">
            {registration.message}
          </p>
        ) : null}
      </div>
      <div className="grid content-start gap-theme-sm rounded-theme-md border border-border-subtle bg-background-subtle p-theme-md">
        <strong className="text-text-primary">QR ticket</strong>
        {registration.qrTicket ? (
          <QrTicket token={registration.qrTicket.qrCode} />
        ) : registration.status === 'CONFIRMED' ? (
          <>
            <p className="text-sm text-text-secondary">Confirmed, but the QR token has not been loaded yet.</p>
            <button
              className={secondaryButtonClass}
              type="button"
              disabled={isQrLoading}
              onClick={() => void retryQrTicket()}
            >
              {isQrLoading ? 'Fetching QR...' : 'Fetch QR'}
            </button>
            {qrError ? <p className="text-sm font-bold text-status-danger">{qrError}</p> : null}
          </>
        ) : (
          <p className="text-sm text-text-secondary">{statusContent.qrMessage}</p>
        )}
      </div>
    </article>
  )

  async function retryQrTicket() {
    setIsQrLoading(true)
    setQrError(null)

    try {
      const response = await getQrTicket(registration.id)
      onRegistrationChange({
        ...registration,
        qrTicket: response.qr,
        qrCode: response.qr.qrCode,
        message: null,
        updatedAt: new Date().toISOString(),
      })
    } catch {
      setQrError('QR is not ready yet. Try again in a moment.')
    } finally {
      setIsQrLoading(false)
    }
  }
}

function QrTicket({ token }: { token: string }) {
  return (
    <div className="grid gap-theme-sm">
      <div className="grid aspect-square place-items-center rounded-theme-md border border-border-strong bg-surface-inverse p-theme-md text-text-inverse">
        <div className="grid size-full grid-cols-5 gap-1" aria-hidden="true">
          {Array.from({ length: 25 }, (_, index) => (
            <span
              className={`rounded-sm ${getQrCellClass(token, index)}`}
              key={`${token}-${index}`}
            />
          ))}
        </div>
      </div>
      <code className="break-all rounded-theme-md bg-background-overlay px-theme-sm py-theme-xs text-xs text-text-secondary">
        {token}
      </code>
    </div>
  )
}

function getRegistrationStatusContent(registration: StoredRegistration) {
  if (registration.status === 'CONFIRMED') {
    return {
      label: 'Confirmed',
      badgeClass: 'bg-status-successBg text-status-success',
      qrMessage: 'QR ticket is being prepared.',
    }
  }

  if (registration.payment?.status === 'FAILED') {
    return {
      label: 'Payment failed',
      badgeClass: 'bg-status-dangerBg text-status-danger',
      qrMessage: 'No QR is issued for failed payment attempts.',
    }
  }

  if (registration.status === 'PENDING') {
    return {
      label: 'Pending',
      badgeClass: 'bg-status-warningBg text-status-warning',
      qrMessage: 'QR ticket will appear after confirmation.',
    }
  }

  return {
    label: 'Cancelled',
    badgeClass: 'bg-background-overlay text-text-muted',
    qrMessage: 'No QR is issued for cancelled registrations.',
  }
}

function formatPaymentStatus(registration: StoredRegistration) {
  if (registration.workshop.price === 0) {
    return registration.status === 'CONFIRMED' ? 'Free' : 'No charge'
  }

  const status = registration.payment?.status ?? 'PENDING'

  switch (status) {
    case 'SUCCESS':
      return 'Paid'
    case 'FAILED':
      return 'Failed'
    case 'PENDING':
      return 'Pending'
  }
}

function getQrCellClass(token: string, index: number) {
  const codePoint = token.charCodeAt(index % token.length) || index
  return (codePoint + index) % 3 === 0 ? 'bg-text-inverse' : 'bg-transparent'
}
