# UniHub Workshop Technical Design

## Architecture

UniHub uses a layered modular monolith for core product flows, with asynchronous workers for slow or retryable tasks.

- Presentation: one React web app with student/admin routes protected by RBAC, plus a mobile check-in client.
- API layer: Express REST controllers, validation, authentication, and response shaping.
- Service layer: workshop, registration, payment, check-in, notification, AI summary, and CSV import logic.
- Repository layer: all PostgreSQL access and transactions.
- Async layer: BullMQ queues backed by Upstash Redis, with workers for email notifications and other retryable jobs.

Keep the backend stateless so it can scale horizontally during registration spikes.

## Containers

- React Web App: serves both students and admins. Student routes support browsing, registration, payment, and QR display. Admin routes support workshop/room management, PDF resources, and registration statistics. Route access and visible actions must follow RBAC.
- Mobile Check-in App: scan QR codes, support offline local queue, sync when online.
- API Server: owns business logic, auth/RBAC, registration concurrency, payment coordination, and check-in APIs.
- PostgreSQL: primary data store for users, rooms, workshops, registrations, payments, check-ins, and notifications.
- Upstash Redis: cache, token-bucket rate limiting, idempotency response cache, and BullMQ job storage.
- BullMQ + Workers: background notifications and other retryable jobs.
- Object Storage: uploaded workshop PDFs.
- External Services: mock payment gateway and Google Gemini API.

## Communication

- The React web app and mobile client call the API over REST.
- Backend publishes async events to BullMQ when work does not need to block user-facing requests.
- Workers consume queue messages and retry transient failures where appropriate.
- Mobile check-in stores scans locally when offline and syncs batches after connectivity returns.

Example synchronous flows:

- `GET /workshops`: student lists available workshops.
- `POST /register`: student registers and may trigger payment.
- `POST /checkin`: staff checks in one registration.

Example async flows:

- Registration confirmed -> notification job -> email worker.
- Future retryable background work can be moved behind BullMQ workers when warranted.

## Key Reliability Patterns

### Registration Concurrency

Use PostgreSQL transactions and row-level locks around capacity checks and seat updates. Registration must never oversell seats. See `data_models.md` for entities and `specs/payment.md` for payment sequencing.

### Rate Limiting

Use Redis token-bucket rate limiting for spike-prone endpoints. Registration combines:
- a global bucket to protect API capacity during the 12,000-student opening surge
- a per-student bucket so one client cannot crowd out others; unauthenticated callers fall back to IP identity

Return `429` when either bucket exceeds its configured limit.

### Payment Resilience

Use an `Idempotency-Key` for registration/payment POST flows. Cache completed responses in Redis with 24h TTL and persist enough data in PostgreSQL to recover from cache loss.

Wrap the mock payment gateway with a circuit breaker. When failures cross the configured threshold, fail fast with a user-safe payment maintenance message instead of tying up API resources.

### Offline Check-in

The mobile app stores unsynced QR scans in local storage while offline. Sync should send batches to the backend. Backend processing must be idempotent and must not overwrite already checked-in records. See `specs/checkin.md`.

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
