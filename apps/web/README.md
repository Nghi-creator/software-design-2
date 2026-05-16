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

## Local Development

```bash
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173/`.

## Verification

```bash
npm run lint
npm run build
```

Use the demo role buttons on `#/login` to check protected routes before the full login flow is wired to the backend.

## Theme

Shared theme tokens live in `../../design/tokens.json`. Tailwind reads those tokens through `tailwind.config.mjs`, so prefer token-backed utilities such as `bg-background-page`, `bg-surface-card`, `text-text-primary`, `bg-brand-primary`, `border-border-subtle`, and `rounded-theme-md`.
