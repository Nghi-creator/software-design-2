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
- **Auth Route Integration Tests**: Added live HTTP coverage for `/api/auth/me`, invalid bearer tokens, ignored legacy headers, and protected-route 401/403 responses.
- **Browse Query Support**: Added filtering, sorting, and paginated list responses for room and workshop browse endpoints, with automated coverage for defaults and invalid params.
- **Repository Layer Pass**: Moved service-layer SQL for auth, room, workshop, registration, and check-in flows into dedicated repository modules.
- **DI/Test Merge Resolution**: Preserved repository-layer registration/check-in logic while keeping centralized DI hooks in `services/api/src/di.ts` for idempotency and offline sync tests.

## In Progress
- Backend deploy-first work remains focused on `services/`; `apps/` has not been touched yet.
- API contract still partial; request validation, admin stats, QR validation, async upload/summary status, and CSV import status endpoints remain undefined. Supabase SQL schema must be applied manually per environment.

## Next Steps
- Add remaining API endpoints from `api_spec.md` Still Undefined section.
- Add integration tests that exercise real Postgres/Redis once backend deployment configuration is settled.
