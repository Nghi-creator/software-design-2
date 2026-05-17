import type { Workshop } from '../types'
import { getRoomLayoutUrl } from '../lib/roomLayouts'

export function RoomLayoutPreview({ className = '', compact = false, workshop }: { className?: string; compact?: boolean; workshop: Workshop }) {
  const layoutUrl = getRoomLayoutUrl(workshop)
  const roomName = workshop.room?.name ?? 'Room'

  if (!layoutUrl) {
    return null
  }

  return (
    <a
      className={`group block overflow-hidden rounded-theme-md border border-border-subtle bg-background-subtle ${className}`}
      href={layoutUrl}
      rel="noreferrer"
      target="_blank"
    >
      <img
        alt={`${roomName} room layout`}
        className={`block aspect-[16/9] w-full object-cover transition duration-200 group-hover:scale-[1.02] ${compact ? 'max-h-44' : 'max-h-80'}`}
        src={layoutUrl}
      />
    </a>
  )
}
