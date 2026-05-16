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
