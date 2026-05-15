# API Spec

Status: partially defined. Current contracts cover JWT auth, room CRUD, workshop browse/create, registration/payment, online check-in, and offline check-in sync.

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

Development header identity is still accepted for local compatibility when no bearer token is present:

- `x-user-id`: UUID/string user id.
- `x-user-role`: one of `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`.

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
Request: { name, location, capacity }
Response: Room
Errors: 401, 403, 400
```

```text
PUT /api/rooms/:id
Auth: ORGANIZER
Request: { name, location, capacity }
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
Errors: 401, 403, 404, 500
Notes: sets Registration.checkedInAt and creates Checkin(source=ONLINE).
```

```text
POST /api/checkin/sync
Auth: CHECKIN_STAFF
Request: { items: [{ localId?, qrCode, scannedAt? }] }
Response: { success: true, results: [{ localId?, qrCode, status, registrationId? }] }
Compatibility: { qrCodes: string[] } is accepted and converted to items.
Errors: 400, 401, 403, 500
Notes: item statuses include checked_in, already_checked_in, invalid, failed.
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
Query:
- limit?: positive integer up to 500 (default 50)
- offset?: non-negative integer (default 0)
Response: { success: true, errors: CsvImportError[], pagination: { limit, offset } }
Errors: 400, 401, 403, 500
Notes: row-level errors include rowNumber, studentId, email, error, rawRow, and createdAt. Malformed rows are recorded without stopping later rows in the import.
```

## Still Undefined

- QR validation endpoint separate from check-in.
- Admin statistics.
- PDF upload status and async AI summary status.
