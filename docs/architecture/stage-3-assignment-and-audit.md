# Stage 3: Assignment And Audit

Last updated: 2026-03-29

## What changed

Stage 3 adds the operating discipline required for a real decision system:

- deterministic experiment assignment
- assignment-aware preview responses
- persistent decision audit storage

## New pieces

- experiment config:
  - `backend/decision/experiments.js`
- deterministic assignment:
  - `backend/decision/assignmentService.js`
- audit repository:
  - `backend/decision/auditRepository.js`
- Prisma models:
  - `DecisionAssignment`
  - `DecisionEvent`

## Behavioral effect

`POST /api/decision/preview` now returns an `assignment` object and persists the assignment when Prisma is available.

`POST /api/decision/events` now persists structured decision events when Prisma is available.

The current experiment variants are:

- `control`
- `rules`

`control` intentionally returns a generic orientation response.
`rules` returns the priority-driven recommendation path built in earlier stages.

## Why this matters

This is the first point where the repo can evaluate decision behavior as an operating system instead of a copy generator:

- decisions can be bucketed
- assignment is stable by session
- events can be tied to treatment and outcome

## Next stage

1. add a business-manageable priority source behind the registry abstraction
2. connect a controlled internal preview UI to the decision preview endpoint
3. add persisted outcome events from a real frontend surface
