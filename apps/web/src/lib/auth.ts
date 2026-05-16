import type { SessionUser } from '../types'
import type { Role } from '../types'

export type StoredSession = {
  user: SessionUser
  accessToken: string
}

const SESSION_STORAGE_KEY = 'unihub.session'

export function getStoredSession(): StoredSession | null {
  const rawSession = localStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawSession) return null

  try {
    const parsedSession = JSON.parse(rawSession) as Partial<StoredSession>

    if (!isStoredSession(parsedSession)) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }

    return parsedSession
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

export function getAccessToken() {
  return getStoredSession()?.accessToken ?? null
}

export function saveStoredSession(session: StoredSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

function isStoredSession(value: Partial<StoredSession>): value is StoredSession {
  return (
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    isSessionUser(value.user)
  )
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false

  const user = value as Partial<SessionUser>

  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.name === 'string' &&
    isRole(user.role)
  )
}

function isRole(value: unknown): value is Role {
  return value === 'STUDENT' || value === 'ORGANIZER' || value === 'CHECKIN_STAFF'
}
