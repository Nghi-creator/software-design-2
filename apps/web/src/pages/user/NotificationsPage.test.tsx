import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsPage } from './NotificationsPage'

const notificationStore = vi.hoisted(() => ({
  getStoredNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}))

vi.mock('../../lib/notificationStore', () => ({
  getStoredNotifications: () => notificationStore.getStoredNotifications(),
  markNotificationRead: (notificationId: string) => notificationStore.markNotificationRead(notificationId),
}))

const user = {
  id: 'student-1',
  email: 'student@example.com',
  name: 'Student',
  role: 'STUDENT' as const,
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    notificationStore.getStoredNotifications.mockReset()
    notificationStore.markNotificationRead.mockReset()
  })

  it('shows an empty state before any notifications exist', async () => {
    notificationStore.getStoredNotifications.mockResolvedValue([])

    render(<NotificationsPage user={user} />)

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
  })

  it('renders history and allows manual read acknowledgement', async () => {
    notificationStore.getStoredNotifications.mockResolvedValue([
      {
        id: 'notification-1',
        userId: user.id,
        title: 'Registration confirmed',
        message: 'You are confirmed.',
        channel: 'email',
        status: 'sent',
        createdAt: '2026-05-17T09:00:00.000Z',
        registrationId: 'registration-1',
      },
    ])
    notificationStore.markNotificationRead.mockResolvedValue({
      id: 'notification-1',
      userId: user.id,
      title: 'Registration confirmed',
      message: 'You are confirmed.',
      channel: 'email',
      status: 'sent',
      createdAt: '2026-05-17T09:00:00.000Z',
      readAt: '2026-05-17T09:01:00.000Z',
      registrationId: 'registration-1',
    })

    render(<NotificationsPage user={user} />)

    expect(await screen.findByText('Registration confirmed')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    await waitFor(() => expect(screen.getByText('Read')).toBeInTheDocument())
  })
})
