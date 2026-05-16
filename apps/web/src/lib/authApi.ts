import { apiRequest } from './api'
import type { SessionUser } from '../types'

export type AuthResponse = {
  user: SessionUser
  accessToken: string
}

export type MeResponse = {
  user: SessionUser
}

export function loginWithPassword(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  })
}

export function getCurrentUser() {
  return apiRequest<MeResponse>('/auth/me')
}
