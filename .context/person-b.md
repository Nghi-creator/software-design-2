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
- CSV import job/error schema in `services/api/sql/001_init_supabase.sql` and seed updates in `002_seed_supabase.sql`
- Tests named like `services/api/tests/checkin-*.test.ts`, `csv-import-*.test.ts`, and integration tests

## Avoid

- `services/api/src/routes/workshop.ts`
- `services/api/src/controllers/workshopController.ts`
- `services/api/src/services/workshop.ts`
- Workshop/admin stats tests
- `apps/`

## Active Task

- [ ] Opt-in real Postgres/Redis integration test scaffolding

## Upcoming

- [ ] QR validation endpoint separate from check-in
  - Files expected: `routes/checkin.ts`, `controllers/checkinController.ts`, `services/checkin.ts`, check-in repository/test files
  - Acceptance: validates without mutating check-in state; tests cover valid, already checked-in, cancelled/pending, and unknown QR behavior
- [ ] Check-in/import repository extraction

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
