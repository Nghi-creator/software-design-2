# Progress: UniHub Workshop

## Completed
- **Project Concept**: UniHub Workshop requirements finalized.
- **System Design**: Technical Blueprint (design.md) established.
- **Context Setup**: Reorganized project context documents.
- **Context Skill**: Repo-local Codex skill `.codex/skills/use-context` added for consistent `.context` usage.
- **API Alignment Pass**: Backend schema and core routes aligned with payment/check-in specs: Room, Payment, Checkin, idempotency states, role-based authorization, short payment transactions, and item-level offline sync.
- **Controller Layer**: API routes now delegate to controllers; workshop/room/check-in controllers call services instead of embedding request logic in route files.
- **Supabase Postgres Switch**: API no longer uses Prisma Client. Database access now uses `pg` against Supabase Postgres, with schema setup in `services/api/sql/001_init_supabase.sql`.
- **Supabase Seed SQL**: Added `services/api/sql/002_seed_supabase.sql` with sample users, rooms, workshops, registrations, payments, and check-ins for local/demo data.
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
- **Web Progress Tracker**: Added `.context/web-progress.md` for React web tasks and requirement coverage.

## In Progress
- Backend deploy-first work remains focused on `services/`; `apps/mobile` currently has a visual Flutter scaffold only, with no real scanner, auth flow, API client, durable offline queue, or sync engine implemented yet.
- API contract still partial; QR validation remains undefined. Supabase SQL schema must be applied manually per environment.

## Next Steps
<<<<<<< Updated upstream
- Add remaining API endpoints from `api_spec.md` Still Undefined section.
- Person B has no active backend task left except QR validation, which remains upcoming pending team decision.
=======
- Start the mobile check-in implementation against the existing `/api/auth/*`, `/api/checkin`, and `/api/checkin/sync` contracts:
  - staff login/session handling
  - QR scanner integration
  - durable local queue with retry/sync states
  - connectivity-aware online/offline flow
  - per-item sync result handling
- Add remaining API endpoints from `api_spec.md` Still Undefined section, especially a separate QR validation contract if the team wants pre-check validation before committing check-in.
>>>>>>> Stashed changes
