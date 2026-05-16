export type Role = 'STUDENT' | 'ORGANIZER' | 'CHECKIN_STAFF'

export type AuthStatus = 'checking' | 'guest' | 'authenticated'

export type LoginCredentials = {
  email: string
  password: string
}

export type RouteKey =
  | 'home'
  | 'workshops'
  | 'workshopDetail'
  | 'registrations'
  | 'login'
  | 'admin'
  | 'adminWorkshops'
  | 'adminImports'
  | 'notFound'

export type Route = {
  key: RouteKey
  path: string
  params: Record<string, string>
}

export type NavItem = {
  label: string
  path: string
  roles?: Role[]
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  studentId?: string | null
}

export type Room = {
  id: string
  name: string
  location: string
  capacity: number
  layoutUrl?: string | null
}

export type Workshop = {
  id: string
  title: string
  speaker: string
  roomId: string
  room?: Room
  startTime: string
  capacity: number
  seatsRemaining: number
  price: number
  pdfUrl?: string | null
  aiSummary?: string | null
}

export type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED'

export type Registration = {
  id: string
  studentId: string
  workshopId: string
  status: RegistrationStatus
  qrCode: string
  checkedInAt?: string | null
  workshop?: Workshop
  payment?: Payment
}

export type Payment = {
  id: string
  registrationId: string
  amount: number
  status: PaymentStatus
  transactionId?: string | null
  idempotencyKey: string
}

export type QrTicket = {
  registrationId: string
  workshopId: string
  workshopTitle: string
  qrCode: string
}

export type AiSummaryStatus = 'not_uploaded' | 'processing' | 'ready' | 'failed'

export type WorkshopStats = {
  workshopId: string
  capacity: number
  seatsRemaining: number
  registrations: {
    pending: number
    confirmed: number
    cancelled: number
  }
  checkedInCount: number
  successfulPaymentCount: number
}

export type CsvImportJob = {
  id: string
  source: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: string
  finishedAt?: string | null
  totalRows: number
  successCount: number
  errorCount: number
  message?: string | null
}

export type CsvImportError = {
  id: string
  jobId: string
  rowNumber: number
  studentId?: string | null
  email?: string | null
  error: string
  rawRow: Record<string, unknown>
  createdAt: string
}

export type Pagination = {
  page?: number
  pageSize?: number
  totalItems?: number
  totalPages?: number
  limit?: number
  offset?: number
}

export type PaginatedResponse<T> = {
  items: T[]
  pagination: Pagination
}
