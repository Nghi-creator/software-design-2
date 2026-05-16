import type { PaymentStatus, RegistrationStatus, SessionUser, StoredRegistration, Workshop } from '../types'

const REGISTRATION_STORAGE_KEY = 'unihub.registrations'
const REGISTRATION_EVENT = 'unihub:registrations-changed'

export function getStoredRegistrations(userId: string) {
  return readStoredRegistrations()
    .filter((registration) => getRegistrationOwnerId(registration) === userId)
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
}

export function getStoredRegistrationForWorkshop(userId: string, workshopId: string) {
  return getStoredRegistrations(userId).find((registration) => registration.workshopId === workshopId) ?? null
}

export function saveStoredRegistration(registration: StoredRegistration) {
  const registrations = readStoredRegistrations()
  const nextRegistrations = [
    registration,
    ...registrations.filter((item) => item.id !== registration.id),
  ]

  localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(nextRegistrations))
  window.dispatchEvent(new Event(REGISTRATION_EVENT))
}

export function subscribeToRegistrationChanges(listener: () => void) {
  window.addEventListener(REGISTRATION_EVENT, listener)
  window.addEventListener('storage', listener)

  return () => {
    window.removeEventListener(REGISTRATION_EVENT, listener)
    window.removeEventListener('storage', listener)
  }
}

export function getStoredRegistrationSnapshot() {
  return localStorage.getItem(REGISTRATION_STORAGE_KEY) ?? ''
}

export function createStoredRegistration({
  message,
  paymentStatus,
  qrTicket,
  registration,
  status,
  user,
  workshop,
}: {
  message?: string
  paymentStatus?: PaymentStatus
  qrTicket?: StoredRegistration['qrTicket']
  registration?: Partial<StoredRegistration>
  status: RegistrationStatus
  user: SessionUser
  workshop: Workshop
}): StoredRegistration {
  const now = new Date().toISOString()
  const registrationId = registration?.id ?? `local-${workshop.id}-${Date.now()}`

  return {
    id: registrationId,
    userId: registration?.userId ?? user.id,
    studentId: registration?.studentId ?? user.studentId ?? undefined,
    workshopId: workshop.id,
    status,
    qrCode: registration?.qrCode ?? qrTicket?.qrCode ?? '',
    checkedInAt: registration?.checkedInAt ?? null,
    workshop,
    payment: {
      id: registration?.payment?.id ?? `local-payment-${registrationId}`,
      registrationId,
      amount: workshop.price,
      status: paymentStatus ?? registration?.payment?.status ?? (status === 'CONFIRMED' ? 'SUCCESS' : 'FAILED'),
      transactionId: registration?.payment?.transactionId ?? null,
      idempotencyKey: registration?.payment?.idempotencyKey ?? '',
    },
    qrTicket,
    message,
    createdAt: registration?.createdAt ?? now,
    updatedAt: now,
  }
}

function readStoredRegistrations(): StoredRegistration[] {
  const rawRegistrations = localStorage.getItem(REGISTRATION_STORAGE_KEY)
  if (!rawRegistrations) return []

  try {
    const registrations = JSON.parse(rawRegistrations) as StoredRegistration[]
    return Array.isArray(registrations) ? registrations.filter(isStoredRegistration) : []
  } catch {
    localStorage.removeItem(REGISTRATION_STORAGE_KEY)
    return []
  }
}

function isStoredRegistration(value: unknown): value is StoredRegistration {
  if (!value || typeof value !== 'object') return false
  const registration = value as Partial<StoredRegistration>

  return (
    typeof registration.id === 'string' &&
    typeof registration.workshopId === 'string' &&
    typeof registration.status === 'string' &&
    Boolean(registration.workshop)
  )
}

function getRegistrationOwnerId(registration: StoredRegistration) {
  return registration.userId ?? registration.studentId
}
