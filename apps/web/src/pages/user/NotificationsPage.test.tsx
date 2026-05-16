import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { addStoredNotification, getStoredNotifications } from '../../lib/notificationStore'
import { NotificationsPage } from './NotificationsPage'

const user = {
  id: 'student-1',
  email: 'student@example.com',
  name: 'Student',
  role: 'STUDENT' as const,
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows an empty state before any notifications exist', () => {
    render(<NotificationsPage user={user} />)

    expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  })

  it('renders history and allows manual read acknowledgement', () => {
    addStoredNotification({
      userId: user.id,
      title: 'Registration confirmed',
      message: 'You are confirmed.',
      registrationId: 'registration-1',
    })

    render(<NotificationsPage user={user} />)

    expect(screen.getByText('Registration confirmed')).toBeInTheDocument()
    expect(screen.getByText('In-app')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }))
    expect(screen.getByText('Read')).toBeInTheDocument()
    expect(getStoredNotifications(user.id)[0].readAt).toBeTruthy()
  })
})
