# UniHub Workshop Demo

UniHub is a workshop management demo for university events. This repo contains:

- `supabase/migrations/*`: the PostgreSQL schema, applied in filename order.
- `supabase/seed.sql`: demo rooms, workshops, users, registrations, payments, and check-ins.
- `services/api`: Express REST API, CSV cron import, registration/payment/check-in logic.
- `services/api/src/workers/notificationWorker.ts`: BullMQ notification worker.
- `apps/web`: React/Vite web app for students and organizers.
- `apps/mobile`: Flutter check-in app for staff QR scanning and offline sync.

## Prerequisites

- Node.js 18 or newer and npm.
- Upstash Redis, or another hosted Redis instance reachable through `REDIS_URL`.
- A Supabase Postgres project.
- Optional: Flutter SDK for the mobile check-in app.
- Optional but required for real email delivery: Gmail account plus an App Password.

## 1. Create the Database

Apply every migration in order, then apply the seed file:

1. `supabase/migrations/20260514000000_init_supabase.sql`
2. `supabase/migrations/20260515163034_csv_process.sql`
3. `supabase/migrations/20260517000000_room_layout_urls.sql`
4. `supabase/migrations/20260517090000_notifications.sql`
5. `supabase/migrations/20260517120000_notification_read_receipts.sql`
6. `supabase/seed.sql`

The safest grader path is Supabase Dashboard -> SQL Editor: paste and run each file in the order above. If you prefer `psql`, use a direct Supabase Postgres connection string and run:

```bash
for file in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$file"; done
psql "$DATABASE_URL" -f supabase/seed.sql
```

The app itself can use the Supabase pooler URL in `services/api/.env`.

## 2. Configure Redis

Create an Upstash Redis database and copy its TLS URL. The committed demo setup expects hosted Redis rather than local Docker.

## 3. Start the API

```bash
cd services/api
cp .env.example .env
npm install
npm run dev
```

Edit `services/api/.env` before starting:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:6543/postgres"
DATABASE_SSL="true"
REDIS_URL="rediss://<upstash-host>:6379"
JWT_SECRET="replace-with-at-least-32-characters"
JWT_EXPIRES_IN_SECONDS=86400
AUTH_ALLOW_ROLE_REGISTRATION=true
GEMINI_API_KEY="optional-for-live-ai-summary"
MAIL_USER="your_gmail_address@gmail.com"
MAIL_PASS="your_gmail_app_password"
PORT=3000
```

Check the API:

```bash
curl http://localhost:3000/health
```

## 4. Start the Notification Worker

Open a second terminal:

```bash
cd services/api
npm run worker:notifications
```

The API publishes `registration.confirmed` jobs to Redis. The worker consumes those BullMQ jobs, sends email through Gmail SMTP, and persists delivery status in the `notifications` table. Configure `MAIL_USER` and `MAIL_PASS` for the full email path; without them, registration still works but the worker cannot deliver email jobs.

## 5. Start the Web App

Open a third terminal:

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

`apps/web/.env.example` points at `http://localhost:3000/api`, which matches the API default. Vite usually prints `http://localhost:5173/`.

## Demo Accounts

All seeded accounts use password `Password123`.

| Role | Email | Use |
| --- | --- | --- |
| Student | `mai.nguyen@student.unihub.edu` | Browse workshops, register, view QR ticket |
| Student | `an.tran@student.unihub.edu` | Alternate student data |
| Organizer | `admin@unihub.edu` | Workshop CRUD, stats, imports |
| Check-in staff | `checkin@unihub.edu` | Mobile QR check-in |

## Mobile Check-In App

For the Flutter staff app:

```bash
cd apps/mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Use `10.0.2.2` for an Android emulator talking to the host machine. Use your computer's LAN IP for a physical phone, for example `http://192.168.1.10:3000`.

## Verification Commands

```bash
cd services/api
npm test
```

```bash
cd apps/web
npm run lint
npm run build
npm test
```

Optional real-service API tests need live Supabase and Redis:

```bash
cd services/api
RUN_INTEGRATION_TESTS=true DATABASE_URL="..." REDIS_URL="..." npm test
```

Optional live Gmail verification sends a real email:

```bash
cd services/api
RUN_GMAIL_TESTS=true MAIL_USER="..." MAIL_PASS="..." MAIL_TEST_TO="..." npm test
```

## Quick Demo Flow

1. Open the Vite URL and browse workshops.
2. Log in as `mai.nguyen@student.unihub.edu` / `Password123`.
3. Register for a workshop and open the QR ticket.
4. Log out, then log in as `admin@unihub.edu` / `Password123`.
5. Open organizer routes to create/edit workshops, view stats, and inspect import status.
6. Keep the notification worker running while registering to show the queued email delivery path.
7. Optional: run the mobile app as `checkin@unihub.edu` / `Password123` and scan a seeded or web-generated QR code.
