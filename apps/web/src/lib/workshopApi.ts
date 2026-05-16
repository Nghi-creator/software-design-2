import type { PaginatedResponse, Workshop } from '../types'
import { apiRequest } from './api'

export function listWorkshops() {
  const params = new URLSearchParams({
    pageSize: '100',
    sortBy: 'startTime',
    sortOrder: 'asc',
  })

  return apiRequest<PaginatedResponse<Workshop>>(`/workshops?${params.toString()}`, {
    skipAuth: true,
  })
}
