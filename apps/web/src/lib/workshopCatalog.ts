
import type {
  AiSummaryStatus,
  Workshop,
  WorkshopAvailabilityFilter,
  WorkshopFilters,
  WorkshopRegistrationFilter,
  WorkshopSortBy,
} from '../types'

export type WorkshopCatalogSource = 'api' | 'fallback'

export const defaultWorkshopFilters: WorkshopFilters = {
  query: '',
  startDate: '',
  endDate: '',
  availability: 'all',
  registration: 'all',
  sortBy: 'startTime',
}

export function filterAndSortWorkshops(
  workshops: Workshop[],
  filters: WorkshopFilters,
  registeredWorkshopIds = new Set<string>(),
) {
  return workshops
    .filter((workshop) => matchesSearch(workshop, filters.query))
    .filter((workshop) => matchesDateRange(workshop, filters.startDate, filters.endDate))
    .filter((workshop) => matchesAvailability(workshop, filters.availability))
    .filter((workshop) => matchesRegistration(workshop, filters.registration, registeredWorkshopIds))
    .sort((first, second) => compareWorkshops(first, second, filters.sortBy))
}

export function getWorkshopSummaryStatus(workshop: Workshop): AiSummaryStatus {
  if (workshop.aiSummaryStatus) return workshop.aiSummaryStatus
  if (workshop.aiSummary) return 'ready'
  if (workshop.pdfUrl) return 'processing'
  return 'not_uploaded'
}

function matchesSearch(workshop: Workshop, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  const searchableValues = [
    workshop.title,
    workshop.speaker,
    workshop.room?.name,
    workshop.room?.location,
    workshop.roomId,
  ].filter((value): value is string => Boolean(value))

  return searchableValues.some((value) => value.toLowerCase().includes(normalizedQuery))
}

function matchesDateRange(workshop: Workshop, startDate: string, endDate: string) {
  const workshopDate = workshop.startTime.slice(0, 10)

  if (startDate && workshopDate < startDate) return false
  if (endDate && workshopDate > endDate) return false
  return true
}

function matchesAvailability(workshop: Workshop, availability: WorkshopAvailabilityFilter) {
  switch (availability) {
    case 'hasSeats':
      return workshop.seatsRemaining > 0
    case 'free':
      return workshop.price === 0
    case 'paid':
      return workshop.price > 0
    case 'all':
      return true
  }
}

function matchesRegistration(
  workshop: Workshop,
  registration: WorkshopRegistrationFilter,
  registeredWorkshopIds: Set<string>,
) {
  switch (registration) {
    case 'registered':
      return registeredWorkshopIds.has(workshop.id)
    case 'unregistered':
      return !registeredWorkshopIds.has(workshop.id)
    case 'all':
      return true
  }
}

function compareWorkshops(first: Workshop, second: Workshop, sortBy: WorkshopSortBy) {
  switch (sortBy) {
    case 'title':
      return first.title.localeCompare(second.title)
    case 'speaker':
      return first.speaker.localeCompare(second.speaker)
    case 'price':
      return first.price - second.price
    case 'seatsRemaining':
      return second.seatsRemaining - first.seatsRemaining
    case 'startTime':
      return new Date(first.startTime).getTime() - new Date(second.startTime).getTime()
  }
}
