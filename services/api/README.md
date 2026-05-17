# UniHub Workshop API

Express API for the UniHub demo. It connects directly to Supabase Postgres with `pg`, uses Redis for rate limiting/idempotency/BullMQ, starts the CSV cron import in the API process, and runs notification delivery in a separate worker process.

## Requirements

- Node.js 18 or newer.
- Supabase Postgres database with the repo migrations and seed applied.
- Redis, either local Docker or hosted.
- Gmail App Password credentials when running the email notification worker.

## Database Setup

Apply the current SQL files from the repo root in this exact order:

1. `supabase/migrations/20260514000000_init_supabase.sql`
2. `supabase/migrations/20260515163034_csv_process.sql`
3. `supabase/migrations/20260516141950_more_workshops.sql`
4. `supabase/migrations/20260517000000_room_layout_urls.sql`
5. `supabase/migrations/20260517090000_notifications.sql`
6. `supabase/migrations/20260517120000_notification_read_receipts.sql`
7. `supabase/seed.sql`

Supabase Dashboard -> SQL Editor is the simplest path for a demo environment. With `psql`, use:

```bash
for file in ../../supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$file"; done
psql "$DATABASE_URL" -f ../../supabase/seed.sql
```

## Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres"
DATABASE_SSL="true"
REDIS_URL="redis://localhost:6379"
GEMINI_API_KEY="optional_for_live_ai_summary"
MAIL_USER="your_gmail_address@gmail.com"
MAIL_PASS="your_gmail_app_password"
JWT_SECRET="replace-with-at-least-32-characters"
JWT_EXPIRES_IN_SECONDS=86400
AUTH_ALLOW_ROLE_REGISTRATION=true
PORT=3000
```

`MAIL_USER` and `MAIL_PASS` are required by the notification worker when it processes email jobs. Use a Gmail App Password, not the normal account password.

## Local Development

```bash
npm install
docker compose up -d redis
npm run dev
```

The API listens on `http://localhost:3000` by default. Check it with:

```bash
curl http://localhost:3000/health
```

Run the notification worker in a second terminal:

```bash
npm run worker:notifications
```

## Seed Data

`supabase/seed.sql` creates demo users, rooms, workshops, registrations, payments, and check-ins. Seed users all use password `Password123`:

- Student: `mai.nguyen@student.unihub.edu`
- Organizer: `admin@unihub.edu`
- Check-in staff: `checkin@unihub.edu`

The CSV cron job reads `services/api/data/students.csv` at 2 AM server time and records import status/errors in the CSV import tables.

## Technical Notes

- **Supabase Postgres:** direct `pg` access through `DATABASE_URL`; Prisma is not used.
- **Seat contention:** registration uses a short transaction with an atomic conditional seat decrement plus fast sold-out rejection. Payment calls are kept outside the hot seat update.
- **Spike protection:** Redis-backed token buckets protect registration globally and per student/IP.
- **Payment resilience:** `opossum` circuit breaker prevents repeated mock gateway timeouts from hanging registration.
- **Idempotency:** `Idempotency-Key` is required for registration/payment POST flows; Redis caches completed responses and Postgres tracks in-progress/completed state.
- **Offline check-in:** `/api/checkin/sync` accepts item batches and returns per-item results so the mobile app can delete, retry, or reconcile queued scans.
- **AI summary:** PDF upload paths use `pdf-parse` and Google Gemini when `GEMINI_API_KEY` is configured.
- **Notifications:** confirmed registrations publish BullMQ `registration.confirmed` jobs; the worker sends email and updates the `notifications` table.

## Tests

```bash
npm test
```

Opt-in real-service tests:

```bash
RUN_INTEGRATION_TESTS=true DATABASE_URL="..." REDIS_URL="..." npm test
```

Live Gmail test:

```bash
RUN_GMAIL_TESTS=true MAIL_USER="..." MAIL_PASS="..." MAIL_TEST_TO="..." npm test
```

## k6 Registration Surge

Only run this against a disposable/test database because it creates many users and registrations.

```bash
npm run dev
npm run load:prepare:registration
BASE_URL=http://127.0.0.1:3000 npm run load:registration
npm run load:cleanup:registration
```

The prep script writes token and workshop metadata under `services/api/load-tests/`. The default disposable workshop has 60 seats to model the assignment's contested-seat scenario.
