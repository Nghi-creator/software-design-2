import type { ReactNode } from 'react'
import { cardClass, panelClass } from './styles'

export function LoadingState({ label = 'Loading UniHub data...' }: { label?: string }) {
  return (
    <div className={`${panelClass} inline-flex items-center gap-theme-sm justify-self-start`} role="status">
      <span
        className="size-5 animate-spin rounded-full border-[3px] border-border-strong border-t-brand-primary"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}

export function CenteredLoadingState({ label = 'Loading UniHub data...' }: { label?: string }) {
  return (
    <div className="grid min-h-[calc(100vh-160px)] place-items-center" role="status">
      <div className="grid justify-items-center gap-theme-md">
        <span
          className="size-16 animate-spin rounded-full border-[6px] border-border-strong border-t-brand-primary shadow-theme-glow"
          aria-hidden="true"
        />
        <span className="text-sm font-bold text-text-secondary">{label}</span>
      </div>
    </div>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-theme-lg border border-dashed border-border-strong bg-background-subtle p-theme-lg">
      <strong className="mb-theme-xs block text-text-primary">{title}</strong>
      <p className="text-text-secondary">{message}</p>
    </div>
  )
}

export function Notice({
  message,
  tone,
}: {
  message: string
  tone: 'danger' | 'success' | 'warning'
}) {
  const className = {
    danger: 'border-status-danger/40 bg-status-dangerBg text-status-danger',
    success: 'border-status-success/40 bg-status-successBg text-status-success',
    warning: 'border-status-warning/40 bg-status-warningBg text-status-warning',
  }[tone]

  return (
    <p className={`rounded-theme-md border px-theme-md py-theme-sm text-sm font-bold ${className}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {message}
    </p>
  )
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="grid gap-theme-md md:grid-cols-3" role="status" aria-label="Loading cards">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </section>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-theme-md" role="status" aria-label="Loading dashboard">
      <div className="grid gap-theme-md md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonBlock className="h-28" key={index} />
        ))}
      </div>
      <SkeletonBlock className="h-64" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="grid gap-theme-md" role="status" aria-label="Loading details">
      <SkeletonBlock className="h-52" />
      <div className="grid gap-theme-md md:grid-cols-2">
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="grid min-h-80 gap-theme-md rounded-theme-lg border border-border-subtle bg-surface-card p-theme-lg">
      <SkeletonLine className="h-4 w-28" />
      <SkeletonLine className="h-7 w-4/5" />
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonBlock className="h-24" />
      <SkeletonLine className="h-10 w-36" />
    </div>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-theme-md bg-background-overlay ${className}`} />
}

function SkeletonLine({ className }: { className: string }) {
  return <span className={`block animate-pulse rounded-full bg-background-overlay ${className}`} />
}

export function StatePanel({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <section className={`${cardClass} grid min-h-96 content-center justify-items-start gap-theme-md p-theme-xl`}>
      <h1 className="max-w-3xl text-4xl font-extrabold leading-none text-text-primary md:text-6xl">{title}</h1>
      <p className="max-w-2xl text-text-secondary">{message}</p>
      {action ? <div className="flex flex-wrap gap-theme-sm">{action}</div> : null}
    </section>
  )
}
