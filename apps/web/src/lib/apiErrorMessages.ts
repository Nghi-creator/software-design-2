import { ApiError } from './api'

type ErrorContext = {
  action: string
  fallback?: string
  notFound?: string
  validation?: string
}

export function getUserFacingError(error: unknown, context: ErrorContext) {
  if (error instanceof ApiError) {
    const details = getValidationDetails(error.body?.details)

    switch (error.status) {
      case 400:
        return details
          ? `${context.validation ?? 'Some fields need attention.'} ${details}`
          : error.message
      case 401:
        return 'Your session has expired. Log in again, then retry this action.'
      case 403:
        return 'You do not have permission for this action with the current account.'
      case 404:
        return context.notFound ?? 'The requested UniHub resource was not found.'
      case 429:
        return `${context.action} is receiving too much traffic. Wait a minute, then try again.`
      case 500:
        return `${context.action} hit a server error. Please retry shortly.`
      default:
        return error.message
    }
  }

  if (error instanceof TypeError) {
    return `${context.action} could not reach the UniHub API. Check the backend connection, then try again.`
  }

  return context.fallback ?? `${context.action} failed. Please try again.`
}

function getValidationDetails(details: unknown) {
  if (typeof details === 'string') return details
  if (!details || typeof details !== 'object') return null

  if (Array.isArray(details)) {
    return details.map(String).join(' ')
  }

  return Object.entries(details)
    .map(([field, message]) => `${field}: ${String(message)}`)
    .join(' ')
}
