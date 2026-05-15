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

- PDF/AI summary status endpoint.

## Upcoming

- [ ] PDF/AI summary status endpoint

## Done Locally

- [x] Workshop browsing/search pagination
  - Added documented filters/sorts/pagination, bounded `pageSize`, `400` handling for invalid params, and automated coverage for defaults plus invalid input.
- [x] Workshop-side repository extraction
  - Moved workshop persistence into `services/api/src/repositories/workshopRepository.ts`.
- [x] Admin statistics endpoint
  - Added organizer-only workshop stats with capacity, seats remaining, registration counts by status, checked-in count, successful payment count, and integration coverage.
