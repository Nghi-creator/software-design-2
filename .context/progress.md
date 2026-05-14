# Progress: UniHub Workshop

## Completed
- **Project Concept**: UniHub Workshop requirements finalized.
- **System Design**: Technical Blueprint (design.md) established.
- **Context Setup**: Reorganized project context documents.
- **Context Skill**: Repo-local Codex skill `.codex/skills/use-context` added for consistent `.context` usage.
- **API Alignment Pass**: Backend schema and core routes aligned with payment/check-in specs: Room, Payment, Checkin, idempotency states, RBAC headers, short payment transactions, and item-level offline sync.
- **Controller Layer**: API routes now delegate to controllers; workshop/room/check-in controllers call services instead of embedding request logic in route files.

## In Progress
- API contract still partial; repository layer, request validation, production auth, admin stats, QR retrieval, async upload/summary status, and CSV import status endpoints remain undefined.

## Next Steps
- Add production auth/JWT contract and middleware.
- Add tests for registration/payment idempotency and offline check-in sync.
- Add remaining API endpoints from `api_spec.md` Still Undefined section.
