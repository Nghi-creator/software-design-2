# Person A Local Tracker

This is Person A's local Codex tracker. Use it to keep workshop/admin/PDF work focused without mixing in Person B's check-in/import tasks.

## Identity

- Person: Person A
- Assignment source: `assignments.md`
- Scope: Workshop browsing/search, admin stats, PDF/AI summary status, and workshop-side repository extraction.

## Own

- `services/api/src/routes/workshop.ts`
- `services/api/src/controllers/workshopController.ts`
- `services/api/src/services/workshop.ts`
- New workshop/admin/PDF repository files under `services/api/src/repositories/`
- Tests named like `services/api/tests/workshop-*.test.ts` and `services/api/tests/admin-*.test.ts`

## Avoid

- `services/api/src/routes/checkin.ts`
- `services/api/src/controllers/checkinController.ts`
- `services/api/src/services/checkin.ts`
- `services/api/src/jobs/csvSync.ts`
- CSV import schema unless coordinated with Person B
- `apps/`

## Active Task

- [ ] Workshop browsing/search pagination
  - Files expected: `routes/workshop.ts`, `controllers/workshopController.ts`, `services/workshop.ts`, workshop repository/test files
  - Acceptance: documented query params, bounded pagination, invalid params return `400`, tests cover defaults and invalid params

## Upcoming

- [ ] Admin statistics endpoint
- [ ] PDF/AI summary status endpoint
- [ ] Workshop-side repository extraction

## Done Locally

- None yet.
