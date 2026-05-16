# Seat Race Handling Report

## Scope

This report documents exactly how the API handles concurrent registration attempts for the same workshop, especially the “last seat” race where many students try to register while only one seat remains.

Primary implementation files:

- `services/api/src/app.ts`
- `services/api/src/middleware/rateLimiter.ts`
- `services/api/src/middleware/idempotency.ts`
- `services/api/src/services/registration.ts`
- `services/api/src/repositories/registrationRepository.ts`

Related tests:

- `services/api/tests/integration/real-services/real-services.integration.test.ts`
- `services/api/tests/unit/registration/registration-idempotency.test.ts`

---

## 1. High-Level Guarantee

The server guarantees:

1. **No overselling**: `seats_remaining` never goes below `0`.
2. **At most one successful claimant for the final seat**.
3. **One student cannot create duplicate active registrations for the same workshop**.
4. **Duplicate client retries do not create duplicate business effects** when the same `Idempotency-Key` is reused.
5. **After sell-out, repeated loser requests become progressively cheaper to reject** through Redis-based protection.

The guarantee is achieved by combining:

- request throttling
- idempotency
- database constraints
- short transactions
- an atomic conditional seat decrement
- sold-out caching

---

## 2. Relevant Data Model Rules

### `workshops`

- `capacity`
- `seats_remaining`
- database check constraint:
  - `seats_remaining >= 0`
  - `seats_remaining <= capacity`

### `registrations`

- `unique (user_id, workshop_id)`
- statuses:
  - `PENDING`
  - `CONFIRMED`
  - `CANCELLED`

### `payments`

- one payment row per registration:
  - `registration_id unique`
- `idempotency_key unique`

### Why these matter

- The workshop counters enforce inventory bounds.
- The registration uniqueness rule prevents a student from owning two live rows for the same workshop.
- The payment/idempotency uniqueness rules prevent duplicate side effects across retries.

---

## 3. Request Pipeline Before Registration Logic

For:

```http
POST /api/workshops/:id/register
```

the effective request path is:

```text
1. pre-auth IP rate limiter
2. pre-auth sold-out Redis check
3. bearer-token authentication
4. role check: STUDENT only
5. post-auth global registration limiter
6. post-auth per-student limiter
7. idempotency middleware
8. registration service
9. repository transaction(s)
```

### 3.1 Pre-auth IP limiter

Implemented by:

```ts
preAuthRegistrationRateLimiter
```

Purpose:

- shed abusive traffic before database-backed bearer verification
- use Redis only
- key shape:

```text
ratelimit:registration:preauth:<ip>
```

### 3.2 Sold-out Redis short-circuit

Implemented by:

```ts
rejectSoldOutRegistrations
```

Purpose:

- once a workshop is known sold out, reject later attempts before:
  - auth
  - idempotency
  - database access

Redis key:

```text
registration:soldout:<workshopId>
```

Response:

```json
{ "success": false, "error": "Workshop is full" }
```

### 3.3 Post-auth registration limiters

Implemented by:

```ts
registrationRateLimiter
```

It composes:

1. a global bucket:

```text
ratelimit:registration:global
```

2. a per-student bucket:

```text
ratelimit:registration:student:<userId>
```

Purpose:

- protect backend capacity during spikes
- prevent one student from monopolizing attempts

Current defaults:

```ts
global: { capacity: 120, refillRate: 40 }
actor:  { capacity: 5,   refillRate: 0.5 }
```

### 3.4 Idempotency middleware

Every registration request requires:

```http
Idempotency-Key: ...
```

Behavior:

1. check Redis cache:

```text
idempotency:<key>
```

2. if absent, insert:

```sql
insert into idempotency_keys (key, status)
values ($1, 'IN_PROGRESS')
```

3. if duplicate key:
   - replay completed response if available
   - otherwise return:

```json
{ "success": false, "error": "Request is already in progress" }
```

4. after normal response:
   - persist final response in PostgreSQL
   - cache same response in Redis

This protects against double-submit and retry storms from the same client action.

---

## 4. Registration Service Flow

Entry point:

```ts
registerForWorkshop(...)
```

### 4.1 Price prevalidation

Before reserving any seat, the service loads workshop price:

```sql
select price
from workshops
where id = $1
```

If the workshop is paid and `paymentToken` is missing:

```ts
throw Payment token required
```

Why this exists:

- invalid paid registrations do **not** enter the hot reservation transaction
- this prevents expensive “reserve then cancel” churn under load

### 4.2 Reservation attempt

The service calls:

```ts
reserveSeat(...)
```

If reservation throws `"Workshop is full"`:

```ts
markWorkshopSoldOut(workshopId)
```

which writes:

```text
registration:soldout:<workshopId>
```

This makes subsequent loser requests cheaper.

---

## 5. Exact Seat Reservation Algorithm

Repository function:

```ts
reserveSeat(...)
```

Runs inside one PostgreSQL transaction.

### 5.1 Duplicate-registration check

First query:

```sql
select id, status
from registrations
where user_id = $1
  and workshop_id = $2
for update
```

Behavior:

- no row:
  - continue
- row exists and status is `CANCELLED`:
  - continue and later reuse that row
- row exists and status is not `CANCELLED`:
  - reject with:

```text
Already registered
```

Why `FOR UPDATE` here:

- it serializes competing attempts by the **same student** for the same workshop
- it prevents two concurrent requests from the same student from both trying to reactivate or create a row

### 5.2 Cheap full-workshop precheck

Next query:

```sql
select id, seats_remaining as "seatsRemaining"
from workshops
where id = $1
```

Behavior:

- no workshop row:
  - reject `Workshop not found`
- `seats_remaining <= 0`:
  - reject `Workshop is full`

Why this exists:

- once sold out, obvious losers do not need to contend on the hot update row
- it reduces unnecessary pressure after sell-out

Important:

- this read is only an optimization
- it is **not** the final source of truth
- another request may still consume the last seat after this read

### 5.3 Atomic conditional decrement

The real concurrency guard is:

```sql
update workshops
set seats_remaining = seats_remaining - 1,
    updated_at = now()
where id = $1
  and seats_remaining > 0
returning id, price, seats_remaining as "seatsRemaining"
```

This is the decisive operation.

Why it works:

- PostgreSQL applies the condition and update atomically
- if two students race for the final seat:
  - one update succeeds
  - one update returns zero rows
- no request can decrement from `0` to `-1`

If zero rows are returned:

```text
Workshop is full
```

### 5.4 Registration row creation or reuse

If a seat was successfully reserved:

- if a cancelled row already existed:

```sql
update registrations
set qr_code = $2,
    status = 'PENDING',
    checked_in_at = null,
    updated_at = now()
where id = $1
returning ...
```

- otherwise:

```sql
insert into registrations (...)
values (...)
returning ...
```

This keeps retries after cancellation from spraying duplicate historical rows.

### 5.5 Payment row upsert

Then:

```sql
insert into payments (...)
values (...)
on conflict (registration_id) do update
set ...
returning ...
```

Why:

- every reservation attempt has one payment row
- cancelled-registration retries reuse the original payment slot cleanly

---

## 6. What Happens in the Last-Seat Race

Assume:

```text
seats_remaining = 1
student A and student B click at nearly the same time
```

### Sequence

```text
A: duplicate-registration check -> no active row
B: duplicate-registration check -> no active row

A: cheap availability precheck sees 1
B: cheap availability precheck sees 1

A: atomic decrement succeeds
   seats_remaining becomes 0

B: atomic decrement condition fails
   because seats_remaining > 0 is no longer true
   update returns zero rows
```

### Outcomes

```text
A -> gets the seat
B -> receives "Workshop is full"
```

### Why this is safe

- the precheck may be stale, but the conditional update is authoritative
- no oversell is possible because the decrement itself is guarded

---

## 7. Payment Branches After Reservation

### 7.1 Free workshop

If `price = 0`:

1. payment row is marked success with transaction id `"free"`
2. registration changes:

```text
PENDING -> CONFIRMED
```

3. notification event is published

### 7.2 Paid workshop

If `price > 0`:

1. payment gateway is called **after** the reservation transaction
2. if payment succeeds:
   - payment becomes `SUCCESS`
   - registration becomes `CONFIRMED`
3. if payment fails:
   - reservation is cancelled
   - seat is returned

Critical design point:

- external payment is **not** called while the workshop seat row is locked
- this avoids holding hot DB state hostage to a slow external system

---

## 8. Cancellation and Seat Reopening

Function:

```ts
cancelPendingReservation(...)
```

Repository behavior:

1. update pending registration to `CANCELLED`
2. if no pending row changed:
   - do nothing else
3. mark pending payment `FAILED`
4. return seat:

```sql
update workshops
set seats_remaining = least(seats_remaining + 1, capacity)
where id = $1
```

Why `least(...)` is used:

- ensures repeated or duplicated cancellation paths never push available seats above total capacity

Then service clears:

```text
registration:soldout:<workshopId>
```

Why:

- if a workshop had sold out but a pending reservation is cancelled, a seat has reopened
- future requests must be allowed to reach the DB again

---

## 9. Failure Modes and Their Handling

### 9.1 Duplicate submit from the same client

Handled by:

- `Idempotency-Key`
- Redis response replay
- PostgreSQL persisted idempotency state

Outcome:

- completed duplicate returns the original response
- in-progress duplicate returns `409`

### 9.2 Same student sends multiple different requests

Handled by:

- `registrations (user_id, workshop_id)` uniqueness
- registration row lookup with `FOR UPDATE`

Outcome:

- only one active registration survives

### 9.3 Many students race for one seat

Handled by:

- atomic conditional decrement

Outcome:

- exactly one winner
- losers receive `Workshop is full`

### 9.4 Workshop already sold out

Handled by:

- cheap DB precheck
- Redis sold-out marker after first confirmed loser
- pre-auth Redis short-circuit on later attempts

Outcome:

- repeated losers become cheap to reject

### 9.5 Invalid paid request without `paymentToken`

Handled by:

- prevalidation before reservation

Outcome:

- no seat lock
- no registration row
- no payment row

### 9.6 Payment failure after a seat was reserved

Handled by:

- cancel pending reservation
- return seat bounded by capacity
- clear sold-out Redis marker

Outcome:

- inventory restored safely

---

## 10. Evidence from Tests

### Unit coverage

`registration-idempotency.test.ts` verifies:

- free registration consumes exactly one seat
- missing payment token is rejected before reservation
- full workshop creates no rows
- duplicate active registration does not consume another seat
- cancelled retry reuses the same row
- payment failure returns the seat
- cancellation never increases seats above capacity
- sold-out state is marked when full

### Real-service integration coverage

`real-services.integration.test.ts` verifies:

- two students racing for the last seat produce exactly:
  - one success
  - one `Workshop is full`
- 100 concurrent HTTP attempts against a 60-seat workshop produce exactly:
  - 60 confirmed registrations
  - 40 full responses
  - `seats_remaining = 0`
  - no overbooking
- one spammy student can be rate-limited without penalizing another student on the same IP

---

## 11. End-to-End Timeline Example

```text
Student clicks Register
│
├─ Redis pre-auth IP limiter
├─ Redis sold-out cache check
├─ bearer token verification
├─ Redis global limiter
├─ Redis per-student limiter
├─ idempotency check
│
└─ registration service
   ├─ get workshop price
   ├─ reject missing payment token if paid
   └─ reserveSeat transaction
      ├─ lock same-student registration row, if any
      ├─ cheap seats_remaining precheck
      ├─ atomic conditional seat decrement
      ├─ create/reuse registration row
      └─ create/update payment row

Then:

free workshop
  └─ mark payment success -> confirm registration

paid workshop
  ├─ payment success -> confirm registration
  └─ payment failure -> cancel reservation -> return seat
```

---

## 12. Current Design Tradeoffs

### Strengths

- strong correctness
- small critical section
- cheap rejection after sell-out
- retry-safe
- fairer under client spam

### Remaining realities

- a real successful registration still performs several database writes
- sustained throughput for thousands of successful registrations depends on deployment capacity
- the “12,000 students access the system” requirement is not the same as “12,000 successful writes to one workshop”

---

## 13. One-Sentence Summary

The server wins the seat race by letting many students *try*, but allowing only one request to atomically decrement the final available seat, while every surrounding layer exists to make duplicates, retries, invalid attempts, and post-sellout traffic cheaper and safer to handle.
