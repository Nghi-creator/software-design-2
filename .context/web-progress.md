# Web Progress: UniHub Workshop

Purpose: track React web work separately from Flutter mobile work. Move finished items into **Done** as they are completed.

## Scope Notes
- React web app path: `apps/web/`.
- `apps/mobile/web/` is the Flutter mobile app web runner shell; avoid changing it for React frontend work unless the mobile owner asks.
- Requirements source of truth: `REQUIREMENTS.md` when present, otherwise `.context/full-requirements.md`.
- The web app must cover both student-facing workshop flows and organizer/admin flows. Mobile-specific QR scanning/offline check-in can remain in Flutter, but the web app should still expose relevant status/admin views where required.

## Done
- **React Skeleton**: Vite React TypeScript project exists in `apps/web/`.
- **Web Tracker**: Dedicated web progress checklist created.
- **Application Shell**: Replaced the starter/showcase screen with a UniHub app shell and top navigation.
- **Routing Foundation**: Added hash-based routes for public/student pages, auth, and organizer/admin pages.
- **Shared UI States**: Added page header, loading, empty, error/protected-state, and protected-route wrapper patterns.
- **API Client Foundation**: Added shared API request helper with base URL config, bearer-token support, idempotency-key support, JSON parsing, and typed errors.
- **Frontend Domain Types**: Added shared TypeScript types for roles, users, rooms, workshops, registrations, payments, QR tickets, AI summaries, admin stats, and CSV imports.
- **Web Environment Docs**: Documented `VITE_API_BASE_URL`, local dev commands, and lint/build verification in `apps/web/README.md`; added `apps/web/.env.example`.
- **Foundation Verification**: `npm run lint` and `npm run build` pass in `apps/web`.
- **Authentication Flow**: Login form now posts to `/api/auth/login`, stores JWT sessions, validates saved sessions with `/api/auth/me`, and clears invalid sessions.
- **Web RBAC Gates**: Student registration pages/actions require `STUDENT`; organizer admin pages require `ORGANIZER`; check-in staff accounts are kept out of web-only student/admin surfaces.
- **Auth State UX**: Added login-required, access-denied, saved-session verification, logout, and backend-unreachable login error states.
- **Auth Verification**: `npm run lint` and `npm run build` pass after auth/access-control implementation.
- **Auth Browser Smoke**: Verified logged-out admin gate, student registration login prompt, and seed-account login UI in the local web app.
- **Shared Theme Tokens**: Added `design/tokens.json`, `design/README.md`, and `.context/theme.md` for a dark purple web/mobile theme contract.
- **Tailwind Web Refactor**: Added Tailwind v4 to `apps/web`, mapped shared tokens in `tailwind.config.mjs`, removed `App.css`, and refactored the React UI to token-backed Tailwind utilities.
- **Theme Verification**: `npm run lint` and `npm run build` pass; browser smoke verified Tailwind token colors render on the local app.
- **Web Source Restructure**: Split the React app into `components/`, `pages/`, `layouts/`, `data/`, and focused `lib/` modules; `App.tsx` now acts as the route switch and app composition layer.
- **Restructure Verification**: `npm run lint`, `npm run build`, and browser smoke for home/workshops/detail/login/admin gate pass after the split.
- **Page Surface Split**: `apps/web/src/pages/` now separates organizer pages under `admin/` and public/student pages under `user/`; shared `components/`, `layouts/`, `lib/`, `data/`, and `types` remain unsplit until surface-specific code appears.
- **Student Workshop Browsing**: Schedule page now loads public workshops from `GET /api/workshops` with seed fallback, filters by search/day/availability, sorts by time/title/speaker/fee/seats, displays room/map/time/fee/live seats, and links to detail pages with AI summary states.
- **Browsing Verification**: `npm run lint`, `npm run build`, and a Vite dev-server HTTP smoke pass after the student browsing implementation.
- **Web Shell UI Pass**: Navbar is a full-width sticky top bar with its own raised background, explicit Home link, left-aligned primary navigation, non-clickable logo, and avatar-style authenticated account control.
- **Workshop Detail UX Pass**: Detail headers include a back-to-schedule control and show a centered fetching state while live workshop data is still loading instead of a premature not-found message.
- **Registration And Payment Flow**: Student registration buttons now handle free and paid workshops, collect payment tokens for paid workshops, send `Idempotency-Key`, disable duplicate submissions, surface full/rate-limit/payment-unavailable/API-offline failures, store local registration outcomes, retrieve confirmed QR tickets, and render "My registrations" with pending/confirmed/cancelled/payment-failed states.
- **Registration Verification**: `npm run lint`, `npm run build`, and a Vite dev-server HTTP smoke pass after registration/payment UI implementation.

## In Progress
- No active web implementation task yet.

## Backlog

### Notifications
- [ ] Display in-app confirmation notification after successful registration.
- [ ] Show notification history or recent confirmation state if backend data supports it.
- [ ] Keep notification UI channel-agnostic so future channels such as Telegram can be represented without redesigning the flow.

### Organizer Admin
- [ ] Build organizer dashboard landing page.
- [ ] List workshops with registration counts, capacity, schedule, room, and status.
- [ ] Create workshop form.
- [ ] Edit workshop form for title, speaker, room, capacity, time, fee, and PDF metadata where supported.
- [ ] Cancel/delete workshop flow with confirmation and backend error handling.
- [ ] Prevent or explain failed capacity reductions when reserved seats make the edit invalid.
- [ ] Show workshop stats: capacity, seats remaining, registrations by status, checked-in count, and successful payment count.
- [ ] Add room selection/display including room layout reference.
- [ ] Add admin-only PDF upload or PDF metadata management if backend endpoint exists.
- [ ] Show AI summary processing status for organizer users.

### CSV Import Admin Visibility
- [ ] Add organizer view for latest student CSV import job status if backend endpoint exists.
- [ ] Show import errors with pagination if backend endpoint exists.
- [ ] Make CSV import failures visible without blocking normal workshop administration.

### Resilience And UX Requirements
- [ ] Add user-facing handling for 401, 403, 404, 429, and 500 API responses.
- [ ] Show rate-limit feedback and retry guidance for traffic-spike protection.
- [ ] Ensure core schedule browsing still works when registration/payment calls fail.
- [ ] Add loading skeletons or stable loading states for list/detail/admin pages.
- [ ] Add empty states for no workshops, no registrations, no import errors, and no stats.
- [ ] Make forms resilient to validation errors returned by the API.
- [ ] Ensure all interactive controls are keyboard accessible.
- [ ] Verify responsive layouts for desktop, tablet, and mobile web widths.

### Testing And Delivery
- [ ] Manually verify student browse/detail/register flow against seed data.
- [ ] Manually verify organizer CRUD/stats flow against seed data.
- [ ] Manually verify auth redirects and role-based page protection.
- [ ] Update this progress file after each completed web milestone.

## Requirement Coverage Checklist
- [x] Workshop browsing and real-time remaining seats.
- [x] Free and paid registration.
- [x] QR ticket display after successful registration.
- [x] No duplicate client-side registration/payment submission.
- [x] Payment instability graceful degradation.
- [ ] In-app registration confirmation notification.
- [ ] Organizer workshop create, update, cancel/delete.
- [ ] Organizer statistics.
- [x] Strict web page access control.
- [x] AI PDF summary display/status.
- [ ] CSV import status/error visibility where backend endpoints exist.
- [ ] README/setup instructions for running the web app.
- [x] Seed-data-friendly demo flow.
