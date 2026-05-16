import type { SessionUser, Workshop } from '../types'
import { secondaryButtonClass } from './styles'

export function RegistrationAction({ user, workshop }: { user: SessionUser | null; workshop: Workshop }) {
  if (workshop.seatsRemaining === 0) {
    return <button className={secondaryButtonClass} type="button" disabled>Full</button>
  }

  if (!user) {
    return <a className={secondaryButtonClass} href="#/login">Log in to register</a>
  }

  if (user.role !== 'STUDENT') {
    return <button className={secondaryButtonClass} type="button" disabled>Student only</button>
  }

  return (
    <button className={secondaryButtonClass} type="button">
      {workshop.price > 0 ? 'Register and pay' : 'Register'}
    </button>
  )
}
