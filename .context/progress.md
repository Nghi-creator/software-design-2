# Progress: UniHub Workshop

## Completed
- **Project Concept**: UniHub Workshop requirements finalized.
- **System Design**: Technical Blueprint (design.md) established.
- **Context Setup**: Reorganized project context documents.
- **Context Skill**: Repo-local Codex skill `.codex/skills/use-context` added for consistent `.context` usage.
- **API Alignment Pass**: Backend schema and core routes aligned with payment/check-in specs: Room, Payment, Checkin, idempotency states, RBAC headers, short payment transactions, and item-level offline sync.
- **Controller Layer**: API routes now delegate to controllers; workshop/room/check-in controllers call services instead of embedding request logic in route files.
- **Supabase Postgres Switch**: API no longer uses Prisma Client. Database access now uses `pg` against Supabase Postgres, with schema setup in `services/api/sql/001_init_supabase.sql`.
- **Supabase Seed SQL**: Added `services/api/sql/002_seed_supabase.sql` with sample users, rooms, workshops, registrations, payments, and check-ins for local/demo data.
- **JWT Auth**: Added `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, HS256 access tokens via `JWT_SECRET`, scrypt password hashes, bearer-token middleware, `users.password_hash`, and seed login hashes (`Password123`).
- **Registration Consistency**: Seat reservation now reuses cancelled registration/payment rows for retries, cancellation releases a seat only once, confirmation requires `PENDING`, and idempotency completion is persisted before sending JSON responses.
- **QR Token Retrieval**: Added `GET /api/checkin/qr/:registrationId` to return confirmed registration QR tokens with owner/staff/organizer authorization; clients render the QR image locally.
- **Browse Query Support**: Added filtering, sorting, and paginated list responses for room and workshop browse endpoints.

## In Progress
- API contract still partial; repository layer, request validation, admin stats, QR validation, async upload/summary status, and CSV import status endpoints remain undefined. Supabase SQL schema must be applied manually per environment.

## Next Steps
- Add tests for registration/payment idempotency, cancelled-registration retry, idempotent seat release, and offline check-in sync.
- Add remaining API endpoints from `api_spec.md` Still Undefined section.
