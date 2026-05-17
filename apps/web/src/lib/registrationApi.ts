import type { QrTicket, Registration, StoredRegistration } from '../types'
import { apiRequest, createIdempotencyKey } from './api'

type RegistrationResponse = {
  success: true
  registration: Registration
}

type QrTicketResponse = {
  success: true
  qr: QrTicket
}

type MyRegistrationsResponse = {
  success: true
  items: StoredRegistration[]
}

export function createRegistrationIdempotencyKey(workshopId: string) {
  return createIdempotencyKey(`register-${workshopId}`)
}

export function registerForWorkshop({
  idempotencyKey,
  paymentToken,
  workshopId,
}: {
  idempotencyKey: string
  paymentToken?: string
  workshopId: string
}) {
  return apiRequest<RegistrationResponse>(`/workshops/${workshopId}/register`, {
    method: 'POST',
    body: paymentToken ? { paymentToken } : {},
    idempotencyKey,
  })
}

export function getQrTicket(registrationId: string) {
  return apiRequest<QrTicketResponse>(`/checkin/qr/${registrationId}`)
}

export function listMyRegistrations() {
  return apiRequest<MyRegistrationsResponse>('/registrations/me')
}
