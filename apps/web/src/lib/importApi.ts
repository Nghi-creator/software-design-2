import type { CsvImportError, CsvImportJob } from '../types'
import { apiRequest } from './api'

type LatestCsvImportResponse = {
  success: true
  job: CsvImportJob | null
}

type CsvImportErrorsResponse = {
  success: true
  errors: CsvImportError[]
  pagination: {
    limit: number
    offset: number
  }
}

export function getLatestCsvImportJob() {
  return apiRequest<LatestCsvImportResponse>('/imports/csv/latest')
}

export function listCsvImportErrors(jobId: string, limit: number, offset: number) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return apiRequest<CsvImportErrorsResponse>(`/imports/csv/${jobId}/errors?${params.toString()}`)
}
