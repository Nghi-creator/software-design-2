# Coding Rules

## Priority Order

1. Correctness
2. Simplicity
3. Readability
4. Maintainability
5. Performance
6. Cleverness

---

## Coding Standards

### General

- Prefer simple solutions over abstract/flexible designs.
- Keep files focused on one responsibility.
- Delete dead code immediately.
- Avoid premature optimization.
- Avoid unnecessary abstractions.

### Structure

- Use feature-based module organization.
- Keep controllers thin.
- Business logic belongs in services.
- Data access belongs in repositories only.
- DTOs must not leak into domain/business logic.

### Complexity

- Max function length: ~40 lines unless justified.
- Max nesting depth: 3.
- Prefer early returns over nested conditionals.
- Refactor duplicated logic immediately after second occurrence.

### Naming

- Use full descriptive names.
- Avoid generic names like `util`, `helper`, `manager`, `misc`.
- Boolean names should read naturally (`isFull`, `hasConflict`).

### State & Side Effects

- Prefer pure functions where possible.
- Avoid hidden side effects.
- Pass dependencies explicitly through constructor injection.
- No mutable global state.

### Error Handling

- Never swallow exceptions silently.
- Add contextual information when rethrowing errors.
- Return user-safe error messages at API boundaries.
- Use consistent HTTP status codes:
  - `200` Success
  - `400` Bad Request
  - `401` Unauthorized
  - `403` Forbidden
  - `404` Not Found
  - `429` Too Many Requests
  - `500` Internal Server Error

### Validation

- Strict validation at API entry point using middleware/schema validation.
- Never trust client input.
- Validate enums, IDs, pagination params, dates, capacities, and permissions.

### Data Access

- Always use Repository Pattern.
- Services must never directly access ORM/database APIs.
- Transactions required for multi-step critical operations.

### API Rules

- All registration/payment POST endpoints MUST support `Idempotency-Key`.
- APIs must return consistent response shapes.
- Pagination required for large list endpoints.

### Security

- Never expose internal stack traces to clients.
- Use least-privilege access rules.
- Sanitize uploaded filenames and user-generated text.
- Rate limit sensitive endpoints.

### Testing

- Critical business logic must be unit-testable without framework/runtime.
- Mock repositories, not services.
- Add integration tests for registration/check-in/payment flows.

### Refactor Triggers

Refactor immediately when:

- duplicate logic appears twice
- function needs comment to explain flow
- parameter count exceeds 4
- branching becomes difficult to follow
- file handles multiple domains/responsibilities

### Forbidden

- giant service classes
- god objects
- boolean parameter traps
- deep inheritance trees
- copy-paste reuse
- static mutable globals
- business logic inside controllers
- database calls inside UI/mobile layer

---

## Documentation

- Update `decisions.md` whenever significant architectural decisions change.
- Keep `progress.md` updated after major milestones.
- Documentation must reflect current implementation reality, not plans.
- Record important tradeoffs and rejected approaches in `decisions.md`.

---

## Interaction

- When service/domain complexity grows, update `design.md` or add a focused file under `.context/specs/` before implementation.
- Ask for clarification instead of guessing critical business rules.
- Prefer incremental implementation over massive one-shot generation.
- If existing code violates rules, refactor nearby code while working.
