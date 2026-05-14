# API Spec

Status: partially defined. Current contracts cover room CRUD, workshop browse/create, registration/payment, online check-in, and offline check-in sync. Auth is a development header contract, not production JWT yet.

## Auth

Development API identity is attached from headers:

- `x-user-id`: UUID/string user id.
- `x-user-role`: one of `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`.

Production auth/JWT is still not defined.

## Rooms

```text
GET /api/rooms
Auth: public
Response: Room[]
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
Response: Workshop[] with room included, ordered by startTime asc
Notes: pagination/search still not implemented.
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

## Still Undefined

- Production JWT/session auth.
- Student workshop browsing/search pagination params.
- QR code retrieval/validation endpoint separate from check-in.
- Admin statistics.
- PDF upload status and async AI summary status.
- Legacy CSV import status endpoint.
