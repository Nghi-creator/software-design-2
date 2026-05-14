# UniHub Coding Skill

Use this skill when implementing or reviewing UniHub Workshop features.

## Required Context

Before suggesting or writing code:

1. Read `REQUIREMENTS.md`.
2. Read `.context/unihub-logic.md`.
3. Review the rendered C4 diagrams in `blueprint/diagrams/C4_Context.png` and `blueprint/diagrams/C4_Container.png` so code changes preserve the intended system boundaries.
4. Check relevant files in `.context/` when working on architecture, data models, or project decisions.

## Coding Rules

- Keep the three required roles explicit: Sinh viên, BTC, Nhân sự check-in.
- Keep implementation changes consistent with the C4 Context and Container diagrams unless the diagrams and design docs are updated in the same change.
- Use Repository pattern for database access when adding or expanding service logic.
- All registration and payment-related `POST` endpoints must support `Idempotency-Key`.
- Paid registration must avoid double charge when clients retry.
- Registration must protect seat consistency with a database transaction and row-level locking or an equivalent atomic mechanism.
- Rate limiting must protect registration endpoints from repeated requests and traffic spikes.
- Payment integration must use circuit breaker behavior so payment outage does not break workshop browsing.
- Offline check-in sync must be idempotent and safe to retry.
- CSV import must validate rows, handle duplicates, report invalid data, and avoid disrupting the running app.
- Do not stub required mechanisms from the assignment unless the file clearly marks them as prototype-only and the implementation plan covers the real mechanism.

## Documentation Rules

- Update `blueprint/design.md` when architecture or implemented mechanisms change.
- Update `.context/decisions.md` for significant architectural decisions.
- Update `.context/progress.md` after major functional milestones.
- Keep documentation honest: describe what exists in code separately from what is planned.

## Feature Checklist

When adding a UniHub feature, verify whether it affects:

- Workshop browsing and real-time remaining seats.
- Free vs paid registration.
- QR generation and validation.
- Notifications through app/email and future notification channels.
- Admin-only workshop management.
- Mobile check-in and offline sync.
- AI summary from uploaded PDF.
- Nightly CSV student synchronization.
- RBAC at API, admin page, and mobile screen boundaries.
