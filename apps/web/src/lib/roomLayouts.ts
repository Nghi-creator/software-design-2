import aiLabLayoutUrl from '../assets/room-layouts/ai-lab.svg'
import dataTheaterLayoutUrl from '../assets/room-layouts/data-theater.svg'
import innovationHallLayoutUrl from '../assets/room-layouts/innovation-hall.svg'
import startupStudioLayoutUrl from '../assets/room-layouts/startup-studio.svg'
import type { Workshop } from '../types'

export function getRoomLayoutUrl(workshop: Workshop) {
  const roomName = workshop.room?.name?.toLowerCase()
  const layoutUrl = workshop.room?.layoutUrl?.trim()
  const normalizedLayoutUrl = layoutUrl?.toLowerCase()

  if (roomName?.includes('innovation hall') || normalizedLayoutUrl?.includes('innovation-hall')) return innovationHallLayoutUrl
  if (roomName?.includes('ai lab') || normalizedLayoutUrl?.includes('ai-lab')) return aiLabLayoutUrl
  if (roomName?.includes('startup studio') || normalizedLayoutUrl?.includes('startup-studio')) return startupStudioLayoutUrl
  if (roomName?.includes('data theater') || normalizedLayoutUrl?.includes('data-theater')) return dataTheaterLayoutUrl
  if (normalizedLayoutUrl?.startsWith('data:image/svg+xml')) return layoutUrl
  if (
    (normalizedLayoutUrl?.startsWith('http://') || normalizedLayoutUrl?.startsWith('https://')) &&
    normalizedLayoutUrl.endsWith('.svg')
  ) {
    return layoutUrl
  }

  return null
}
