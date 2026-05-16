import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addStoredNotification, getStoredNotifications } from '../lib/notificationStore'
import { NotificationBanner } from './NotificationBanner'

const user = {
  id: 'student-1',
  email: 'student@example.com',
  name: 'Student',
  role: 'STUDENT' as const,
}

describe('NotificationBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  it('shows the latest unread in-app notification and auto-marks it read', () => {
    addStoredNotification({
      userId: user.id,
      title: 'Registration confirmed',
      message: 'You are confirmed.',
    })

    render(<NotificationBanner user={user} />)

    expect(screen.getByText('Registration confirmed')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(getStoredNotifications(user.id)[0].readAt).toBeTruthy()
  })
})
