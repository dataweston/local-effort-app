# Decision Engine Foundation

Last updated: 2026-03-29

## Purpose

This repository is a customer-facing sales and marketing system used across direct customer and B2B-style interactions. The long-term architecture needs to support:

- smooth customer-facing experiences
- governed business decisioning
- machine-readable context for agents and future LLM tooling
- auditable recommendation behavior

This document records the current authority model and the first cleanup stage toward a dedicated decision layer.

## Runtime Authority

Production API authority is:

- [vercel.json](C:/Users/user/local-effort-app/vercel.json#L39) routes `/api/*` to [backend/api/server.js](C:/Users/user/local-effort-app/backend/api/server.js#L1)
- [vercel.json](C:/Users/user/local-effort-app/vercel.json#L84) routes `/.well-known/*` to the same backend

Implication:

- `backend/api/server.js` and the app created by `backend/api/index.js` are the production API runtime
- `api/` and `api-handlers/` still contain useful code, but they are not the clean long-term authority surface

## Stage 1 Goals

- isolate machine-readable public site context into a dedicated route/service module
- introduce explicit contracts for future decision inputs and outputs
- reduce the amount of decision-relevant logic living inline in `backend/api/index.js`

## Stage 1 Changes

- public site context endpoints moved behind a dedicated router:
  - `/api/public/site`
  - `/api/public/pricing-faq`
  - `/api/public/estimator-help`
- route logic now consumes a reusable service instead of hand-built inline file reads
- initial decision contracts exist in `backend/decision/contracts.js`

## Why This Matters

The future adaptive concierge should consume normalized context and structured business priorities, not scrape pages or depend on route-local logic. This stage creates the first explicit seam for that future:

- public knowledge is now a reusable provider surface
- decision payloads have explicit schemas
- behavior is testable independent of the giant backend file

## Next Stages

1. extract more decision-relevant route families from `backend/api/index.js`
2. create a canonical `DecisionContext` builder from request, acquisition, and page signals
3. introduce a business-priority registry
4. add decision event logging and treatment assignment
5. build recommendation orchestration before any open-ended LLM concierge behavior
