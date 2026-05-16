import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { CenteredLoadingState, EmptyState } from '../../components/State'
import { buttonClass, cardClass, linkButtonClass, secondaryButtonClass } from '../../components/styles'
import { ApiError } from '../../lib/api'
import { formatCurrency, formatDateTime } from '../../lib/format'
import {
  createWorkshop,
  deleteWorkshop,
  getWorkshopStats,
  getWorkshopSummaryStatus,
  listRooms,
  listWorkshops,
  updateWorkshop,
} from '../../lib/workshopApi'
import type { WorkshopFormInput, WorkshopSummaryStatus } from '../../lib/workshopApi'
import type { Room, Workshop, WorkshopStats } from '../../types'

type WorkshopMode = 'create' | 'edit'

type WorkshopDraft = {
  title: string
  speaker: string
  roomId: string
  capacity: string
  price: string
  startTime: string
  pdfUrl: string
  pdf: File | null
}

export function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [stats, setStats] = useState<Record<string, WorkshopStats>>({})
  const [summaries, setSummaries] = useState<Record<string, WorkshopSummaryStatus>>({})
  const [mode, setMode] = useState<WorkshopMode>('create')
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null)
  const [draft, setDraft] = useState<WorkshopDraft>(() => createEmptyDraft(''))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshStatsAndSummaries = useCallback(async (nextWorkshops: Workshop[]) => {
    const statsEntries = await Promise.all(
      nextWorkshops.map(async (workshop) => [workshop.id, await getOptionalStats(workshop)] as const),
    )
    const summaryEntries = await Promise.all(
      nextWorkshops.map(async (workshop) => [workshop.id, await getOptionalSummary(workshop)] as const),
    )

    setStats(Object.fromEntries(statsEntries))
    setSummaries(Object.fromEntries(summaryEntries))
  }, [])

  const refreshAdminData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [workshopResponse, roomResponse] = await Promise.all([listWorkshops(), listRooms()])
      setWorkshops(workshopResponse.items)
      setRooms(roomResponse.items)
      setDraft((currentDraft) =>
        currentDraft.roomId ? currentDraft : createEmptyDraft(roomResponse.items[0]?.id ?? ''),
      )
      await refreshStatsAndSummaries(workshopResponse.items)
    } catch {
      setWorkshops([])
      setRooms([])
      setError('Live organizer data is unavailable. Please try again later.')
      await refreshStatsAndSummaries([])
    } finally {
      setIsLoading(false)
    }
  }, [refreshStatsAndSummaries])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refreshAdminData(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [refreshAdminData])

  const dashboardTotals = useMemo(() => getDashboardTotals(workshops, stats), [stats, workshops])

  return (
    <>
      <PageHeader
        eyebrow="Organizer"
        title="Workshop management"
        description="Create, edit, inspect stats, monitor AI summaries and safely cancel workshops from one organizer surface."
        action={<button className={buttonClass} type="button" onClick={() => startCreate()}>Create workshop</button>}
      />
      {message ? (
        <p className="rounded-theme-md border border-status-success/40 bg-status-successBg px-theme-md py-theme-sm text-sm font-bold text-status-success">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-theme-md border border-status-danger/40 bg-status-dangerBg px-theme-md py-theme-sm text-sm font-bold text-status-danger">
          {error}
        </p>
      ) : null}
      <section className="grid gap-theme-md md:grid-cols-4">
        <AdminStat label="Workshops" value={String(workshops.length)} />
        <AdminStat label="Reserved seats" value={String(dashboardTotals.reservedSeats)} />
        <AdminStat label="Checked in" value={String(dashboardTotals.checkedInCount)} />
        <AdminStat label="Paid" value={String(dashboardTotals.successfulPaymentCount)} />
      </section>
      <section className="grid gap-theme-lg xl:grid-cols-[minmax(420px,1fr)_minmax(0,2fr)]">
        <WorkshopForm
          draft={draft}
          mode={mode}
          rooms={rooms}
          isSaving={isSaving}
          editingWorkshop={editingWorkshop}
          onCancel={startCreate}
          onChange={setDraft}
          onSubmit={() => void saveWorkshop()}
        />
        <section className="grid gap-theme-md">
          {isLoading ? (
            <CenteredLoadingState label="Loading organizer workshop data..." />
          ) : workshops.length === 0 ? (
            <EmptyState title="No workshops yet" message="Create a workshop and it will appear here." />
          ) : (
            workshops.map((workshop) => (
              <WorkshopAdminCard
                key={workshop.id}
                summary={summaries[workshop.id]}
                stats={stats[workshop.id]}
                workshop={workshop}
                onDelete={() => void removeWorkshop(workshop)}
                onEdit={() => startEdit(workshop)}
              />
            ))
          )}
        </section>
      </section>
    </>
  )

  function startCreate() {
    setMode('create')
    setEditingWorkshop(null)
    setDraft(createEmptyDraft(rooms[0]?.id ?? ''))
    setMessage(null)
    setError(null)
  }

  function startEdit(workshop: Workshop) {
    setMode('edit')
    setEditingWorkshop(workshop)
    setDraft(createDraftFromWorkshop(workshop))
    setMessage(null)
    setError(null)
  }

  async function saveWorkshop() {
    setIsSaving(true)
    setMessage(null)
    setError(null)

    try {
      const input = toWorkshopFormInput(draft)
      if (mode === 'edit' && editingWorkshop) {
        await updateWorkshop(editingWorkshop.id, input)
        setMessage('Workshop updated.')
      } else {
        await createWorkshop(input)
        setMessage('Workshop created.')
      }
      await refreshAdminData()
      startCreate()
    } catch (caughtError) {
      setError(getAdminErrorMessage(caughtError))
    } finally {
      setIsSaving(false)
    }
  }

  async function removeWorkshop(workshop: Workshop) {
    const shouldDelete = window.confirm(`Cancel/delete "${workshop.title}"? This cannot be undone.`)
    if (!shouldDelete) return

    setError(null)
    setMessage(null)

    try {
      await deleteWorkshop(workshop.id)
      setMessage('Workshop deleted.')
      await refreshAdminData()
    } catch (caughtError) {
      setError(getAdminErrorMessage(caughtError))
    }
  }
}

function WorkshopForm({
  draft,
  editingWorkshop,
  isSaving,
  mode,
  rooms,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: WorkshopDraft
  editingWorkshop: Workshop | null
  isSaving: boolean
  mode: WorkshopMode
  rooms: Room[]
  onCancel: () => void
  onChange: (draft: WorkshopDraft) => void
  onSubmit: () => void
}) {
  return (
    <form
      className={`${cardClass} grid content-start gap-theme-md p-theme-lg`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div>
        <h2 className="text-2xl font-extrabold text-text-primary">
          {mode === 'edit' ? 'Edit workshop' : 'Create workshop'}
        </h2>
        {editingWorkshop ? <p className="text-text-secondary">{editingWorkshop.title}</p> : null}
      </div>
      <FormField label="Title" value={draft.title} onChange={(title) => onChange({ ...draft, title })} />
      <FormField label="Speaker" value={draft.speaker} onChange={(speaker) => onChange({ ...draft, speaker })} />
      <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
        Room
        <select className={fieldClass} value={draft.roomId} onChange={(event) => onChange({ ...draft, roomId: event.target.value })}>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} · {room.location}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-theme-md md:grid-cols-2">
        <FormField label="Capacity" type="number" value={draft.capacity} onChange={(capacity) => onChange({ ...draft, capacity })} />
        <FormField label="Fee" type="number" value={draft.price} onChange={(price) => onChange({ ...draft, price })} />
      </div>
      <FormField label="Start time" type="datetime-local" value={draft.startTime} onChange={(startTime) => onChange({ ...draft, startTime })} />
      <FormField label="PDF URL" value={draft.pdfUrl} required={false} onChange={(pdfUrl) => onChange({ ...draft, pdfUrl })} />
      {mode === 'create' ? (
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          PDF upload
          <input
            className={fieldClass}
            type="file"
            accept="application/pdf"
            onChange={(event) => onChange({ ...draft, pdf: event.target.files?.[0] ?? null })}
          />
        </label>
      ) : (
        <p className="rounded-theme-md border border-border-subtle bg-background-subtle px-theme-md py-theme-sm text-sm text-text-secondary">
          PDF file upload is available when creating a workshop. Existing workshops can edit PDF URL metadata.
        </p>
      )}
      <p className="text-sm text-text-muted">
        Capacity reductions below already reserved seats return a conflict; the message will explain the failed edit.
      </p>
      <div className="flex flex-wrap gap-theme-sm">
        <button className={buttonClass} type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create workshop'}
        </button>
        {mode === 'edit' ? (
          <button className={secondaryButtonClass} type="button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

function WorkshopAdminCard({
  onDelete,
  onEdit,
  stats,
  summary,
  workshop,
}: {
  onDelete: () => void
  onEdit: () => void
  stats?: WorkshopStats
  summary?: WorkshopSummaryStatus
  workshop: Workshop
}) {
  const reservedSeats = workshop.capacity - workshop.seatsRemaining

  return (
    <article className={`${cardClass} grid gap-theme-md p-theme-lg`}>
      <div className="grid gap-theme-md lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 className="text-2xl font-extrabold text-text-primary">{workshop.title}</h2>
          <p className="text-text-secondary">
            {workshop.speaker} · {formatDateTime(workshop.startTime)}
          </p>
        </div>
        <div className="flex flex-wrap gap-theme-sm">
          <button className={secondaryButtonClass} type="button" onClick={onEdit}>Edit</button>
          <button className={linkButtonClass} type="button" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <dl className="grid gap-theme-md text-sm md:grid-cols-4">
        <InfoItem label="Room" value={`${workshop.room?.name ?? workshop.roomId} · ${workshop.room?.location ?? 'Location pending'}`} />
        <InfoItem label="Room layout" value={workshop.room?.layoutUrl ?? 'Layout pending'} />
        <InfoItem label="Capacity" value={`${reservedSeats}/${workshop.capacity} reserved`} />
        <InfoItem label="Status" value={workshop.seatsRemaining > 0 ? 'Open' : 'Full'} />
        <InfoItem label="Pending" value={String(stats?.registrations.pending ?? 0)} />
        <InfoItem label="Confirmed" value={String(stats?.registrations.confirmed ?? 0)} />
        <InfoItem label="Checked in" value={String(stats?.checkedInCount ?? 0)} />
        <InfoItem label="Successful payments" value={String(stats?.successfulPaymentCount ?? 0)} />
        <InfoItem label="Fee" value={formatCurrency(workshop.price)} />
        <InfoItem label="Seats remaining" value={String(workshop.seatsRemaining)} />
        <InfoItem label="PDF" value={summary?.pdfUrl ?? workshop.pdfUrl ?? 'No PDF'} />
        <InfoItem label="AI summary" value={formatSummaryStatus(summary, workshop)} />
      </dl>
    </article>
  )
}

function FormField({
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
      {label}
      <input className={fieldClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-bold text-text-primary">{value}</dd>
    </div>
  )
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <article className={`${cardClass} p-theme-md`}>
      <span className="text-sm font-bold text-text-muted">{label}</span>
      <strong className="block text-3xl font-extrabold text-text-primary">{value}</strong>
    </article>
  )
}

function createEmptyDraft(roomId: string): WorkshopDraft {
  return {
    title: '',
    speaker: '',
    roomId,
    capacity: '80',
    price: '0',
    startTime: toDateTimeLocalValue(new Date().toISOString()),
    pdfUrl: '',
    pdf: null,
  }
}

function createDraftFromWorkshop(workshop: Workshop): WorkshopDraft {
  return {
    title: workshop.title,
    speaker: workshop.speaker,
    roomId: workshop.roomId,
    capacity: String(workshop.capacity),
    price: String(workshop.price),
    startTime: toDateTimeLocalValue(workshop.startTime),
    pdfUrl: workshop.pdfUrl ?? '',
    pdf: null,
  }
}

function toWorkshopFormInput(draft: WorkshopDraft): WorkshopFormInput {
  return {
    title: draft.title,
    speaker: draft.speaker,
    roomId: draft.roomId,
    capacity: Number(draft.capacity),
    price: Number(draft.price || 0),
    startTime: new Date(draft.startTime).toISOString(),
    pdfUrl: draft.pdfUrl.trim(),
    pdf: draft.pdf,
  }
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}


async function getOptionalStats(workshop: Workshop) {
  try {
    return await getWorkshopStats(workshop.id)
  } catch {
    const reservedSeats = workshop.capacity - workshop.seatsRemaining
    return {
      workshopId: workshop.id,
      capacity: workshop.capacity,
      seatsRemaining: workshop.seatsRemaining,
      registrations: { pending: 0, confirmed: reservedSeats, cancelled: 0 },
      checkedInCount: 0,
      successfulPaymentCount: workshop.price > 0 ? reservedSeats : 0,
    }
  }
}

async function getOptionalSummary(workshop: Workshop) {
  try {
    return await getWorkshopSummaryStatus(workshop.id)
  } catch {
    return {
      workshopId: workshop.id,
      status: workshop.aiSummaryStatus ?? (workshop.aiSummary ? 'ready' : workshop.pdfUrl ? 'processing' : 'not_uploaded'),
      pdfUrl: workshop.pdfUrl,
    } satisfies WorkshopSummaryStatus
  }
}

function getDashboardTotals(workshops: Workshop[], stats: Record<string, WorkshopStats>) {
  return workshops.reduce(
    (totals, workshop) => {
      const workshopStats = stats[workshop.id]
      const reservedSeats = workshop.capacity - workshop.seatsRemaining
      totals.reservedSeats += reservedSeats
      totals.checkedInCount += workshopStats?.checkedInCount ?? 0
      totals.successfulPaymentCount += workshopStats?.successfulPaymentCount ?? 0
      return totals
    },
    { reservedSeats: 0, checkedInCount: 0, successfulPaymentCount: 0 },
  )
}

function formatSummaryStatus(summary: WorkshopSummaryStatus | undefined, workshop: Workshop) {
  const status = summary?.status ?? workshop.aiSummaryStatus ?? 'not_uploaded'
  switch (status) {
    case 'ready':
      return 'Ready'
    case 'processing':
      return 'Processing'
    case 'failed':
      return 'Failed'
    case 'not_uploaded':
      return 'Not uploaded'
  }
}

function getAdminErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return `${error.message}. Capacity cannot be reduced below already reserved seats, and workshops with registrations cannot be deleted.`
    }
    return error.message
  }

  if (error instanceof TypeError) return 'Could not reach the UniHub API. Try again when the backend is available.'
  return 'The organizer action failed. Please try again.'
}

const fieldClass =
  'min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none'
