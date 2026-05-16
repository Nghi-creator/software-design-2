# UniHub Workshop Web

React + TypeScript + Vite + Tailwind frontend for the UniHub Workshop student and organizer web surfaces.

## What Lives Here

- Public/student workshop browsing routes.
- Student-protected registration and QR ticket routes.
- Organizer-protected admin routes for workshop operations and import visibility.
- Shared API client, domain types, app shell, navigation, loading, empty, error, and protected-route states.
- Token-backed Tailwind styling using `../../design/tokens.json`.

The Flutter mobile app is separate. Do not use `apps/mobile/web/` for React work; that folder is Flutter's web runner shell.

## Environment

Create an optional local env file:

```bash
cp .env.example .env.local
```

`VITE_API_BASE_URL` defaults to `http://localhost:3000/api` when it is not set.

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

The default assumes the API service is running from `services/api` on port `3000`.
Apply the Supabase migration and seed SQL for a seed-backed demo, then start the API before logging in from the web app.

## Local Development

```bash
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173/`.

## Seed Accounts

Use these seeded users with password `Password123` after the API is running:

- Student: `mai.nguyen@student.unihub.edu`
- Organizer: `admin@unihub.edu`
- Check-in staff: `checkin@unihub.edu`

Student routes support browsing workshop details, registering, and viewing QR tickets. Organizer routes support workshop CRUD, dashboard statistics, summary status, and CSV import visibility. Check-in staff accounts are intentionally blocked from the student and organizer web surfaces.

## Verification

```bash
npm run lint
npm run build
```

For an end-to-end local smoke test, run the API, start Vite, open the printed URL, browse `#/workshops`, log in with the student seed account for registration/QR checks, and log in with the organizer seed account for admin CRUD/stat checks.

## Theme

Shared theme tokens live in `../../design/tokens.json`. Tailwind reads those tokens through `tailwind.config.mjs`, so prefer token-backed utilities such as `bg-background-page`, `bg-surface-card`, `text-text-primary`, `bg-brand-primary`, `border-border-subtle`, and `rounded-theme-md`.
