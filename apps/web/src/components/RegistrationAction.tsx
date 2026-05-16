import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { getUserFacingError } from '../lib/apiErrorMessages'
import { formatCurrency } from '../lib/format'
import { addStoredNotification } from '../lib/notificationStore'
import {
  createRegistrationIdempotencyKey,
  getQrTicket,
  registerForWorkshop,
} from '../lib/registrationApi'
import {
  createStoredRegistration,
  getStoredRegistrationForWorkshop,
  saveStoredRegistration,
  subscribeToRegistrationChanges,
} from '../lib/registrationStore'
import type { SessionUser, StoredRegistration, Workshop } from '../types'
import { Notice } from './State'
import { buttonClass, focusClass, linkButtonClass, secondaryButtonClass } from './styles'

export function RegistrationAction({ user, workshop }: { user: SessionUser | null; workshop: Workshop }) {
  const [paymentToken, setPaymentToken] = useState('')
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [registration, setRegistration] = useState<StoredRegistration | null>(() =>
    user ? getStoredRegistrationForWorkshop(user.id, workshop.id) : null,
  )
  const pendingKeyRef = useRef<string | null>(null)
  const isPaidWorkshop = workshop.price > 0

  useEffect(() => {
    if (!user) return undefined
    const userId = user.id

    function refreshRegistration() {
      setRegistration(getStoredRegistrationForWorkshop(userId, workshop.id))
    }

    refreshRegistration()
    return subscribeToRegistrationChanges(refreshRegistration)
  }, [user, workshop.id])

  if (workshop.seatsRemaining === 0 && registration?.status !== 'CONFIRMED') {
    return <button className={secondaryButtonClass} type="button" disabled>Full</button>
  }

  if (!user) {
    return <a className={secondaryButtonClass} href="#/login">Log in to register</a>
  }

  if (user.role !== 'STUDENT') {
    return <button className={secondaryButtonClass} type="button" disabled>Student only</button>
  }
  const studentUser = user

  if (registration?.status === 'CONFIRMED') {
    return (
      <div className="grid gap-theme-sm">
        <span className="rounded-theme-md border border-status-success/40 bg-status-successBg px-theme-sm py-theme-xs text-sm font-bold text-status-success">
          Registered. QR ticket ready.
        </span>
        <a className={linkButtonClass} href="#/registrations">View QR</a>
      </div>
    )
  }

  return (
    <div className="grid gap-theme-sm">
      {isPaidWorkshop && isPaymentOpen ? (
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Payment token
          <input
            className={`min-h-10 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none ${focusClass}`}
            placeholder="demo-payment-token"
            value={paymentToken}
            disabled={isSubmitting}
            onChange={(event) => setPaymentToken(event.target.value)}
            aria-describedby={error ? `payment-error-${workshop.id}` : undefined}
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-theme-sm">
        <button
          className={isPaidWorkshop ? buttonClass : secondaryButtonClass}
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleRegistration()}
        >
          {getButtonLabel({ isPaidWorkshop, isPaymentOpen, isSubmitting, price: workshop.price })}
        </button>
        {isPaidWorkshop && isPaymentOpen ? (
          <button
            className={linkButtonClass}
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsPaymentOpen(false)
              setError(null)
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
      {message ? (
        <Notice tone="success" message={message} />
      ) : null}
      {error ? (
        <div id={`payment-error-${workshop.id}`}>
          <Notice tone="danger" message={error} />
        </div>
      ) : null}
    </div>
  )

  async function handleRegistration() {
    setMessage(null)
    setError(null)

    if (isPaidWorkshop && !isPaymentOpen) {
      setIsPaymentOpen(true)
      return
    }

    if (isPaidWorkshop && !paymentToken.trim()) {
      setError('Enter a payment token before registering for this paid workshop.')
      return
    }

    setIsSubmitting(true)
    pendingKeyRef.current = pendingKeyRef.current ?? createRegistrationIdempotencyKey(workshop.id)

    try {
      const response = await registerForWorkshop({
        workshopId: workshop.id,
        paymentToken: isPaidWorkshop ? paymentToken.trim() : undefined,
        idempotencyKey: pendingKeyRef.current,
      })
      const qrTicket = await fetchQrTicket(response.registration.id)
      const storedRegistration = createStoredRegistration({
        registration: response.registration,
        qrTicket,
        message: qrTicket ? undefined : 'Registration confirmed, but QR retrieval needs a retry.',
        status: response.registration.status,
        user: studentUser,
        workshop,
      })

      saveStoredRegistration(storedRegistration)
      addStoredNotification({
        userId: studentUser.id,
        title: 'Registration confirmed',
        message: `You are confirmed for ${workshop.title}. ${qrTicket ? 'Your QR ticket is ready.' : 'Open My QR to retry QR retrieval.'}`,
        registrationId: storedRegistration.id,
        workshopId: workshop.id,
      })
      setRegistration(storedRegistration)
      setMessage(qrTicket ? 'Registration confirmed. Your QR ticket is ready.' : 'Registration confirmed. Open My QR to retry QR retrieval.')
      setIsPaymentOpen(false)
      setPaymentToken('')
      pendingKeyRef.current = null
    } catch (caughtError) {
      const failureMessage = getRegistrationErrorMessage(caughtError)
      const failedRegistration = createStoredRegistration({
        message: failureMessage,
        paymentStatus: isPaidWorkshop ? 'FAILED' : undefined,
        status: 'CANCELLED',
        user: studentUser,
        workshop,
      })

      saveStoredRegistration(failedRegistration)
      setRegistration(failedRegistration)
      setError(failureMessage)
      if (!(caughtError instanceof TypeError)) {
        pendingKeyRef.current = null
      }
    } finally {
      setIsSubmitting(false)
    }
  }
}

async function fetchQrTicket(registrationId: string) {
  try {
    const qrResponse = await getQrTicket(registrationId)
    return qrResponse.qr
  } catch {
    return null
  }
}

function getButtonLabel({
  isPaidWorkshop,
  isPaymentOpen,
  isSubmitting,
  price,
}: {
  isPaidWorkshop: boolean
  isPaymentOpen: boolean
  isSubmitting: boolean
  price: number
}) {
  if (isSubmitting) return 'Registering...'
  if (!isPaidWorkshop) return 'Register'
  if (isPaymentOpen) return `Pay ${formatCurrency(price)}`
  return 'Register and pay'
}

function getRegistrationErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400 && /full/i.test(error.message)) {
      return 'This workshop filled up before your registration could be confirmed.'
    }
    if (error.status === 400 && /already registered/i.test(error.message)) {
      return 'You are already registered for this workshop.'
    }
    if (error.status === 409) {
      return 'A registration request for this workshop is already being processed. Please wait a moment.'
    }
    if (error.status === 429) {
      return 'Too many registration attempts during a traffic spike. Wait one minute, then retry; browsing the schedule still works.'
    }
    if (error.status === 503) {
      return 'Payment is temporarily unavailable. Your schedule browsing still works; try registration again shortly.'
    }
  }

  return getUserFacingError(error, {
    action: 'Registration',
    fallback: 'Registration failed. Please try again.',
    validation: 'Registration could not be submitted.',
  })
}
