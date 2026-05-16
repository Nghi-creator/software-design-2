import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState, Notice, PanelSkeleton } from '../../components/State'
import { buttonClass, cardClass, secondaryButtonClass } from '../../components/styles'
import { getUserFacingError } from '../../lib/apiErrorMessages'
import { formatDateTime } from '../../lib/format'
import { getLatestCsvImportJob, listCsvImportErrors } from '../../lib/importApi'
import type { CsvImportError, CsvImportJob } from '../../types'

const errorPageSize = 10

export function AdminImportsPage() {
  const [job, setJob] = useState<CsvImportJob | null>(null)
  const [errors, setErrors] = useState<CsvImportError[]>([])
  const [offset, setOffset] = useState(0)
  const [isLoadingJob, setIsLoadingJob] = useState(true)
  const [isLoadingErrors, setIsLoadingErrors] = useState(false)
  const [jobError, setJobError] = useState<string | null>(null)
  const [errorListError, setErrorListError] = useState<string | null>(null)

  const canLoadPrevious = offset > 0
  const canLoadNext = errors.length === errorPageSize
  const hasImportFailures = Boolean(job && (job.status === 'FAILED' || job.errorCount > 0))

  const loadErrors = useCallback(async (jobId: string, nextOffset: number) => {
    setIsLoadingErrors(true)
    setErrorListError(null)

    try {
      const response = await listCsvImportErrors(jobId, errorPageSize, nextOffset)
      setErrors(response.errors)
      setOffset(response.pagination.offset)
    } catch (caughtError) {
      setErrors([])
      setErrorListError(getImportErrorMessage(caughtError, 'Import row errors are unavailable.'))
    } finally {
      setIsLoadingErrors(false)
    }
  }, [])

  const loadLatestJob = useCallback(async () => {
    setIsLoadingJob(true)
    setJobError(null)

    try {
      const response = await getLatestCsvImportJob()
      setJob(response.job)
      setOffset(0)
      if (response.job?.errorCount) {
        await loadErrors(response.job.id, 0)
      } else {
        setErrors([])
        setErrorListError(null)
      }
    } catch (caughtError) {
      setJob(null)
      setErrors([])
      setJobError(getImportErrorMessage(caughtError, 'CSV import status is unavailable.'))
    } finally {
      setIsLoadingJob(false)
    }
  }, [loadErrors])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadLatestJob(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [loadLatestJob])

  const completionNote = useMemo(() => getCompletionNote(job), [job])

  return (
    <>
      <h1 className="text-3xl font-extrabold leading-tight text-text-primary md:text-4xl">CSV import health</h1>
      {isLoadingJob ? (
        <PanelSkeleton label="Loading latest CSV import status" />
      ) : jobError ? (
        <Notice tone="warning" message={jobError} />
      ) : !job ? (
        <EmptyState title="No CSV import jobs yet" message="The organizer dashboard is ready; row errors will appear after the first legacy student import runs." />
      ) : (
        <>
          <section className={`${cardClass} grid gap-theme-lg p-theme-lg`}>
            <div className="grid gap-theme-md lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <div className="mb-theme-sm flex flex-wrap items-center gap-theme-sm">
                  <StatusBadge status={job.status} />
                  {hasImportFailures ? <span className="text-sm font-bold text-status-danger">Action needed</span> : null}
                </div>
                <h2 className="text-2xl font-extrabold text-text-primary">{job.source}</h2>
                <p className="text-text-secondary">{completionNote}</p>
              </div>
              <div className="grid gap-theme-xs text-sm text-text-secondary">
                <span>Started {formatDateTime(job.startedAt)}</span>
                <span>{job.finishedAt ? `Finished ${formatDateTime(job.finishedAt)}` : 'Still running'}</span>
              </div>
            </div>
            {job.message ? (
              <p className="rounded-theme-md border border-border-subtle bg-background-subtle px-theme-md py-theme-sm text-sm text-text-secondary">
                {job.message}
              </p>
            ) : null}
            <dl className="grid gap-theme-md md:grid-cols-4">
              <ImportMetric label="Rows" value={String(job.totalRows)} />
              <ImportMetric label="Imported" value={String(job.successCount)} />
              <ImportMetric label="Errors" value={String(job.errorCount)} tone={job.errorCount > 0 ? 'danger' : 'normal'} />
              <ImportMetric label="Status" value={formatImportStatus(job.status)} />
            </dl>
          </section>
          <section className={`${cardClass} overflow-hidden`}>
            <div className="grid gap-theme-sm border-b border-border-subtle bg-background-subtle px-theme-md py-theme-md md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 className="text-xl font-extrabold text-text-primary">Import errors</h2>
                <p className="text-sm text-text-secondary">{getErrorRangeLabel(errors.length, offset)}</p>
              </div>
              <div className="flex flex-wrap gap-theme-sm">
                <button
                  className={secondaryButtonClass}
                  type="button"
                  disabled={!canLoadPrevious || isLoadingErrors}
                  onClick={() => void loadErrors(job.id, Math.max(0, offset - errorPageSize))}
                >
                  Previous
                </button>
                <button
                  className={buttonClass}
                  type="button"
                  disabled={!canLoadNext || isLoadingErrors}
                  onClick={() => void loadErrors(job.id, offset + errorPageSize)}
                >
                  Next
                </button>
              </div>
            </div>
            {errorListError ? <Notice tone="warning" message={errorListError} /> : null}
            {isLoadingErrors ? (
              <div className="p-theme-md">
                <PanelSkeleton label="Loading import errors" />
              </div>
            ) : errors.length === 0 ? (
              <div className="p-theme-md">
                <EmptyState title="No row errors on this page" message="The latest import did not report row-level failures for this range." />
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {errors.map((importError) => (
                  <ImportErrorRow key={importError.id} importError={importError} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}

function ImportMetric({
  label,
  tone = 'normal',
  value,
}: {
  label: string
  tone?: 'normal' | 'danger'
  value: string
}) {
  return (
    <div className="rounded-theme-md border border-border-subtle bg-background-subtle p-theme-md">
      <dt className="text-sm font-bold text-text-muted">{label}</dt>
      <dd className={`text-3xl font-extrabold ${tone === 'danger' ? 'text-status-danger' : 'text-text-primary'}`}>
        {value}
      </dd>
    </div>
  )
}

function ImportErrorRow({ importError }: { importError: CsvImportError }) {
  return (
    <article className="grid gap-theme-md px-theme-md py-theme-md text-sm lg:grid-cols-[120px_minmax(180px,1fr)_minmax(220px,2fr)_minmax(180px,1fr)]">
      <div>
        <span className="text-text-muted">Row</span>
        <strong className="block text-text-primary">{importError.rowNumber}</strong>
      </div>
      <div>
        <span className="text-text-muted">Student</span>
        <strong className="block break-words text-text-primary">
          {importError.studentId ?? importError.email ?? 'Unknown row'}
        </strong>
      </div>
      <div>
        <span className="text-text-muted">Error</span>
        <strong className="block break-words text-status-danger">{importError.error}</strong>
      </div>
      <div>
        <span className="text-text-muted">Recorded</span>
        <strong className="block text-text-primary">{formatDateTime(importError.createdAt)}</strong>
      </div>
      <details className="lg:col-span-4">
        <summary className="cursor-pointer font-bold text-brand-secondary">Raw row</summary>
        <pre className="mt-theme-sm max-h-56 overflow-auto rounded-theme-md border border-border-subtle bg-background-subtle p-theme-sm text-xs text-text-secondary">
          {JSON.stringify(importError.rawRow, null, 2)}
        </pre>
      </details>
    </article>
  )
}

function StatusBadge({ status }: { status: CsvImportJob['status'] }) {
  const className =
    status === 'COMPLETED'
      ? 'border-status-success/40 bg-status-successBg text-status-success'
      : status === 'FAILED'
        ? 'border-status-danger/40 bg-status-dangerBg text-status-danger'
        : 'border-status-warning/40 bg-status-warningBg text-status-warning'

  return (
    <span className={`rounded-full border px-theme-sm py-1 text-xs font-extrabold uppercase ${className}`}>
      {formatImportStatus(status)}
    </span>
  )
}

function getCompletionNote(job: CsvImportJob | null) {
  if (!job) return ''
  if (job.status === 'RUNNING') return 'The legacy student import is still processing.'
  if (job.errorCount > 0) return 'The import finished with row-level errors. Workshop administration can continue.'
  return 'The latest legacy student import completed without row-level errors.'
}

function getErrorRangeLabel(errorCount: number, offset: number) {
  if (errorCount === 0) return 'No row errors in this range'
  return `Showing rows ${offset + 1}-${offset + errorCount}`
}

function formatImportStatus(status: CsvImportJob['status']) {
  switch (status) {
    case 'RUNNING':
      return 'Running'
    case 'COMPLETED':
      return 'Completed'
    case 'FAILED':
      return 'Failed'
  }
}

function getImportErrorMessage(error: unknown, fallbackMessage: string) {
  return getUserFacingError(error, {
    action: 'CSV import visibility',
    fallback: fallbackMessage,
    notFound: `${fallbackMessage} The backend route may not be deployed yet.`,
  })
}
