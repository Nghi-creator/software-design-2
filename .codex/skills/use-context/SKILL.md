---
name: use-context
description: Use the repo-local `.context` memory pack for UniHub work. Trigger when starting a task in this repository, resuming after context loss, planning implementation, editing architecture/API/schema docs, or when the user asks to use, update, audit, shrink, or rely on `.context`.
---

# Use Context

## Goal

Use `.context` as a compact project memory layer. Load enough durable project knowledge to work accurately, but avoid reading the entire folder unless the task truly needs it.

## Start Workflow

1. Read `.context/context_guide.md`.
2. Read the guide's base files for a new conversation:
   - `.context/project_brief.md`
   - `.context/progress.md`
   - `.context/coding_rules.md`
3. Read only the task-specific files named by the guide.
4. If a needed contract is marked incomplete, say so and define/update the contract before implementing against it.
5. After meaningful work, update the smallest relevant context file so future agents see reality, not stale plans.

## Loading Rules

- Prefer targeted reads over bulk reads.
- Treat `.context/original_requirements.md` as fallback detail, not first-load context.
- Treat `.context/api_spec.md` as authoritative for endpoint contracts. Do not infer final API shapes from examples in `design.md` or `specs/`.
- Treat `.context/data_models.md` as authoritative for entities, relationships, indexes, and constraints.
- Treat `.context/design.md` as architecture guidance, not schema or endpoint detail.
- Treat `.context/decisions.md` as the place to resolve repeated architecture debates.
- Read `.context/specs/*.md` only for the feature flow being touched.

## Update Rules

- Update `.context/progress.md` after completed milestones, blockers, or next-task changes.
- Update `.context/api_spec.md` before wiring frontend/mobile code to backend APIs.
- Update `.context/data_models.md` when schema, field, index, or relationship decisions change.
- Update `.context/design.md` only for architecture-level changes.
- Update `.context/decisions.md` for non-obvious decisions with lasting tradeoffs.
- Add a new `.context/specs/*.md` only when a flow is complex enough that adding it elsewhere would bloat the core docs.

## Context Hygiene

- Keep context files concise and deduplicated.
- Move details to the file with the right ownership instead of repeating them.
- Remove stale statements when implementation reality changes.
- Do not paste generated code, logs, or long command output into `.context`.
- Prefer short bullets, tables, and cross-references over narrative explanations.

## Before Finishing

Check whether the task changed any durable fact that future agents need. If yes, update the relevant `.context` file and mention it in the final response.
