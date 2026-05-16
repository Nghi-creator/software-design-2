import { useMemo } from 'react'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { useAuthSession } from './lib/useAuthSession'
import { useHashRoute } from './lib/router'
import { AdminHomePage } from './pages/admin/AdminHomePage'
import { AdminImportsPage } from './pages/admin/AdminImportsPage'
import { AdminWorkshopsPage } from './pages/admin/AdminWorkshopsPage'
import { HomePage } from './pages/user/HomePage'
import { LoginPage } from './pages/user/LoginPage'
import { NotFoundPage } from './pages/user/NotFoundPage'
import { NotificationsPage } from './pages/user/NotificationsPage'
import { RegistrationsPage } from './pages/user/RegistrationsPage'
import { WorkshopDetailPage } from './pages/user/WorkshopDetailPage'
import { WorkshopsPage } from './pages/user/WorkshopsPage'
import type { AuthStatus, LoginCredentials, NavItem, Route, SessionUser } from './types'

const publicNav: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Schedule', path: '/workshops' },
  { label: 'My QR', path: '/registrations', roles: ['STUDENT'] },
  { label: 'Notifications', path: '/notifications', roles: ['STUDENT'] },
  { label: 'Admin', path: '/admin', roles: ['ORGANIZER'] },
]

function App() {
  const route = useHashRoute()
  const { authNotice, authStatus, login, logout, sessionUser } = useAuthSession()
  const visibleNav = useMemo(
    () => publicNav.filter((item) => canSeeNavItem(item, sessionUser)),
    [sessionUser],
  )

  return (
    <AppLayout
      activePath={route.path}
      navItems={visibleNav}
      notice={authNotice}
      user={sessionUser}
      onLogout={logout}
    >
      <RouteRenderer
        authStatus={authStatus}
        route={route}
        user={sessionUser}
        onLogin={login}
      />
    </AppLayout>
  )
}

function RouteRenderer({
  authStatus,
  route,
  user,
  onLogin,
}: {
  authStatus: AuthStatus
  route: Route
  user: SessionUser | null
  onLogin: (credentials: LoginCredentials) => Promise<void>
}) {
  switch (route.key) {
    case 'home':
      return <HomePage />
    case 'workshops':
      return <WorkshopsPage user={user} />
    case 'workshopDetail':
      return <WorkshopDetailPage user={user} workshopId={route.params.id} />
    case 'registrations':
      return (
        <ProtectedRoute authStatus={authStatus} user={user} allowedRoles={['STUDENT']}>
          {user ? <RegistrationsPage user={user} /> : null}
        </ProtectedRoute>
      )
    case 'notifications':
      return (
        <ProtectedRoute authStatus={authStatus} user={user} allowedRoles={['STUDENT']}>
          {user ? <NotificationsPage user={user} /> : null}
        </ProtectedRoute>
      )
    case 'login':
      return <LoginPage user={user} onLogin={onLogin} />
    case 'admin':
      return (
        <ProtectedRoute authStatus={authStatus} user={user} allowedRoles={['ORGANIZER']}>
          <AdminHomePage />
        </ProtectedRoute>
      )
    case 'adminWorkshops':
      return (
        <ProtectedRoute authStatus={authStatus} user={user} allowedRoles={['ORGANIZER']}>
          <AdminWorkshopsPage />
        </ProtectedRoute>
      )
    case 'adminImports':
      return (
        <ProtectedRoute authStatus={authStatus} user={user} allowedRoles={['ORGANIZER']}>
          <AdminImportsPage />
        </ProtectedRoute>
      )
    case 'notFound':
      return <NotFoundPage />
  }
}

function canSeeNavItem(item: NavItem, user: SessionUser | null) {
  if (!item.roles) return true
  return Boolean(user && item.roles.includes(user.role))
}

export default App
