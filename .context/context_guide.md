# Context Guide

This folder is the lightweight memory pack for future agents. Keep files short, factual, and current. Prefer links between files over repeating the same details.

## Read Order

For a new conversation, read:

1. `project_brief.md` for scope, stack, and core features.
2. `progress.md` for current state and next task.
3. `coding_rules.md` before changing code.

Then read only what the task needs:

| Task type | Read these files |
| --- | --- |
| Architecture/backend design | `design.md`, `decisions.md` |
| Database/schema work | `data_models.md`, `design.md` |
| API/frontend/mobile integration | `api_spec.md`, related file in `specs/` |
| Payment flow | `specs/payment.md`, `api_spec.md`, `decisions.md` |
| Offline check-in | `specs/checkin.md`, `api_spec.md`, `data_models.md` |
| Planning/prioritization | `roadmap.md`, `progress.md` |

## File Roles

- `project_brief.md`: concise product summary, stack, and must-have features.
- `original_requirements.md`: full assignment requirements; read when details are missing elsewhere.
- `design.md`: system architecture, component responsibilities, communication flows, and reliability patterns.
- `data_models.md`: entity and relationship source of truth.
- `api_spec.md`: frontend/backend contract. If empty or marked incomplete, do not invent endpoints silently.
- `coding_rules.md`: implementation standards and agent behavior rules.
- `roadmap.md`: planned build order.
- `progress.md`: completed work, current work, blockers, next steps.
- `decisions.md`: accepted technical decisions and important tradeoffs.
- `specs/`: focused flow specs for complex features.

## Maintenance Rules

- Update `progress.md` after each meaningful milestone.
- Update `api_spec.md` before wiring frontend/mobile to backend endpoints.
- Update `data_models.md` when schema, fields, indexes, or relationships change.
- Update `design.md` only for architecture-level changes.
- Add to `decisions.md` only for non-obvious decisions that future agents might re-debate.
- Add a new file under `specs/` only when a feature flow is complex enough that it would bloat another document.

## Context Budget

- Keep `project_brief.md`, `progress.md`, and `roadmap.md` under about 1 page each.
- Avoid copying full requirements into other files.
- Put implementation details in code, not context docs, unless agents need the rule before coding.
- Remove stale plans once implementation reality differs from them.
