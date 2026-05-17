import { useState } from 'react'
import type { Workshop } from '../types'
import { getRoomLayoutUrl } from '../lib/roomLayouts'
import { buttonClass, focusClass } from './styles'

export function RoomLayoutPreview({ className = '', compact = false, workshop }: { className?: string; compact?: boolean; workshop: Workshop }) {
  const layoutUrl = getRoomLayoutUrl(workshop)
  const roomName = workshop.room?.name ?? 'Room'
  const [isOpen, setIsOpen] = useState(false)

  if (!layoutUrl) {
    return null
  }

  return (
    <>
      <button
        aria-label={`Open ${roomName} room layout`}
        className={`group block w-full overflow-hidden rounded-theme-md border border-border-subtle bg-background-subtle ${focusClass} ${className}`}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <img
          alt={`${roomName} room layout`}
          className={`block aspect-[16/9] w-full object-cover transition duration-200 group-hover:scale-[1.02] ${compact ? 'max-h-44' : 'max-h-80'}`}
          src={layoutUrl}
        />
      </button>
      <RoomLayoutDialog isOpen={isOpen} layoutUrl={layoutUrl} roomName={roomName} onClose={() => setIsOpen(false)} />
    </>
  )
}

export function RoomLayoutLink({ label = 'Open map', workshop }: { label?: string; workshop: Workshop }) {
  const layoutUrl = getRoomLayoutUrl(workshop)
  const roomName = workshop.room?.name ?? 'Room'
  const [isOpen, setIsOpen] = useState(false)

  if (!layoutUrl) {
    return null
  }

  return (
    <>
      <button
        className={`font-bold text-brand-secondary hover:underline ${focusClass}`}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {label}
      </button>
      <RoomLayoutDialog isOpen={isOpen} layoutUrl={layoutUrl} roomName={roomName} onClose={() => setIsOpen(false)} />
    </>
  )
}

function RoomLayoutDialog({
  isOpen,
  layoutUrl,
  onClose,
  roomName,
}: {
  isOpen: boolean
  layoutUrl: string
  onClose: () => void
  roomName: string
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-theme-md"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="grid max-h-[92vh] w-full max-w-5xl gap-theme-md rounded-theme-lg border border-border-subtle bg-surface-card p-theme-md shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-theme-md">
          <h2 className="text-lg font-bold text-text-primary">{roomName} layout</h2>
          <button className={buttonClass} onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="grid max-h-[75vh] place-items-center overflow-auto rounded-theme-md bg-background-subtle p-theme-sm">
          <img alt={`${roomName} full room layout`} className="max-h-[72vh] max-w-full object-contain" src={layoutUrl} />
        </div>
      </div>
    </div>
  )
}
