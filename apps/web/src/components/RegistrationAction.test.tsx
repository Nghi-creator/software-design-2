import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RegistrationAction } from './RegistrationAction'
import { getStoredNotifications } from '../lib/notificationStore'

vi.mock('../lib/registrationApi', () => ({
  createRegistrationIdempotencyKey: () => 'idem-1',
  registerForWorkshop: async () => ({
    registration: {
      id: 'registration-1',
      workshopId: 'workshop-1',
      status: 'CONFIRMED',
      qrCode: 'qr-1',
    },
  }),
  getQrTicket: async () => ({
    qr: {
      registrationId: 'registration-1',
      workshopId: 'workshop-1',
      workshopTitle: 'Distributed Systems',
      qrCode: 'qr-1',
    },
  }),
}))

const user = {
  id: 'student-1',
  email: 'student@example.com',
  name: 'Student',
  role: 'STUDENT' as const,
}

const workshop = {
  id: 'workshop-1',
  title: 'Distributed Systems',
  speaker: 'Ada',
  roomId: 'room-1',
  startTime: '2026-05-17T09:00:00.000Z',
  capacity: 60,
  seatsRemaining: 10,
  price: 0,
}

describe('RegistrationAction notification behavior', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates an in-app confirmation after successful registration', async () => {
    render(<RegistrationAction user={user} workshop={workshop} />)

    fireEvent.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => expect(screen.getByText('Registered')).toBeInTheDocument())
    expect(getStoredNotifications(user.id)).toMatchObject([
      {
        title: 'Registration confirmed',
        channel: 'in_app',
        status: 'sent',
        registrationId: 'registration-1',
        workshopId: 'workshop-1',
      },
    ])
  })
})
