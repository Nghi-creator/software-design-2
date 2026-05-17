import { useCallback, useEffect, useMemo, useState } from 'react'
import { CardGridSkeleton, EmptyState, Notice } from '../../components/State'
import { buttonClass, cardClass, focusClass, linkButtonClass, secondaryButtonClass } from '../../components/styles'
import { ApiError } from '../../lib/api'
import { getUserFacingError } from '../../lib/apiErrorMessages'
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

type WorkshopFormErrors = Partial<Record<keyof WorkshopDraft, string>>

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
  const [formErrors, setFormErrors] = useState<WorkshopFormErrors>({})

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
    } catch (caughtError) {
      setWorkshops([])
      setRooms([])
      setError(getUserFacingError(caughtError, { action: 'Organizer workshop data' }))
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
      <h1 className="text-3xl font-extrabold leading-tight text-text-primary md:text-4xl">Workshop management</h1>
      {message ? <Notice tone="success" message={message} /> : null}
      {error ? <Notice tone="danger" message={error} /> : null}
      <section className="grid gap-theme-md md:grid-cols-4">
        <AdminStat label="Workshops" value={String(workshops.length)} />
        <AdminStat label="Reserved seats" value={String(dashboardTotals.reservedSeats)} />
        <AdminStat label="Checked in" value={String(dashboardTotals.checkedInCount)} />
        <AdminStat label="Paid" value={String(dashboardTotals.successfulPaymentCount)} />
      </section>
      <section className="grid min-w-0 items-start gap-theme-lg xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <WorkshopForm
          draft={draft}
          errors={formErrors}
          mode={mode}
          rooms={rooms}
          isSaving={isSaving}
          editingWorkshop={editingWorkshop}
          onCancel={startCreate}
          onChange={(nextDraft) => {
            setDraft(nextDraft)
            setFormErrors({})
          }}
          onCreate={startCreate}
          onSubmit={() => void saveWorkshop()}
        />
        <section className="grid gap-theme-md">
          {isLoading ? (
            <CardGridSkeleton count={2} />
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
    setFormErrors({})
  }

  function startEdit(workshop: Workshop) {
    setMode('edit')
    setEditingWorkshop(workshop)
    setDraft(createDraftFromWorkshop(workshop))
    setMessage(null)
    setError(null)
    setFormErrors({})
  }

  async function saveWorkshop() {
    setMessage(null)
    setError(null)
    const validationErrors = validateWorkshopDraft(draft, rooms)

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors)
      setError('Some workshop fields need attention before saving.')
      return
    }

    setIsSaving(true)
    setFormErrors({})

    try {
      const input = toWorkshopFormInput(draft)
      if (mode === 'edit' && editingWorkshop) {
        await updateWorkshop(editingWorkshop.id, input)
        await refreshAdminData()
        startCreate()
        setMessage('Workshop updated.')
      } else {
        await createWorkshop(input)
        await refreshAdminData()
        startCreate()
        setMessage('Workshop created.')
      }
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
  errors,
  isSaving,
  mode,
  rooms,
  onCancel,
  onChange,
  onCreate,
  onSubmit,
}: {
  draft: WorkshopDraft
  editingWorkshop: Workshop | null
  errors: WorkshopFormErrors
  isSaving: boolean
  mode: WorkshopMode
  rooms: Room[]
  onCancel: () => void
  onChange: (draft: WorkshopDraft) => void
  onCreate: () => void
  onSubmit: () => void
}) {
  return (
    <form
      className={`${cardClass} grid min-w-0 self-start gap-theme-md p-theme-lg`}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid gap-theme-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-text-primary">
            {mode === 'edit' ? 'Edit workshop' : 'Create workshop'}
          </h2>
          {editingWorkshop ? (
            <p className={truncateTextClass} title={editingWorkshop.title}>
              {editingWorkshop.title}
            </p>
          ) : null}
        </div>
        {mode === 'edit' ? (
          <button className={buttonClass} type="button" onClick={onCreate}>
            Create workshop
          </button>
        ) : null}
      </div>
      <FormField error={errors.title} label="Title" value={draft.title} onChange={(title) => onChange({ ...draft, title })} />
      <FormField error={errors.speaker} label="Speaker" value={draft.speaker} onChange={(speaker) => onChange({ ...draft, speaker })} />
      <label className="grid min-w-0 gap-theme-xs text-sm font-bold text-text-primary">
        Room
        <select
          aria-invalid={Boolean(errors.roomId)}
          className={fieldClass}
          disabled={rooms.length === 0}
          value={draft.roomId}
          onChange={(event) => onChange({ ...draft, roomId: event.target.value })}
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} · {room.location}
            </option>
          ))}
        </select>
        {errors.roomId ? <span className="text-sm font-bold text-status-danger">{errors.roomId}</span> : null}
      </label>
      <div className="grid min-w-0 gap-theme-md md:grid-cols-2">
        <FormField error={errors.capacity} label="Capacity" type="number" value={draft.capacity} onChange={(capacity) => onChange({ ...draft, capacity })} />
        <FormField error={errors.price} label="Fee" type="number" value={draft.price} onChange={(price) => onChange({ ...draft, price })} />
      </div>
      <FormField error={errors.startTime} label="Start time" type="datetime-local" value={draft.startTime} onChange={(startTime) => onChange({ ...draft, startTime })} />
      <FormField error={errors.pdfUrl} label="PDF URL" value={draft.pdfUrl} required={false} onChange={(pdfUrl) => onChange({ ...draft, pdfUrl })} />
      {mode === 'create' ? (
        <label className="grid min-w-0 gap-theme-xs text-sm font-bold text-text-primary">
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
    <article className={`${cardClass} grid min-w-0 gap-theme-md p-theme-lg`}>
      <div className="grid gap-theme-md lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h2 className={`text-2xl font-extrabold text-text-primary ${truncateTextClass}`} title={workshop.title}>
            {workshop.title}
          </h2>
          <p className={`text-text-secondary ${truncateTextClass}`} title={`${workshop.speaker} · ${formatDateTime(workshop.startTime)}`}>
            {workshop.speaker} · {formatDateTime(workshop.startTime)}
          </p>
        </div>
        <div className="flex flex-wrap gap-theme-sm">
          <button className={secondaryButtonClass} type="button" onClick={onEdit}>Edit</button>
          <button className={linkButtonClass} type="button" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <dl className="grid min-w-0 gap-theme-md text-sm md:grid-cols-4">
        <InfoItem label="Room" value={workshop.room?.name ?? workshop.roomId} />
        <InfoItem label="Location" value={workshop.room?.location ?? 'Location pending'} />
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
  error,
  label,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  error?: string
  label: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <label className="grid min-w-0 gap-theme-xs text-sm font-bold text-text-primary">
      {label}
      <input
        aria-invalid={Boolean(error)}
        className={fieldClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
      {error ? <span className="text-sm font-bold text-status-danger">{error}</span> : null}
    </label>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`font-bold text-text-primary ${truncateTextClass}`} title={value}>
        {value}
      </dd>
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

function validateWorkshopDraft(draft: WorkshopDraft, rooms: Room[]): WorkshopFormErrors {
  const errors: WorkshopFormErrors = {}
  const capacity = Number(draft.capacity)
  const price = Number(draft.price || 0)

  if (!draft.title.trim()) errors.title = 'Title is required.'
  if (!draft.speaker.trim()) errors.speaker = 'Speaker is required.'
  if (!draft.roomId || !rooms.some((room) => room.id === draft.roomId)) errors.roomId = 'Choose an available room.'
  if (!Number.isInteger(capacity) || capacity <= 0) errors.capacity = 'Capacity must be a positive whole number.'
  if (Number.isNaN(price) || price < 0) errors.price = 'Fee must be zero or higher.'
  if (!draft.startTime || Number.isNaN(Date.parse(draft.startTime))) errors.startTime = 'Start time must be valid.'
  if (draft.pdfUrl.trim() && !isValidUrl(draft.pdfUrl.trim())) errors.pdfUrl = 'PDF URL must be a valid URL.'

  return errors
}

function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
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
  }

  return getUserFacingError(error, {
    action: 'Workshop administration',
    fallback: 'The organizer action failed. Please try again.',
    validation: 'The workshop form could not be saved.',
  })
}

const fieldClass =
  `box-border min-h-11 w-full min-w-0 max-w-full rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`

const truncateTextClass = 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap'
