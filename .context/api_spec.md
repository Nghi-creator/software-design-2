# API Spec

Status: not defined yet.

Do not assume endpoint names, request bodies, response shapes, or auth requirements from examples in other context files. Before implementing frontend/mobile integration, define the relevant contracts here.

## Required Coverage

- Auth and role requirements.
- Workshop and room CRUD.
- Student workshop browsing/search.
- Registration and payment, including `Idempotency-Key`.
- QR code retrieval/validation.
- Online check-in.
- Offline check-in batch sync.
- Admin statistics.
- PDF upload and AI summary status.
- Legacy CSV import status.

## Contract Template

```text
METHOD /path
Auth:
Request:
Response:
Errors:
Notes:
```
