import { panelClass } from './styles'

export function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className={panelClass}>
      <span className="text-sm font-bold text-text-muted">{label}</span>
      <strong className="my-theme-sm block text-3xl font-extrabold text-text-primary">{value}</strong>
      <p className="text-text-secondary">{note}</p>
    </article>
  )
}
