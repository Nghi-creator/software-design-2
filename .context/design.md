# UniHub Workshop Technical Design

## Architecture

UniHub uses a layered modular monolith for core product flows, with asynchronous workers for slow or retryable tasks.

- Presentation: one React web app with student/admin routes protected by RBAC, plus a Flutter mobile check-in client.
- API layer: Express REST controllers, validation, authentication, and response shaping.
- Service layer: auth, workshop, registration, payment, check-in, notification, AI summary, and CSV import logic.
- Repository layer: all PostgreSQL access and transactions.
- Async layer: BullMQ queues backed by Upstash Redis, with a notification worker for retryable email delivery.

Keep the backend stateless so it can scale horizontally during registration spikes.

## Containers

- React Web App: serves both students and admins. Student routes support browsing, registration, payment, QR display, and notification inbox/history. Admin routes support workshop/room management, PDF inputs, CSV import visibility, and registration statistics. Route access and visible actions must follow RBAC.
- Mobile Check-in App: scans QR codes, stores offline scans in a durable SQLite queue, and syncs when online.
- API Server: owns business logic, auth/RBAC, registration concurrency, payment coordination, and check-in APIs.
- PostgreSQL: primary data store for users, rooms, workshops, registrations, payments, check-ins, and notifications.
- Upstash Redis: cache, token-bucket rate limiting, idempotency response cache, and BullMQ job storage.
- BullMQ + Workers: background notification delivery.
- PDF Handling: workshop create/update accepts PDF uploads in memory for AI summary generation and stores optional `pdf_url` metadata; persistent object-storage upload is not implemented in the current codebase.
- External Services: mock payment gateway, Google Gemini API, and Gmail SMTP.

## Communication

- The React web app and mobile client call the API over REST.
- Backend publishes registration-confirmed events to BullMQ when notification work does not need to block user-facing requests.
- Workers consume queue messages and retry transient failures where appropriate.
- Mobile check-in stores scans in SQLite when offline and syncs batches after connectivity returns.
- Legacy student CSV synchronization runs as a scheduled cron job rather than through BullMQ.

Example synchronous flows:

- `GET /api/workshops`: student lists available workshops.
- `POST /api/workshops/:id/register`: student registers and may trigger payment.
- `POST /api/checkin`: staff checks in one registration.

Example async flows:

- Registration confirmed -> notification job -> notification worker -> persisted notification status plus Gmail email delivery.

## Key Reliability Patterns

### Registration Concurrency

Use PostgreSQL transactions with a cheap no-lock availability precheck plus an atomic conditional seat decrement (`... where seats_remaining > 0 returning ...`) for reservation. Registration must never oversell seats, and once a workshop is already full, losers should fail before contending on the hot decrement row. See `data_models.md` for entities and `specs/payment.md` for payment sequencing.

### Rate Limiting

Use Redis token-bucket rate limiting for spike-prone endpoints. Registration combines:
- a pre-auth IP bucket on the registration path to shed abusive traffic before DB-backed bearer verification
- a pre-auth Redis sold-out cache so already-full workshops can reject later attempts before auth or DB work
- a post-auth global bucket to protect API capacity during the 12,000-student opening surge
- a per-student bucket so one client cannot crowd out others; unauthenticated callers fall back to IP identity

Return `429` when either bucket exceeds its configured limit.

### Payment Resilience

Use an `Idempotency-Key` for registration/payment POST flows. Cache completed responses in Redis with 24h TTL and persist enough data in PostgreSQL to recover from cache loss.

Wrap the mock payment gateway with a circuit breaker. When failures cross the configured threshold, fail fast with a user-safe payment maintenance message instead of tying up API resources.

### Offline Check-in

The mobile app stores unsynced QR scans in SQLite while offline. Sync sends batches to the backend. Backend processing is idempotent and must not overwrite already checked-in records. See `specs/checkin.md`.

### Access Control

Use RBAC:

- `STUDENT`: browse workshops and register.
- `ORGANIZER`: manage workshops, rooms, PDFs, and stats.
- `CHECKIN_STAFF`: scan QR codes and sync offline check-ins.

Add feature-level checks in services when RBAC alone is too coarse.

## Important Tradeoffs

- Modular monolith over microservices: simpler development and deployment for the assignment scale, while preserving module boundaries for future extraction.
- PostgreSQL over NoSQL for core data: stronger consistency and row locking for seat inventory, with Redis used to reduce hot-path pressure.
- Async workers over synchronous background work: faster user-facing responses and better retry behavior, at the cost of queue and eventual-consistency handling.
- BullMQ on Upstash Redis over RabbitMQ for the current scope: preserves a recognizable queue + worker architecture while reusing managed Redis already needed by the system. QStash remains the better fallback if deployment becomes fully serverless and cannot host a worker process.
- RBAC over ABAC: simpler and sufficient for the current role model; add explicit service checks before adopting a policy engine.

## Cross-References

- `data_models.md`: schema and entity ownership.
- `api_spec.md`: actual endpoint contracts.
- `specs/payment.md`: payment and idempotency flow details.
- `specs/checkin.md`: offline check-in flow details.
- `decisions.md`: dated architecture decisions and rationale.
