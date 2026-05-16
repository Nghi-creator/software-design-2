
import type {
  AiSummaryStatus,
  Workshop,
  WorkshopAvailabilityFilter,
  WorkshopFilters,
  WorkshopSortBy,
} from '../types'

export type WorkshopCatalogSource = 'api' | 'fallback'

export const defaultWorkshopFilters: WorkshopFilters = {
  query: '',
  day: 'all',
  availability: 'all',
  sortBy: 'startTime',
}


export function getWorkshopDayOptions(workshops: Workshop[]) {
  const days = new Map<string, string>()

  workshops.forEach((workshop) => {
    const date = new Date(workshop.startTime)
    const value = date.toISOString().slice(0, 10)
    days.set(value, formatDayOption(date))
  })

  return Array.from(days, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.value.localeCompare(b.value),
  )
}

export function filterAndSortWorkshops(workshops: Workshop[], filters: WorkshopFilters) {
  return workshops
    .filter((workshop) => matchesSearch(workshop, filters.query))
    .filter((workshop) => matchesDay(workshop, filters.day))
    .filter((workshop) => matchesAvailability(workshop, filters.availability))
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

function matchesDay(workshop: Workshop, day: string) {
  if (day === 'all') return true
  return workshop.startTime.slice(0, 10) === day
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

function formatDayOption(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date)
}
