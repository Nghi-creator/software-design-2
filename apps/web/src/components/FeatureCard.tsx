import { panelClass } from './styles'

export function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className={panelClass}>
      <h2 className="mb-theme-sm text-xl font-bold text-text-primary">{title}</h2>
      <p className="text-text-secondary">{body}</p>
    </article>
  )
}
