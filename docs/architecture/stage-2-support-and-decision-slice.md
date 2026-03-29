# Stage 2: Support And Decision Slice

Last updated: 2026-03-29

## What changed

Stage 2 extends the foundation from Stage 1 in two directions:

- support-facing knowledge endpoints are now grouped behind a dedicated router
- the repo now has a thin decision preview surface built on explicit contracts and a governed business-priority registry

## Support Router

New route:

- [backend/api/routes/support.js](C:/Users/user/local-effort-app/backend/api/routes/support.js)

New service:

- [backend/api/services/supportIngest.js](C:/Users/user/local-effort-app/backend/api/services/supportIngest.js)

This moves support search and support KB ingest/webhook logic into a route/service boundary instead of ad hoc registration from the monolith.

## Decision Preview Surface

New registry:

- [backend/decision/businessPriorities.json](C:/Users/user/local-effort-app/backend/decision/businessPriorities.json)

New decision services:

- [backend/decision/businessPriorityRegistry.js](C:/Users/user/local-effort-app/backend/decision/businessPriorityRegistry.js)
- [backend/decision/previewEngine.js](C:/Users/user/local-effort-app/backend/decision/previewEngine.js)

New route:

- [backend/api/routes/decision.js](C:/Users/user/local-effort-app/backend/api/routes/decision.js)

Endpoints added:

- `GET /api/decision/context`
- `POST /api/decision/preview`
- `POST /api/decision/events`

These are intentionally thin. They do not perform live personalization in the UI yet. They exist to give the repo a stable, testable seam for:

- context normalization
- governed business-priority matching
- recommendation previewing
- structured decision event logging

## Why this stage matters

The future concierge should not be introduced as a widget-side feature with inline business logic. This stage makes the backend capable of:

- consuming normalized visitor context
- reconciling that context against business priorities
- emitting a structured recommendation object

That is the correct shape for future frontend surfaces, experimentation, and eventual LLM-assisted phrasing.

## Next stage

The next architectural move should be one of:

1. expand the business-priority registry into a source the business can manage
2. add treatment assignment and decision audit persistence
3. extract additional domain slices from `backend/api/index.js` that the decision engine will depend on
