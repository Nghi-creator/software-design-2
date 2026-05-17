import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationBanner } from './NotificationBanner'

const notificationStore = vi.hoisted(() => ({
  markNotificationRead: vi.fn(async (notificationId: string) => ({
    id: notificationId,
    userId: 'student-1',
    title: 'Registration confirmed',
    message: 'You are confirmed.',
    channel: 'email' as const,
    status: 'sent' as const,
    createdAt: '2026-05-17T09:00:00.000Z',
    readAt: '2026-05-17T09:00:10.000Z',
  })),
}))

vi.mock('../lib/notificationStore', () => ({
  getStoredNotifications: async () => [
    {
      id: 'notification-1',
      userId: 'student-1',
      title: 'Registration confirmed',
      message: 'You are confirmed.',
      channel: 'email',
      status: 'sent',
      createdAt: '2026-05-17T09:00:00.000Z',
    },
  ],
  markNotificationRead: (notificationId: string) => notificationStore.markNotificationRead(notificationId),
}))

const user = {
  id: 'student-1',
  email: 'student@example.com',
  name: 'Student',
  role: 'STUDENT' as const,
}

describe('NotificationBanner', () => {
  beforeEach(() => {
    notificationStore.markNotificationRead.mockClear()
  })

  it('shows the latest unread notification and auto-marks it read', async () => {
    render(<NotificationBanner autoReadDelayMs={1} user={user} />)

    expect(await screen.findByText('Registration confirmed')).toBeInTheDocument()
    await waitFor(() => expect(notificationStore.markNotificationRead).toHaveBeenCalledWith('notification-1'))
  })
})
