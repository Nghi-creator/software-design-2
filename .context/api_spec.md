# API Spec

Status: partially defined. Current contracts cover JWT auth, room CRUD, workshop browse/create, registration/payment, notifications, online check-in, and offline check-in sync.

## Auth

JWT is the production auth mechanism. Send authenticated requests with:

- `Authorization: Bearer <accessToken>`

Tokens are HS256 JWTs signed with `JWT_SECRET`; default token lifetime is 24 hours and can be overridden with `JWT_EXPIRES_IN_SECONDS`.

```text
POST /api/auth/register
Auth: public
Request: { email, password, name, role?, studentId? }
Response: { user: { id, email, name, role, studentId }, accessToken }
Errors: 400, 403, 409, 500
Notes: password must be at least 8 characters; role defaults to STUDENT. Elevated role self-registration requires `AUTH_ALLOW_ROLE_REGISTRATION=true`.
```

```text
POST /api/auth/login
Auth: public
Request: { email, password }
Response: { user: { id, email, name, role, studentId }, accessToken }
Errors: 401, 500
```

```text
GET /api/auth/me
Auth: any authenticated user
Response: { user: { id, email, name, role, studentId } }
Errors: 401, 404, 500
```

## Rooms

```text
GET /api/rooms
Auth: public
Query:
- q?: case-insensitive search across name/location
- location?: case-insensitive exact location match
- minCapacity?, maxCapacity?: numeric capacity range
- sortBy?: name | location | capacity (default name)
- sortOrder?: asc | desc (default asc)
- page?: positive integer (default 1)
- pageSize?: positive integer up to 100 (default 20)
Response: { items: Room[], pagination: { page, pageSize, totalItems, totalPages } }
```

```text
POST /api/rooms
Auth: ORGANIZER
Request: { name, location, capacity, layoutUrl? }
Response: Room
Errors: 401, 403, 400
```

```text
PUT /api/rooms/:id
Auth: ORGANIZER
Request: { name, location, capacity, layoutUrl? }
Response: Room
Errors: 401, 403, 404
```

```text
DELETE /api/rooms/:id
Auth: ORGANIZER
Response: 204
Errors: 401, 403, 404
```

## Workshops

Workshop response shape:
- `price` is a JSON number even though PostgreSQL stores it as `numeric`.
- `startTime` is an ISO 8601 string.
- `room` is included on list responses and includes `layoutUrl`.

```text
GET /api/workshops
Auth: public
Query:
- q?: case-insensitive search across title/speaker
- roomId?: room id
- minPrice?, maxPrice?: numeric price range
- startsFrom?, startsTo?: ISO date/time range
- hasSeats?: true | false
- sortBy?: startTime | title | speaker | price | capacity | seatsRemaining (default startTime)
- sortOrder?: asc | desc (default asc)
- page?: positive integer (default 1)
- pageSize?: positive integer up to 100 (default 20)
Response: { items: Workshop[] with room included, pagination: { page, pageSize, totalItems, totalPages } }
```

```text
POST /api/workshops
Auth: ORGANIZER
Request: multipart/form-data or JSON with { title, speaker, roomId, capacity, price?, startTime, pdfUrl?, pdf? }
Response: Workshop
Errors: 401, 403, 400
Notes: uploaded PDF is summarized synchronously into aiSummary for now.
```

```text
PUT /api/workshops/:id
Auth: ORGANIZER
Request: { title, speaker, roomId, capacity, price?, startTime, pdfUrl? }
Response: Workshop
Errors: 401, 403, 400, 404, 409
Notes:
- Capacity edits preserve the number of already-reserved seats by recalculating seatsRemaining.
- Reducing capacity below the current reserved-seat count returns 409.
```

```text
DELETE /api/workshops/:id
Auth: ORGANIZER
Response: 204
Errors: 401, 403, 404, 409
Notes: workshops with existing registrations cannot be deleted.
```

```text
GET /api/workshops/:id/stats
Auth: ORGANIZER
Response: {
  workshopId,
  capacity,
  seatsRemaining,
  registrations: { pending, confirmed, cancelled },
  checkedInCount,
  successfulPaymentCount
}
Errors: 401, 403, 404, 500
Notes: successfulPaymentCount is the count of SUCCESS payments linked to the workshop's registrations.
```

```text
GET /api/workshops/:id/summary-status
Auth: ORGANIZER
Response: { workshopId, status, pdfUrl }
Errors: 401, 403, 404, 500
Notes:
- status is `not_uploaded` when no PDF is linked to the workshop.
- status is `ready` when an AI summary already exists.
- status is `processing` when a PDF is linked but no AI summary is stored yet.
- `failed` is reserved for a future async pipeline and is not emitted yet.
```

## Registration And Payment

```text
POST /api/workshops/:id/register
Auth: STUDENT
Headers: Idempotency-Key required
Request: { paymentToken? }
Response: { success: true, registration }
Errors: 400, 401, 403, 404, 409, 429, 503
Notes:
- Uses Redis + PostgreSQL idempotency with IN_PROGRESS/COMPLETED states.
- Reserves seat in a short DB transaction, calls payment gateway outside the lock, then confirms/cancels in a second transaction.
- Paid workshops require paymentToken; free workshops confirm with transactionId="free".
```

## Check-In

```text
GET /api/checkin/qr/:registrationId
Auth: STUDENT, ORGANIZER, CHECKIN_STAFF
Response: { success: true, qr: { registrationId, workshopId, workshopTitle, qrCode } }
Errors: 401, 403, 404, 409, 500
Notes:
- Students may retrieve only their own registration QR.
- ORGANIZER and CHECKIN_STAFF may retrieve any confirmed registration QR for operational use.
- Only CONFIRMED registrations can retrieve a QR token; PENDING/CANCELLED registrations return 409.
- Clients render the QR image from the stored Registration.qr_code token.
```

```text
POST /api/checkin
Auth: CHECKIN_STAFF
Request: { qrCode }
Response: { success: true, result: { status, registrationId } }
Errors: 400, 401, 403, 404, 500
Notes: only scans on the workshop's calendar day are accepted; valid wrong-day QR scans return `status: invalid`. Successful requests set Registration.checkedInAt and create Checkin(source=ONLINE).
```

```text
POST /api/checkin/sync
Auth: CHECKIN_STAFF
Request: { items: [{ localId?, qrCode, scannedAt? }] }
Response: { success: true, results: [{ localId?, qrCode, status, registrationId? }] }
Compatibility: { qrCodes: string[] } is accepted and converted to items.
Errors: 400, 401, 403, 500
Notes: item statuses include checked_in, already_checked_in, invalid, failed. Valid QR scans recorded outside the workshop's calendar day return `invalid`. Invalid payload shape, missing qrCode, non-string localId, and invalid scannedAt values return 400 before sync runs.
```

## CSV Imports

```text
GET /api/imports/csv/latest
Auth: ORGANIZER
Response: { success: true, job: CsvImportJob | null }
Errors: 401, 403, 500
Notes: returns the most recent legacy student CSV import job, including source, status, startedAt, finishedAt, totalRows, successCount, errorCount, and message.
```

```text
GET /api/imports/csv/:id/errors
Auth: ORGANIZER
Params:
- id: CSV import job UUID
Query:
- limit?: positive integer up to 500 (default 50)
- offset?: non-negative integer (default 0)
Response: { success: true, errors: CsvImportError[], pagination: { limit, offset } }
Errors: 400, 401, 403, 500
Notes: row-level errors include rowNumber, studentId, email, error, rawRow, and createdAt. Malformed rows are recorded without stopping later rows in the import.
```

## Notifications

```text
GET /api/notifications
Auth: STUDENT
Query:
- page?: positive integer (default 1)
- pageSize?: positive integer up to 100 (default 20)
Response: {
  success: true,
  items: [{
    id,
    userId,
    registrationId?,
    workshopId?,
    channel,
    subject,
    body,
    status,
    createdAt,
    sentAt?,
    readAt?
  }],
  pagination: { page, pageSize, totalItems, totalPages }
}
Errors: 400, 401, 403, 500
Notes: returns only notifications owned by the authenticated student, newest first. Current channel values are backend delivery channels such as `EMAIL`.
```

```text
PATCH /api/notifications/:id/read
Auth: STUDENT
Response: { success: true, notification: Notification }
Errors: 400, 401, 403, 404, 500
Notes: marks only the authenticated student's notification as read. The operation is idempotent; existing readAt values are preserved.
```

## Check-In Contract Note

- QR validation is intentionally performed inside `POST /api/checkin` and `POST /api/checkin/sync`.
- No separate pre-check QR validation endpoint is planned.
