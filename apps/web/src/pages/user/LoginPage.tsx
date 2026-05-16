import { useState } from 'react'
import type { FormEvent } from 'react'
import { Notice, StatePanel } from '../../components/State'
import { buttonClass, cardClass, focusClass, linkButtonClass } from '../../components/styles'
import { getUserFacingError } from '../../lib/apiErrorMessages'
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
    <section className="grid min-h-[calc(100vh-180px)] place-items-center">
      <div className={`${cardClass} grid w-full max-w-2xl gap-theme-lg p-theme-xl`}>
        <div>
          <h1 className="text-3xl font-extrabold leading-tight text-text-primary md:text-4xl">
            Log in to UniHub
          </h1>
        </div>
        <form className="grid gap-theme-md" onSubmit={handleSubmit}>
          <label className="grid gap-theme-xs text-sm font-bold text-text-primary">
            Email
            <input
              className={fieldClass}
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
              className={fieldClass}
              type="password"
              placeholder="Password123"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? (
            <Notice tone="danger" message={error} />
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
      </div>
    </section>
  )
}

function getLoginErrorMessage(error: unknown) {
  return getUserFacingError(error, {
    action: 'Login',
    fallback: 'Login failed. Please try again.',
  })
}

const fieldClass =
  `min-h-11 rounded-theme-md border border-border-strong bg-background-subtle px-theme-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none ${focusClass}`
