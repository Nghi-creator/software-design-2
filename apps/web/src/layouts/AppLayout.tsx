import type { ReactNode } from 'react'
import type { NavItem, SessionUser } from '../types'
import { frameClass, shellClass } from '../components/styles'
import { NotificationBanner } from '../components/NotificationBanner'
import { TopNav } from './TopNav'

type AppLayoutProps = {
  activePath: string
  navItems: NavItem[]
  user: SessionUser | null
  notice: string | null
  onLogout: () => void
  children: ReactNode
}

export function AppLayout({ activePath, navItems, user, notice, onLogout, children }: AppLayoutProps) {
  return (
    <div className={shellClass}>
      <TopNav activePath={activePath} items={navItems} user={user} onLogout={onLogout} />

      <main className={frameClass}>
        {notice ? (
          <div className="rounded-theme-md border border-status-success/40 bg-status-successBg px-theme-md py-theme-sm text-sm font-bold text-status-success">
            {notice}
          </div>
        ) : null}
        <NotificationBanner user={user} />
        {children}
      </main>
    </div>
  )
}
