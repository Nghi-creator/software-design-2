import type { ReactNode } from 'react'
import { formatRole } from '../lib/roles'
import type { AuthStatus, Role, SessionUser } from '../types'
import { PanelSkeleton, StatePanel } from './State'
import { buttonClass, secondaryButtonClass } from './styles'

type ProtectedRouteProps = {
  authStatus: AuthStatus
  user: SessionUser | null
  allowedRoles: Role[]
  children: ReactNode
}

export function ProtectedRoute({ authStatus, user, allowedRoles, children }: ProtectedRouteProps) {
  if (authStatus === 'checking') {
    return <PanelSkeleton label="Checking your UniHub session" />
  }

  if (!user) {
    return (
      <StatePanel
        title="Log in required"
        message="This page is protected. Log in with an account that has the required UniHub role."
        action={<a className={buttonClass} href="#/login">Go to login</a>}
      />
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <StatePanel
        title="Access denied"
        message={`${user.name} is signed in as ${formatRole(user.role)}. This page is reserved for ${allowedRoles.map(formatRole).join(', ')}.`}
        action={<a className={secondaryButtonClass} href="#/workshops">Back to schedule</a>}
      />
    )
  }

  return children
}
