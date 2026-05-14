# `project_brief.md`

Ultra-short project summary. Fast context reload for new convo/agent.

Contains:

```text
goal
core features
stack
architecture style
major constraints
```

Example:

```text
UniHub Workshop system.

Stack:
React
NestJS
PostgreSQL
Redis

Features:
registration
payment
offline QR check-in
CSV sync
AI summaries
```

---

# `original_requirements.md`

Full and original requirements. Used for when project brief needs more context.

---

# `design.md`

Whole-system architecture + technical decisions.

Main “how system works” document.

Contains:

```text
architecture style
system components
communication flow
C4 diagrams
high-level architecture
load protection
circuit breaker
offline sync strategy
```

This replaces:

```text
architecture.md
system_design.md
```

---

# `data_models.md`

Database schema reference.

Single source of truth for entities.

Contains:

```text
tables
fields
relationships
indexes
constraints
```

Example:

```text
Workshop
User
Registration
Payment
Checkin
```

Include:

```text
ERD
SQL/NoSQL justification
```

---

# `api_spec.md`

Frontend/backend contract.

Prevents hallucinated APIs.

Contains:

```text
endpoints
request body
response body
errors
auth requirements
```

Example:

```text
POST /workshops/:id/register
```

---

# `coding_rules.md`

AI + team coding standards.

Very important for agentic dev.

Contains:

```text
folder structure
naming conventions
architecture rules
state management rules
service boundaries
```

Example:

```text
controllers thin
business logic in services
repositories own DB access
```

---

# `roadmap.md`

Build order.

Prevents random feature hopping.

Contains:

```text
phases
milestones
priorities
dependencies
```

Example:

```text
Phase 1
auth
database
basic CRUD

Phase 2
registration concurrency
```

---

# `progress.md`

Current implementation state.

Most frequently updated file.

Contains:

```text
completed
in progress
blocked
next tasks
known bugs
```

Example:

```text
completed:
JWT auth
workshop CRUD

in progress:
seat reservation locking
```

---

# `decisions.md`

Architecture decision log.

Prevents re-debating old choices.

Contains:

```text
decision
date
reason
tradeoffs
```

Example:

```text
Use Redis for seat locking.
Reason:
fast atomic operations.
```

---

# File usage

| File               | Create when                         | Update when                                | Read when                           |
| ------------------ | ----------------------------------- | ------------------------------------------ | ----------------------------------- |
| `project_brief.md` | first                               | major scope/stack changes                  | every new convo                     |
| `design.md`        | first                               | architecture/diagram/tech decision changes | before architecture/backend work    |
| `data_models.md`   | before DB schema                    | schema changes/migration                   | before DB/API work                  |
| `api_spec.md`      | before frontend/backend integration | endpoint changes                           | before frontend/backend/mobile work |
| `coding_rules.md`  | after choosing stack                | pattern/lint/folder rules change           | before coding in new convo          |
| `roadmap.md`       | first                               | phase/order changes                        | when choosing next task             |
| `progress.md`      | first                               | after finished task/milestone              | every new convo                     |
| `decisions.md`     | first                               | every non-obvious decision                 | when agent questions old choices    |
