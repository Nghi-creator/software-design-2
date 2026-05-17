import aiLabLayoutUrl from '../assets/room-layouts/ai-lab.svg'
import dataTheaterLayoutUrl from '../assets/room-layouts/data-theater.svg'
import innovationHallLayoutUrl from '../assets/room-layouts/innovation-hall.svg'
import startupStudioLayoutUrl from '../assets/room-layouts/startup-studio.svg'
import type { Workshop } from '../types'

export function getRoomLayoutUrl(workshop: Workshop) {
  const roomName = workshop.room?.name?.toLowerCase()
  const layoutUrl = workshop.room?.layoutUrl?.toLowerCase()

  if (roomName?.includes('innovation hall') || layoutUrl?.includes('innovation-hall')) return innovationHallLayoutUrl
  if (roomName?.includes('ai lab') || layoutUrl?.includes('ai-lab')) return aiLabLayoutUrl
  if (roomName?.includes('startup studio') || layoutUrl?.includes('startup-studio')) return startupStudioLayoutUrl
  if (roomName?.includes('data theater') || layoutUrl?.includes('data-theater')) return dataTheaterLayoutUrl

  return null
}
