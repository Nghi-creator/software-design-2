import type { ReactNode } from 'react'
import { cardClass } from './styles'

type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
  topContent?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action, topContent }: PageHeaderProps) {
  return (
    <section className={`${cardClass} grid items-end gap-theme-lg p-theme-xl md:grid-cols-[minmax(0,1fr)_auto]`}>
      {topContent ? <div className="md:col-span-2">{topContent}</div> : null}
      <div>
        <p className="mb-theme-sm text-xs font-extrabold uppercase tracking-[0.14em] text-brand-secondary">
          {eyebrow}
        </p>
        <h1 className="mb-theme-md max-w-4xl break-words text-4xl font-extrabold leading-none text-text-primary md:text-6xl">
          {title}
        </h1>
        <p className="max-w-3xl text-text-secondary">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-theme-sm">{action}</div> : null}
    </section>
  )
}
