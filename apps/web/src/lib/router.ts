import { useEffect, useState } from 'react'
import type { Route } from '../types'

export function getRouteFromHash(): Route {
  const hashPath = window.location.hash.replace(/^#/, '') || '/'
  const path = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  const parts = path.split('/').filter(Boolean)

  if (path === '/') return { key: 'home', path, params: {} }
  if (path === '/workshops') return { key: 'workshops', path, params: {} }
  if (parts[0] === 'workshops' && parts[1]) {
    return { key: 'workshopDetail', path, params: { id: parts[1] } }
  }
  if (path === '/registrations') return { key: 'registrations', path, params: {} }
  if (path === '/login') return { key: 'login', path, params: {} }
  if (path === '/admin') return { key: 'admin', path, params: {} }
  if (path === '/admin/workshops') return { key: 'adminWorkshops', path, params: {} }
  if (path === '/admin/imports') return { key: 'adminImports', path, params: {} }

  return { key: 'notFound', path, params: {} }
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => getRouteFromHash())

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route
}
