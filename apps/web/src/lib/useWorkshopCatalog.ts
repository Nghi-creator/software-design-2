import { useEffect, useState } from 'react'
import { seedWorkshops } from '../data/seedWorkshops'
import type { Workshop } from '../types'
import { getUserFacingError } from './apiErrorMessages'
import type { WorkshopCatalogSource } from './workshopCatalog'
import { listWorkshops } from './workshopApi'

export type WorkshopCatalogState = {
  workshops: Workshop[]
  source: WorkshopCatalogSource
  isLoading: boolean
  error: string | null
}

export function useWorkshopCatalog(): WorkshopCatalogState {
  const [state, setState] = useState<WorkshopCatalogState>({
    workshops: [],
    source: 'fallback',
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    async function loadWorkshops() {
      try {
        const response = await listWorkshops()
        if (!isMounted) return
        setState({
          workshops: response.items,
          source: 'api',
          isLoading: false,
          error: null,
        })
      } catch (caughtError) {
        if (!isMounted) return
        setState({
          workshops: seedWorkshops,
          source: 'fallback',
          isLoading: false,
          error: `${getUserFacingError(caughtError, {
            action: 'Live workshop browsing',
            fallback: 'Live workshop data is unavailable.',
          })} Showing seed workshops so browsing still works.`,
        })
      }
    }

    void loadWorkshops()

    return () => {
      isMounted = false
    }
  }, [])

  return state
}
