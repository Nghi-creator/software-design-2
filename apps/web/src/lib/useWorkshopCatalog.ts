import { useEffect, useState } from 'react'
import type { Workshop } from '../types'
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
      } catch {
        if (!isMounted) return
        setState({
          workshops: [],
          source: 'fallback',
          isLoading: false,
          error: 'Live workshop data is unavailable. Please try again later.',
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
