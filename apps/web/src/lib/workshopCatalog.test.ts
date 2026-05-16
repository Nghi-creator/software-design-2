import { describe, expect, it } from 'vitest'
import { defaultWorkshopFilters, filterAndSortWorkshops } from './workshopCatalog'
import type { Workshop } from '../types'

const workshops: Workshop[] = [
  {
    id: 'w-1',
    title: 'Distributed Systems',
    speaker: 'Ada',
    roomId: 'r-1',
    room: {
      id: 'r-1',
      name: 'Innovation Hall',
      location: 'Building A',
      capacity: 60,
      layoutUrl: 'https://example.test/maps/a',
    },
    startTime: '2026-05-17T09:00:00.000Z',
    capacity: 60,
    seatsRemaining: 5,
    price: 0,
  },
  {
    id: 'w-2',
    title: 'AI Product',
    speaker: 'Grace',
    roomId: 'r-2',
    room: {
      id: 'r-2',
      name: 'AI Lab',
      location: 'Building B',
      capacity: 40,
      layoutUrl: null,
    },
    startTime: '2026-05-18T09:00:00.000Z',
    capacity: 40,
    seatsRemaining: 0,
    price: 50,
  },
  {
    id: 'w-3',
    title: 'Security',
    speaker: 'Lin',
    roomId: 'r-3',
    startTime: '2026-05-19T09:00:00.000Z',
    capacity: 30,
    seatsRemaining: 20,
    price: 20,
  },
]

describe('workshop catalog requirement filtering', () => {
  it('searches across title, speaker, room name, and room location', () => {
    expect(filterAndSortWorkshops(workshops, { ...defaultWorkshopFilters, query: 'ada' }).map((item) => item.id)).toEqual(['w-1'])
    expect(filterAndSortWorkshops(workshops, { ...defaultWorkshopFilters, query: 'building b' }).map((item) => item.id)).toEqual(['w-2'])
  })

  it('supports week-range, free/paid, and live-seat filtering together', () => {
    expect(
      filterAndSortWorkshops(workshops, {
        ...defaultWorkshopFilters,
        startDate: '2026-05-17',
        endDate: '2026-05-18',
        availability: 'paid',
      }).map((item) => item.id),
    ).toEqual(['w-2'])

    expect(
      filterAndSortWorkshops(workshops, {
        ...defaultWorkshopFilters,
        availability: 'hasSeats',
      }).map((item) => item.id),
    ).toEqual(['w-1', 'w-3'])
  })

  it('splits registered and unregistered views and sorts by seats remaining descending', () => {
    const registeredWorkshopIds = new Set(['w-2'])

    expect(
      filterAndSortWorkshops(workshops, {
        ...defaultWorkshopFilters,
        registration: 'registered',
      }, registeredWorkshopIds).map((item) => item.id),
    ).toEqual(['w-2'])

    expect(
      filterAndSortWorkshops(workshops, {
        ...defaultWorkshopFilters,
        registration: 'unregistered',
        sortBy: 'seatsRemaining',
      }, registeredWorkshopIds).map((item) => item.id),
    ).toEqual(['w-3', 'w-1'])
  })
})
