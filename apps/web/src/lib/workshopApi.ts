import type { AiSummaryStatus, PaginatedResponse, Room, Workshop, WorkshopStats } from '../types'
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

export function listRooms() {
  const params = new URLSearchParams({
    pageSize: '100',
    sortBy: 'name',
    sortOrder: 'asc',
  })

  return apiRequest<PaginatedResponse<Room>>(`/rooms?${params.toString()}`, {
    skipAuth: true,
  })
}

export type WorkshopFormInput = {
  title: string
  speaker: string
  roomId: string
  capacity: number
  price: number
  startTime: string
  pdf?: File | null
}

export type RoomFormInput = {
  name: string
  location: string
  capacity: number
  layoutUrl?: string | null
}

export type WorkshopSummaryStatus = {
  workshopId: string
  status: AiSummaryStatus
  pdfUrl?: string | null
}

export function createRoom(input: RoomFormInput) {
  return apiRequest<Room>('/rooms', {
    method: 'POST',
    body: input,
  })
}

export function updateRoom(roomId: string, input: RoomFormInput) {
  return apiRequest<Room>(`/rooms/${roomId}`, {
    method: 'PUT',
    body: input,
  })
}

export function createWorkshop(input: WorkshopFormInput) {
  if (input.pdf) {
    const body = new FormData()
    appendWorkshopFormFields(body, input)
    body.append('pdf', input.pdf)
    return apiRequest<Workshop>('/workshops', { method: 'POST', body })
  }

  return apiRequest<Workshop>('/workshops', {
    method: 'POST',
    body: getWorkshopJsonBody(input),
  })
}

export function updateWorkshop(workshopId: string, input: WorkshopFormInput) {
  if (input.pdf) {
    const body = new FormData()
    appendWorkshopFormFields(body, input)
    body.append('pdf', input.pdf)
    return apiRequest<Workshop>(`/workshops/${workshopId}`, { method: 'PUT', body })
  }

  return apiRequest<Workshop>(`/workshops/${workshopId}`, {
    method: 'PUT',
    body: getWorkshopJsonBody(input),
  })
}

export function deleteWorkshop(workshopId: string) {
  return apiRequest<void>(`/workshops/${workshopId}`, { method: 'DELETE' })
}

export function getWorkshopStats(workshopId: string) {
  return apiRequest<WorkshopStats>(`/workshops/${workshopId}/stats`)
}

export function getWorkshopSummaryStatus(workshopId: string) {
  return apiRequest<WorkshopSummaryStatus>(`/workshops/${workshopId}/summary-status`)
}

function appendWorkshopFormFields(body: FormData, input: WorkshopFormInput) {
  body.append('title', input.title)
  body.append('speaker', input.speaker)
  body.append('roomId', input.roomId)
  body.append('capacity', String(input.capacity))
  body.append('price', String(input.price))
  body.append('startTime', input.startTime)
}

function getWorkshopJsonBody(input: WorkshopFormInput) {
  return {
    title: input.title,
    speaker: input.speaker,
    roomId: input.roomId,
    capacity: input.capacity,
    price: input.price,
    startTime: input.startTime,
  }
}
