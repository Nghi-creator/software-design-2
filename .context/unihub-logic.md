# UniHub Business Logic

- Duration: 5 days.
- Volume: 8-12 workshops/day, with multiple workshops running in parallel.
- Real-time: Must track "số chỗ còn lại" for every workshop.
- Payment: Must support both free and paid workshops.
- Registration result: Successful registration must produce a QR code for check-in.
- Check-in: Must use Mobile App + QR Code scanning.
- Offline check-in: Mobile app must store scans locally when offline and sync them when the network returns.
- Student source of truth: Student data comes from nightly CSV export only; the legacy system has no API.
- Access control roles: Sinh viên, BTC, Nhân sự check-in.
- Critical scale target: 12,000 students in the first 10 minutes of registration, with 60% in the first 3 minutes.
- Seat consistency rule: Never overbook; no two students may receive the same final seat.
- Payment safety rule: Paid registration must use idempotency to avoid double charge on retries.
- Payment resilience rule: Payment gateway failure must not break workshop browsing or unrelated features.

## Role Permissions

- Sinh viên: browse workshops, view details, register for workshops, receive QR code, check in.
- BTC: create workshops, edit workshop information, change room/time, cancel workshops, upload PDFs, view registration statistics.
- Nhân sự check-in: scan QR codes, record check-ins, sync offline check-in queue.

## Required Business Flows

- Paid workshop registration: register request, seat lock, payment attempt, idempotent response, QR generation.
- Offline check-in: scan QR while offline, store locally, sync batch when online, handle duplicates safely.
- Nightly CSV import: read fixed CSV export, validate rows, deduplicate students, report bad rows, avoid disrupting live system.

## Implementation Guardrails

- Before changing code, check `REQUIREMENTS.md` and this file for scope.
- Before changing code, review `blueprint/diagrams/C4_Context.png` and `blueprint/diagrams/C4_Container.png` to preserve the agreed system context and container boundaries.
- Do not invent new roles, event formats, or workshop calendar assumptions unless requirements are updated.
- Keep docs aligned with actual implementation; mark future work clearly when a mechanism is designed but not implemented.
