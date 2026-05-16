import { useState } from 'react'
import type { FormEvent } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { StatePanel } from '../../components/State'
import { buttonClass, cardClass, linkButtonClass } from '../../components/styles'
import { ApiError } from '../../lib/api'
import { formatRole } from '../../lib/roles'
import type { LoginCredentials, SessionUser } from '../../types'

const seedAccounts = [
  { label: 'Student seed', email: 'mai.nguyen@student.unihub.edu' },
  { label: 'Organizer seed', email: 'admin@unihub.edu' },
  { label: 'Check-in staff seed', email: 'checkin@unihub.edu' },
]

export function LoginPage({
  user,
  onLogin,
}: {
  user: SessionUser | null
  onLogin: (credentials: LoginCredentials) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Enter both email and password.')
      return
    }

    setIsSubmitting(true)

    try {
      await onLogin({ email, password })
    } catch (caughtError) {
      setError(getLoginErrorMessage(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  function fillSeedAccount(seedEmail: string) {
    setEmail(seedEmail)
    setPassword('Password123')
    setError(null)
  }

  if (user) {
    const continuePath = user.role === 'ORGANIZER' ? '#/admin' : user.role === 'STUDENT' ? '#/workshops' : '#/'

    return (
      <StatePanel
        title="Already signed in"
        message={`${user.name} is authenticated as ${formatRole(user.role)}.`}
        action={<a className={buttonClass} href={continuePath}>Continue</a>}
      />
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Authentication"
        title="Log in to UniHub"
        description="Use a backend account to access student registration pages or organizer admin tools. Seed accounts use Password123 after the seed SQL is loaded."
      />
      <form className={`${cardClass} grid max-w-xl gap-theme-md p-theme-lg`} onSubmit={handleSubmit}>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Email
          <input
            className="min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
            type="email"
            placeholder="mai.nguyen@student.unihub.edu"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
          Password
          <input
            className="min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
            type="password"
            placeholder="Password123"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? (
          <p className="rounded-theme-md border border-status-danger/40 bg-status-dangerBg px-theme-md py-theme-sm text-sm font-bold text-status-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-theme-sm">
          <button className={buttonClass} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>
        </div>
        <div className="flex flex-wrap gap-theme-sm pt-theme-xs" aria-label="Seed account shortcuts">
          {seedAccounts.map((account) => (
            <button
              className={linkButtonClass}
              key={account.email}
              type="button"
              onClick={() => fillSeedAccount(account.email)}
            >
              {account.label}
            </button>
          ))}
        </div>
      </form>
    </>
  )
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof TypeError) {
    return 'Could not reach the UniHub API. Check that the backend is running and VITE_API_BASE_URL is correct.'
  }
  return 'Login failed. Please try again.'
}
