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

## In Progress
- No active web implementation task yet.

## Backlog

### Foundation
- [ ] Replace the Vite starter screen with the UniHub Workshop application shell.
- [ ] Define routing structure for public/student pages, auth pages, and organizer/admin pages.
- [ ] Add shared layout components: top navigation, page frame, loading state, empty state, error state, and protected-route wrapper.
- [ ] Add shared API client with base URL configuration, JSON parsing, bearer-token support, and consistent error handling.
- [ ] Define frontend domain types for users, roles, rooms, workshops, registrations, payments, QR tickets, AI summaries, and admin stats.
- [ ] Add environment documentation for web API URL and local run commands.

### Authentication And Access Control
- [ ] Build login flow using backend auth endpoints.
- [ ] Persist and restore authenticated session safely.
- [ ] Add logout behavior.
- [ ] Gate organizer/admin pages to organizer users only.
- [ ] Gate student-only actions to authenticated students.
- [ ] Show clear unauthorized and unauthenticated states.
- [ ] Ensure role checks match requirements: students browse/register, organizers manage workshops/stats, check-in staff use mobile check-in only.

### Student Workshop Browsing
- [ ] Show list of all workshops during the event week.
- [ ] Add search/filter/sort controls for schedule browsing.
- [ ] Display speaker, room, room layout/map reference, time, fee/free status, and real-time seats remaining.
- [ ] Add workshop detail page.
- [ ] Display AI-generated summary on the workshop detail page when available.
- [ ] Handle unavailable summary states: not uploaded, processing, failed, and ready.
- [ ] Keep browsing usable when payment features are degraded or unavailable.

### Registration And Payment
- [ ] Add free-workshop registration flow.
- [ ] Add paid-workshop registration flow.
- [ ] Generate and send an `Idempotency-Key` for registration/payment POST requests.
- [ ] Prevent accidental duplicate submissions from repeated clicks/retries.
- [ ] Surface seat contention outcomes clearly when a workshop fills up.
- [ ] Show payment timeout/failure states without breaking normal browsing.
- [ ] Add graceful degradation messaging when the payment gateway circuit is open.
- [ ] Display successful registration confirmation.
- [ ] Retrieve and display the QR ticket for confirmed registrations.
- [ ] Add "My registrations" view with statuses for pending, confirmed, cancelled, paid, and failed payment cases.

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
- [ ] Add frontend lint/build verification to README or root run instructions.
- [ ] Run `npm run lint` in `apps/web`.
- [ ] Run `npm run build` in `apps/web`.
- [ ] Manually verify student browse/detail/register flow against seed data.
- [ ] Manually verify organizer CRUD/stats flow against seed data.
- [ ] Manually verify auth redirects and role-based page protection.
- [ ] Update this progress file after each completed web milestone.

## Requirement Coverage Checklist
- [ ] Workshop browsing and real-time remaining seats.
- [ ] Free and paid registration.
- [ ] QR ticket display after successful registration.
- [ ] No duplicate client-side registration/payment submission.
- [ ] Payment instability graceful degradation.
- [ ] In-app registration confirmation notification.
- [ ] Organizer workshop create, update, cancel/delete.
- [ ] Organizer statistics.
- [ ] Strict web page access control.
- [ ] AI PDF summary display/status.
- [ ] CSV import status/error visibility where backend endpoints exist.
- [ ] README/setup instructions for running the web app.
- [ ] Seed-data-friendly demo flow.
