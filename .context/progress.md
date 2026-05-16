# Progress: UniHub Workshop

## Completed
- **Project Concept**: UniHub Workshop requirements finalized.
- **System Design**: Technical Blueprint (design.md) established.
- **Context Setup**: Reorganized project context documents.
- **Context Skill**: Repo-local Codex skill `.codex/skills/use-context` added for consistent `.context` usage.
- **API Alignment Pass**: Backend schema and core routes aligned with payment/check-in specs: Room, Payment, Checkin, idempotency states, role-based authorization, short payment transactions, and item-level offline sync.
- **Controller Layer**: API routes now delegate to controllers; workshop/room/check-in controllers call services instead of embedding request logic in route files.
- **Supabase Postgres Switch**: API no longer uses Prisma Client. Database access now uses `pg` against Supabase Postgres, with schema setup in `supabase/migrations/20260514000000_init_supabase.sql`.
- **Supabase Seed SQL**: Added `supabase/seed.sql` with sample users, rooms, workshops, registrations, payments, and check-ins for local/demo data.
- **JWT Auth**: Added `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, HS256 access tokens via `JWT_SECRET`, scrypt password hashes, bearer-token middleware, `users.password_hash`, and seed login hashes (`Password123`).
- **Registration Consistency**: Seat reservation now reuses cancelled registration/payment rows for retries, cancellation releases a seat only once, confirmation requires `PENDING`, and idempotency completion is persisted before sending JSON responses.
- **QR Token Retrieval**: Added `GET /api/checkin/qr/:registrationId` to return confirmed registration QR tokens with owner/staff/organizer authorization; clients render the QR image locally.
- **Backend Idempotency Tests**: Added `services/api` Node test runner coverage for registration/payment idempotency middleware replay, duplicate in-progress requests, cancelled-registration retry, idempotent seat release, and offline check-in sync duplicate handling. Run with `npm test` from `services/api`.
- **Auth Middleware Tests**: Added `services/api` coverage for bearer-only identity handling, authentication gating, and RBAC allow/deny behavior in `auth-middleware.test.ts`.
- **Bearer-Only Auth**: Removed legacy `x-user-id` / `x-user-role` identity injection so protected routes now require valid bearer-token authentication.
- **Auth Route Integration Tests**: Added live HTTP coverage for login success/failure, `/api/auth/me`, invalid and expired bearer tokens, ignored legacy headers, post-deletion/post-role-change token rejection, and protected-route 401/403 responses.
- **Browse Query Support**: Added filtering, sorting, and paginated list responses for room and workshop browse endpoints, with automated coverage for defaults and invalid params.
- **Admin Workshop Stats**: Added organizer-only `GET /api/workshops/:id/stats` with capacity, seats remaining, registration counts by status, checked-in count, successful payment count, and integration coverage for RBAC/counts.
- **Workshop Summary Status**: Added organizer-only `GET /api/workshops/:id/summary-status` with truthful current-state reporting for PDF/AI summary availability and integration coverage for ready/processing/not-uploaded cases.
- **Workshop Admin CRUD**: Added organizer-only `PUT /api/workshops/:id` and `DELETE /api/workshops/:id`, preserved reserved-seat counts across capacity edits, rejected destructive capacity reductions, blocked deletion when registrations exist, and added integration coverage.
- **AI Summary Smoke Verification**: Generated a sample workshop PDF, exercised the live Gemini summary path, and updated the PDF parser integration for the installed `pdf-parse` v2 API.
- **Repository Layer Pass**: Moved service-layer SQL for auth, room, workshop, registration, and check-in flows into dedicated repository modules.
- **DI/Test Merge Resolution**: Preserved repository-layer registration/check-in logic while keeping centralized DI hooks in `services/api/src/di.ts` for idempotency and offline sync tests.
- **CSV Import Status/Error Reporting**: Added `csv_import_jobs` and `csv_import_errors`, refactored legacy student CSV sync through import service/repository code, exposed organizer status/error endpoints, and added partial-failure tests.
- **Check-In/Import Request Validation**: Added lightweight route middleware for UUID params, online check-in QR payloads, offline sync item payloads, and CSV import error pagination, with focused middleware tests.
- **Opt-In Real-Service Integration Scaffolding**: Added skipped-by-default Postgres/Redis integration tests for registration/payment idempotency and offline check-in sync. Run with `RUN_INTEGRATION_TESTS=true DATABASE_URL=... REDIS_URL=... npm test`.
- **Check-In/Import Repository Extraction**: Check-in QR retrieval, online/offline check-in, and CSV import status/error flows now keep DB access in repository modules with dependencies supplied through `di.ts`.
- **Mobile Check-In App**: Replaced the Flutter visual scaffold with a working staff app: bearer-token login, secure session persistence, camera QR scanning, online check-in calls, durable SQLite offline queue, connectivity-aware automatic retry, item-level sync result handling, and queue/profile UI.
- **Mobile Login Feedback**: The check-in login screen now surfaces transport failures instead of appearing inert when the API cannot be reached.
- **Mobile LAN API Hardening**: The app now accepts `API_BASE_URL` values with or without a URL scheme and enables Android cleartext HTTP for local-network testing against development servers.
- **Mobile Theme Alignment**: Mapped the shared dark-purple design tokens into Flutter `ThemeData` and restyled the login, scanner, queue, and profile surfaces to match the React web app's layered cards, purple actions, and status-pill language.
- **API Request Logging**: Added lightweight Express request logging so mobile/backend debugging can confirm whether requests reach the server, including method, path, status, latency, IP, and user agent without logging sensitive bodies.
- **API Response Logging**: Added redacted JSON response logging for backend debugging, masking secrets such as passwords, access tokens, auth tokens, and QR codes.
- **Web Progress Tracker**: Added `.context/web-progress.md` for React web tasks and requirement coverage.
- **Web Schedule Filter Polish**: Replaced the student schedule day dropdown with native start/end date inputs, added All/Registered/Unregistered schedule filtering, suppressing the empty-state panel for date ranges with no workshops, and restyled confirmed registration/QR actions as compact purple pills.
- **Web Manual Verification**: Completed student browse/detail/register, organizer CRUD/stats, and auth/RBAC verification for the React web app.
- **Event-Driven Notifications**: Added BullMQ registration-confirmed publishing, a separate notification worker, extensible channel dispatching, delivery-status persistence, and unit coverage for send/idempotency/failure paths.
- **Notification Real-Service Verification**: Added opt-in BullMQ/Postgres integration coverage that publishes a real registration-confirmed job, runs the real worker, and asserts persisted `SENT` delivery status.
- **Requirement Flow Test Pass**: Added backend coverage for AI PDF text cleaning/model handoff/fallback, online check-in source behavior, offline sync retry-safe failed items, and CSV import file-level failure reporting. Full `services/api` test suite passes.
- **Registration Seat-Contention Coverage**: Added registration unit coverage for free workshops, missing payment tokens, full workshops, duplicate registrations, and bounded seat release; expanded opt-in real-service coverage with a two-student last-seat race plus a live HTTP burst test proving 100 simultaneous requests against 60 seats yield exactly 60 confirmations and no overbooking.

## In Progress
- API contract still partial for future features outside the current check-in flow. QR validation is intentionally merged into check-in requests. Supabase SQL schema must be applied manually per environment.

## Next Steps
- Add remaining APIs only when new product scope requires them; keep QR validation merged into check-in unless requirements change.
- Apply the new notifications migration per environment and replace the console email transport with a real provider when product scope needs outbound email.
