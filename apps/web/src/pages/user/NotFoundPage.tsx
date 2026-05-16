import { StatePanel } from '../../components/State'
import { buttonClass } from '../../components/styles'

export function NotFoundPage() {
  return (
    <StatePanel
      title="Page not found"
      message="The requested route is not part of the current UniHub web map."
      action={<a className={buttonClass} href="#/workshops">Go to schedule</a>}
    />
  )
}
