# Backend Services Assignment Split

Goal: finish the remaining `services/` backend work from `.context/progress.md` with two people working in parallel, while avoiding edits to the same files whenever possible. Do not touch `apps/` yet.

## Ground Rules

- Codex should read this file before starting backend task work. If the local developer identity is set to Person A or Person B and the user asks Codex to do work assigned to the other person, Codex must stop and ask for confirmation before proceeding.
- Before starting, pull/rebase the shared branch and run `npm test` inside `services/api`.
- Keep each PR/merge small and domain-scoped. Prefer adding new route/controller/service/repository files over expanding shared files.
- Update `.context/api_spec.md` before changing endpoint behavior. Update `.context/progress.md` only after a task is actually done.
- Avoid editing shared files at the same time. The shared-file owner for a given change should make the tiny mount/export edit after the domain work is ready.
- Run `npm test` before pushing. Add focused tests for each new backend flow.

## Shared Files: Coordinate Before Editing

These files are likely conflict points. Treat them as short handoff edits, not main work areas:

| File | Coordination Rule |
| --- | --- |
| `services/api/src/app.ts` | Only edit to mount a new top-level route. Whoever adds a new route owns this tiny edit for that task. |
| `services/api/package.json` / `package-lock.json` | Avoid new dependencies unless both people agree. Prefer built-in Node test runner and existing packages. |
| `services/api/sql/001_init_supabase.sql` | Person B owns schema changes for CSV import jobs/errors. Person A should avoid schema edits unless admin stats truly need an index. |
| `.context/api_spec.md` | Edit only the section for your own endpoints. |
| `.context/progress.md` | Last merger of the day updates the current state to avoid dueling progress edits. |

## Person A: Workshop, Admin, PDF, And Browsing Track

Primary ownership: workshop-facing APIs and organizer/admin read models.

Own these files/modules:

- `services/api/src/routes/workshop.ts`
- `services/api/src/controllers/workshopController.ts`
- `services/api/src/services/workshop.ts`
- New files under `services/api/src/repositories/` for workshop, room, registration, payment, PDF/admin read queries as needed
- New tests named like `services/api/tests/workshop-*.test.ts` and `services/api/tests/admin-*.test.ts`

Tasks:

1. Define and implement workshop browsing/search pagination.
   - Update `.context/api_spec.md` for query params and response shape.
   - Add pagination, search/filter params, and consistent response metadata for `GET /api/workshops`.
   - Acceptance: large workshop lists do not return unbounded arrays, invalid pagination returns `400`, and tests cover defaults plus invalid params.

2. Add admin statistics endpoint.
   - Suggested endpoint: `GET /api/workshops/:id/stats` or `GET /api/admin/workshops/:id/stats`; document the final choice first.
   - Auth: `ORGANIZER`.
   - Include at minimum capacity, seats remaining, registration counts by status, checked-in count, and paid/success payment count for paid workshops.
   - Acceptance: organizers can read stats, students/check-in staff cannot, and tests cover counts.

3. Add async PDF upload/AI summary status API.
   - Keep current synchronous summary behavior if needed, but expose a clear status endpoint for clients/admin.
   - Suggested endpoint: `GET /api/workshops/:id/summary-status`.
   - If schema changes are needed, coordinate with Person B before touching SQL. Prefer using existing `pdf_url` and `ai_summary` first.
   - Acceptance: endpoint returns status such as `not_uploaded`, `processing`, `ready`, or `failed`; tests cover missing workshop and ready/not-uploaded states.

4. Start repository extraction for workshop-owned domains.
   - Move direct DB reads/writes out of workshop service/controller code into repository files.
   - Keep public service behavior unchanged while extracting.
   - Acceptance: `npm test` stays green, and services no longer call `query` directly for the touched workflow.

Avoid editing:

- `services/api/src/routes/checkin.ts`
- `services/api/src/controllers/checkinController.ts`
- `services/api/src/services/checkin.ts`
- `services/api/src/jobs/csvSync.ts`
- CSV import schema unless coordinated

## Person B: Check-In, CSV Import, Validation, And Integration Track

Primary ownership: operational backend flows, QR validation, legacy CSV sync, and deploy confidence tests.

Own these files/modules:

- `services/api/src/routes/checkin.ts`
- `services/api/src/controllers/checkinController.ts`
- `services/api/src/services/checkin.ts`
- `services/api/src/jobs/csvSync.ts`
- New files under `services/api/src/routes/import.ts`, `controllers/importController.ts`, `services/importStatus.ts`, and import/check-in repositories as needed
- `services/api/sql/001_init_supabase.sql` and `002_seed_supabase.sql` for CSV import job/error tables only
- New tests named like `services/api/tests/checkin-*.test.ts`, `csv-import-*.test.ts`, and integration tests

Tasks:

1. Define and implement QR validation endpoint separate from check-in.
   - Update `.context/api_spec.md` for the endpoint.
   - Suggested endpoint: `POST /api/checkin/validate` with `{ qrCode }`.
   - Auth: `CHECKIN_STAFF`.
   - It must validate QR status without mutating `checked_in_at` or creating a `checkins` row.
   - Acceptance: tests prove valid, already checked-in, cancelled/pending, and unknown QR behavior.

2. Add CSV import status and error reporting.
   - Add SQL tables if needed for `csv_import_jobs` and `csv_import_errors`.
   - Refactor `csvSync.ts` so import execution records job start/end, success count, error count, and row-level errors.
   - Suggested endpoint: `GET /api/imports/csv/latest` and optionally `GET /api/imports/csv/:id/errors`.
   - Auth: `ORGANIZER`.
   - Acceptance: malformed rows are reported without stopping the whole import, duplicate student rows are handled safely, and tests cover partial failure.

3. Add request validation middleware/pattern for backend entry points.
   - Start with check-in sync, QR validation, and CSV status params.
   - Keep it lightweight; no new dependency unless agreed.
   - Acceptance: invalid payloads return `400` with consistent `{ success: false, error }` shape.

4. Add real-service integration test scaffolding.
   - Keep unit tests infrastructure-free.
   - Add opt-in integration tests that run only when env vars like `RUN_INTEGRATION_TESTS=true`, `DATABASE_URL`, and `REDIS_URL` are present.
   - Cover at least registration/payment idempotency and check-in sync against real Postgres/Redis.
   - Acceptance: normal `npm test` still passes without external services; integration tests document how to run.

5. Start repository extraction for check-in/import-owned domains.
   - Move direct DB reads/writes out of check-in and CSV import service code into repository files.
   - Acceptance: current check-in tests remain green, and services no longer call `query` directly for touched workflows.

Avoid editing:

- `services/api/src/routes/workshop.ts`
- `services/api/src/controllers/workshopController.ts`
- `services/api/src/services/workshop.ts`
- Workshop/admin stats tests

## Suggested Merge Order

1. Person B: QR validation endpoint and tests.
2. Person A: workshop pagination/search and tests.
3. Person B: CSV import status schema/service/endpoints.
4. Person A: admin stats endpoint.
5. Person B: opt-in integration test scaffolding.
6. Person A: PDF/AI summary status endpoint.
7. Both: repository extraction by owned domain, one domain at a time.

## Done Criteria For Both Tracks

- `npm test` passes in `services/api`.
- `.context/api_spec.md` matches implemented endpoints.
- `.context/progress.md` lists completed tasks and remaining gaps.
- New endpoints enforce RBAC from `REQUIREMENTS.md`: Student, Organizer/BTC, and Check-in Staff/Nhan su check-in.
- No `apps/` changes are included.
