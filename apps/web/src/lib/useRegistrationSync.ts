import { useEffect } from 'react'
import type { SessionUser } from '../types'
import { listMyRegistrations } from './registrationApi'
import { replaceStoredRegistrationsForUser } from './registrationStore'

export function useRegistrationSync(user: SessionUser | null) {
  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return undefined

    let isMounted = true

    listMyRegistrations()
      .then(({ items }) => {
        if (!isMounted) return
        replaceStoredRegistrationsForUser(user.id, items)
      })
      .catch(() => {
        // Keep the existing local snapshot if the network is unavailable.
      })

    return () => {
      isMounted = false
    }
  }, [user])
}
