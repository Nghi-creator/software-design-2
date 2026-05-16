import type { Role } from '../types'

export function formatRole(role: Role) {
  return role.replace('_', ' ').toLowerCase()
}
