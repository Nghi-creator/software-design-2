import { getAccessToken } from './auth'

export type ApiErrorBody = {
  message?: string
  error?: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  body: ApiErrorBody | null

  constructor(status: number, body: ApiErrorBody | null, fallbackMessage: string) {
    super(body?.message ?? body?.error ?? fallbackMessage)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  idempotencyKey?: string
  skipAuth?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export function createIdempotencyKey(prefix = 'web') {
  if (crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = options.skipAuth ? null : getAccessToken()

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)

  let body: BodyInit | undefined

  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const responseBody = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(response.status, getErrorBody(responseBody), getFallbackMessage(response.status))
  }

  return responseBody as T
}

async function parseResponseBody(response: Response): Promise<ApiErrorBody | unknown | null> {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text) as ApiErrorBody | unknown
  } catch {
    return { message: text }
  }
}

function getFallbackMessage(status: number) {
  switch (status) {
    case 400:
      return 'The request could not be validated.'
    case 401:
      return 'Please log in again.'
    case 403:
      return 'You do not have permission for this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return 'This action conflicts with the current workshop state.'
    case 429:
      return 'Too many requests. Please wait before trying again.'
    case 500:
      return 'The UniHub server hit an error. Please retry shortly.'
    case 503:
      return 'This feature is temporarily degraded.'
    default:
      return 'Something went wrong while contacting UniHub.'
  }
}

function getErrorBody(body: unknown): ApiErrorBody | null {
  if (!body || typeof body !== 'object') return null
  return body as ApiErrorBody
}
