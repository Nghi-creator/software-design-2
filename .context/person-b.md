# Person B Local Tracker

This is Person B's local Codex tracker. Use it to keep check-in/import/integration work focused without mixing in Person A's workshop/admin tasks.

## Identity

- Person: Person B
- Assignment source: `assignments.md`
- Scope: QR validation, CSV import status/error reporting, request validation, integration test scaffolding, and check-in/import repository extraction.

## Own

- `services/api/src/routes/checkin.ts`
- `services/api/src/controllers/checkinController.ts`
- `services/api/src/services/checkin.ts`
- `services/api/src/jobs/csvSync.ts`
- New import route/controller/service files
- CSV import job/error schema in `supabase/migrations/*csv_process.sql`
- Tests named like `services/api/tests/checkin-*.test.ts`, `csv-import-*.test.ts`, and integration tests

## Avoid

- `services/api/src/routes/workshop.ts`
- `services/api/src/controllers/workshopController.ts`
- `services/api/src/services/workshop.ts`
- Workshop/admin stats tests
- `apps/`

## Active Task

- None.

## Upcoming

- None.

## Done Locally

- [x] CSV import status and error reporting
  - Added `csv_import_jobs` and `csv_import_errors` schema.
  - Refactored cron CSV sync through `services/importStatus.ts` and `repositories/importRepository.ts`.
  - Added organizer endpoints `GET /api/imports/csv/latest` and `GET /api/imports/csv/:id/errors`.
  - Added partial-failure coverage in `services/api/tests/csv-import-status.test.ts`.
- [x] Request validation pattern for check-in/import endpoints
  - Added `middleware/requestValidation.ts` for UUID params, online check-in payloads, offline sync payloads, and CSV import error pagination.
  - Moved check-in/import route validation before controllers and kept controllers thin.
  - Added coverage in `services/api/tests/request-validation.test.ts`.
- [x] Opt-in real Postgres/Redis integration test scaffolding
  - Added `services/api/tests/real-services.integration.test.ts`.
  - Normal `npm test` skips real-service checks unless `RUN_INTEGRATION_TESTS=true`, `DATABASE_URL`, and `REDIS_URL` are set.
  - Covers registration/payment idempotency with real Postgres/Redis and offline check-in sync idempotency with real Postgres.
- [x] Check-in/import repository extraction
  - Routed check-in QR retrieval through `CheckinDependencies` instead of direct DB imports.
  - Confirmed check-in/import services and controllers do not call database APIs directly.
  - Added `services/api/tests/checkin-qr.test.ts` to cover injected repository access and authorization.
