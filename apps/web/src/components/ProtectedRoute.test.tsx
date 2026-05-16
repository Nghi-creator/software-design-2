import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

const organizer = {
  id: 'organizer-1',
  email: 'organizer@example.test',
  name: 'Organizer One',
  role: 'ORGANIZER' as const,
  studentId: null,
}

const student = {
  ...organizer,
  id: 'student-1',
  email: 'student@example.test',
  name: 'Student One',
  role: 'STUDENT' as const,
  studentId: 's-1',
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth is still resolving', () => {
    render(
      <ProtectedRoute authStatus="checking" user={null} allowedRoles={['ORGANIZER']}>
        <div>secret admin page</div>
      </ProtectedRoute>,
    )

    expect(screen.getByLabelText('Checking your UniHub session')).toBeInTheDocument()
  })

  it('blocks guests from internal pages', () => {
    render(
      <ProtectedRoute authStatus="guest" user={null} allowedRoles={['ORGANIZER']}>
        <div>secret admin page</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Log in required')).toBeInTheDocument()
    expect(screen.queryByText('secret admin page')).not.toBeInTheDocument()
  })

  it('blocks authenticated users with the wrong role', () => {
    render(
      <ProtectedRoute authStatus="authenticated" user={student} allowedRoles={['ORGANIZER']}>
        <div>secret admin page</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('Access denied')).toBeInTheDocument()
    expect(screen.getByText(/Student One is signed in as student/i)).toBeInTheDocument()
    expect(screen.queryByText('secret admin page')).not.toBeInTheDocument()
  })

  it('renders the page for the allowed role', () => {
    render(
      <ProtectedRoute authStatus="authenticated" user={organizer} allowedRoles={['ORGANIZER']}>
        <div>secret admin page</div>
      </ProtectedRoute>,
    )

    expect(screen.getByText('secret admin page')).toBeInTheDocument()
  })
})
