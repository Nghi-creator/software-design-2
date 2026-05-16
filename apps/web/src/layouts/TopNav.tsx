import { useEffect, useRef, useState } from 'react'
import type { NavItem, SessionUser } from '../types'
import { linkButtonClass, secondaryButtonClass } from '../components/styles'
import logoUrl from '../assets/logo.jpg'

type TopNavProps = {
  activePath: string
  items: NavItem[]
  user: SessionUser | null
  onLogout: () => void
}

export function TopNav({ activePath, items, user, onLogout }: TopNavProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isAccountOpen) return undefined

    function handlePointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAccountOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isAccountOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-background-raised shadow-theme-sm">
      <div className="grid min-h-20 w-full items-center gap-theme-md px-theme-md md:grid-cols-[auto_minmax(0,1fr)_auto] md:px-theme-xl">
        <div className="inline-flex items-center gap-theme-sm text-text-primary" aria-label="UniHub Workshop logo">
          <img src={logoUrl} alt="UH Logo" className="size-11 shrink-0 rounded-theme-md object-cover shadow-theme-glow" />
          <div className="hidden sm:block">
            <strong className="block">UniHub Workshop</strong>
          </div>
        </div>

        <nav className="flex flex-wrap justify-start gap-theme-sm" aria-label="Primary navigation">
          {items.map((item) => (
            <a
              key={item.path}
              className={`inline-flex min-h-10 items-center rounded-theme-md px-theme-sm text-sm font-bold text-text-secondary no-underline transition hover:bg-background-overlay hover:text-text-primary ${isActivePath(activePath, item.path) ? 'bg-background-overlay text-text-primary' : ''
                }`}
              href={`#${item.path}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-start gap-theme-sm md:justify-end">
          {user ? (
            <div className="relative" ref={accountMenuRef}>
              <button
                className="inline-flex size-11 items-center justify-center rounded-full border border-border-strong bg-background-overlay text-brand-secondary transition hover:border-brand-primary hover:bg-surface-cardHover"
                type="button"
                aria-expanded={isAccountOpen}
                aria-haspopup="menu"
                aria-label={`${user.name} account menu`}
                onClick={() => setIsAccountOpen((currentValue) => !currentValue)}
              >
                <UserIcon />
              </button>
              {isAccountOpen ? (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-40 grid min-w-64 gap-theme-sm rounded-theme-lg border border-border-subtle bg-surface-card p-theme-md shadow-theme-md"
                  role="menu"
                >
                  <div>
                    <strong className="block text-text-primary">{user.name}</strong>
                    <span className="block text-sm text-text-muted">{user.email}</span>
                    <span className="mt-theme-xs inline-flex rounded-full bg-brand-primary/15 px-theme-sm py-1 text-xs font-extrabold uppercase text-brand-secondary">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    className={`${linkButtonClass} justify-start`}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountOpen(false)
                      onLogout()
                    }}
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <a className={secondaryButtonClass} href="#/login">
              Log in
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

function isActivePath(activePath: string, itemPath: string) {
  if (itemPath === '/') return activePath === '/'
  if (itemPath === '/admin') return activePath === '/admin'
  return activePath === itemPath || activePath.startsWith(`${itemPath}/`)
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 12.25a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 7.5a7 7 0 0 0-14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
