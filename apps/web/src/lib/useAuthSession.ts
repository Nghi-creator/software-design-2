import { useEffect, useState } from 'react'
import { getCurrentUser, loginWithPassword } from './authApi'
import { clearStoredSession, getStoredSession, saveStoredSession } from './auth'
import type { AuthStatus, LoginCredentials, Role, SessionUser } from '../types'

export function useAuthSession() {
  const [initialSession] = useState(() => getStoredSession())
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => initialSession?.user ?? null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => (initialSession ? 'checking' : 'guest'))
  const [authNotice, setAuthNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!authNotice) return undefined

    const timeoutId = window.setTimeout(() => setAuthNotice(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [authNotice])

  useEffect(() => {
    let isMounted = true

    if (!initialSession) return undefined

    getCurrentUser()
      .then(({ user }) => {
        if (!isMounted) return
        saveStoredSession({ user, accessToken: initialSession.accessToken })
        setSessionUser(user)
        setAuthStatus('authenticated')
      })
      .catch(() => {
        if (!isMounted) return
        clearStoredSession()
        setSessionUser(null)
        setAuthStatus('guest')
        setAuthNotice('Your saved session could not be verified. Please log in again.')
      })

    return () => {
      isMounted = false
    }
  }, [initialSession])

  async function login(credentials: LoginCredentials) {
    const authResponse = await loginWithPassword(credentials.email, credentials.password)
    saveStoredSession(authResponse)
    setSessionUser(authResponse.user)
    setAuthStatus('authenticated')
    setAuthNotice(null)
    window.location.hash = getPostLoginPath(authResponse.user.role)
  }

  function logout() {
    clearStoredSession()
    setSessionUser(null)
    setAuthStatus('guest')
    setAuthNotice('You have been logged out.')
    window.location.hash = '/'
  }

  return {
    authNotice,
    authStatus,
    login,
    logout,
    sessionUser,
  }
}

function getPostLoginPath(role: Role) {
  if (role === 'ORGANIZER') return '/admin'
  if (role === 'STUDENT') return '/workshops'
  return '/'
}
