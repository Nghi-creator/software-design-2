# Agent Rules: UniHub Workshop

## Coding Standards
- **Data Access**: Always use the **Repository Pattern** to abstract database logic from services.
- **Idempotency**: All `POST` requests involving payments or registrations MUST include an `Idempotency-Key` header.
- **Error Handling**: Use consistent HTTP status codes (200, 400, 401, 403, 404, 429, 500).
- **Validation**: Strict validation of input using middleware at the API entry point.

## Documentation
- Update `decisions.md` whenever a significant architectural change is made.
- Keep `progress.md` updated after finishing major functional milestones.
- Docs should reflect **reality**, not future intentions.

## Interaction
- When a service layer becomes complex, create a dedicated `system_design.md` for it before implementation.
