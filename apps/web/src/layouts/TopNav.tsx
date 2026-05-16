import type { NavItem, SessionUser } from '../types'
import { linkButtonClass, secondaryButtonClass } from '../components/styles'

type TopNavProps = {
  activePath: string
  items: NavItem[]
  user: SessionUser | null
  onLogout: () => void
}

export function TopNav({ activePath, items, user, onLogout }: TopNavProps) {
  return (
    <header className="sticky top-0 z-10 grid items-center gap-theme-md bg-background-page/90 py-theme-sm backdrop-blur md:grid-cols-[minmax(220px,1fr)_auto_minmax(160px,1fr)]">
      <a className="inline-flex items-center gap-theme-sm text-text-primary no-underline" href="#/" aria-label="UniHub Workshop home">
        <span className="grid size-11 place-items-center rounded-theme-md bg-brand-primary text-sm font-extrabold shadow-theme-glow">
          UH
        </span>
        <div>
          <strong className="block">UniHub Workshop</strong>
          <small className="block text-text-muted">Skill Week operations</small>
        </div>
      </a>

      <nav className="flex flex-wrap justify-start gap-theme-sm md:justify-center" aria-label="Primary navigation">
        {items.map((item) => (
          <a
            key={item.path}
            className={`inline-flex min-h-10 items-center rounded-theme-md px-theme-sm text-sm font-bold text-text-secondary no-underline transition hover:bg-background-overlay hover:text-text-primary ${
              activePath === item.path ? 'bg-background-overlay text-text-primary' : ''
            }`}
            href={`#${item.path}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center justify-start gap-theme-sm md:justify-end">
        {user ? (
          <>
            <span className="inline-flex min-h-8 items-center rounded-full bg-brand-primary/15 px-theme-sm text-xs font-extrabold uppercase text-brand-secondary">
              {user.role.replace('_', ' ')}
            </span>
            <button className={linkButtonClass} type="button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <a className={secondaryButtonClass} href="#/login">
            Log in
          </a>
        )}
      </div>
    </header>
  )
}
