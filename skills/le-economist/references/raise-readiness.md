# Raise-evaluation readiness plan

Audience: any agent working on economist or raise tasks in this repo, including the forthcoming `skills/le-raise/`. Origin: 2026-07-19 session — the raise evaluation ran on committed evidence only; every line's contribution was formally blocked (all `scenarioInputs` null) and cash actuals were unreachable. `AGENTS.md` rules (routing, comms hard rules, docs/archive distrust) all apply; this plan adds to them, never overrides them.

## The access model

Chat Claude can clone this public repo but cannot hold tokens or reach the deployed API/DB. Three sanctioned paths, in preference order:

1. **Committed sanitized artifacts** — versioned model-run snapshots under `references/runs/`. Zero-secret. **Blocked on the snapshot-privacy decision** (see the open 2026-07-19 row in `decisions-log.md`); until it is resolved, `references/runs/` is gitignored and must not be force-added.
2. **MCP connector** — read-only `economist.*` tools on the existing MCP server (`backend/mcp/economistTools.js`), bearer-gated with scope `economist:read`. Caveat: the current `/.well-known/mcp` HTTP bridge speaks a custom `tool.call`/`resource.get` dialect, not the standard MCP protocol (`initialize`/`tools/list`/`tools/call`), so a claude.ai connector cannot consume it yet. Upgrading the bridge to the SDK's streamable-HTTP transport is the named follow-up; the tools themselves are transport-agnostic and carry over.
3. **Owner-uploaded exports** — fallback; already works.

## Monthly snapshot workflow

```sh
node skills/le-economist/scripts/snapshot-month.cjs            # previous calendar month
node skills/le-economist/scripts/snapshot-month.cjs --month 2026-06
```

Owner-run, not a cron: a Vercel serverless function cannot commit files to git, and the privacy gate requires a human decision before anything is committed. The script consults Local Budget's complete-month flag via the integration API when `LOCAL_BUDGET_API_URL`/`LOCAL_BUDGET_API_TOKEN` are set and refuses to snapshot an incomplete month without `--allow-incomplete`. Requires `LOCAL_BUDGET_DATABASE_URL` (cash actuals) and the brain `DATABASE_URL` (Square attribution).

Every run now emits:

- `methodVersion` — the script's git SHA (with `-dirty` marker) plus SHA-256 of the `line-model-config.json` actually used. Cite `asOf` (period + `generatedAt`) and `methodVersion` for any figure taken from a run.
- `blockedFields` — every contribution field left blank, with the missing input responsible. Blanks are legible, never silent.
- `scenarioInputs[].provenance` — provenance tags for filled inputs (see below).

## Measurement plan for `scenarioInputs`

Every null in `line-model-config.json` is a measurement task, not an estimation task. **Never fill an input from an assumption.** If the owner supplies a policy number instead of a measurement, record it in the line's `scenarioInputProvenance` map as `owner_stated_policy`; measured values get `measured_<source>` tags; the existing `$35/hr` paid-labor rate is tagged `owner_confirmed_payroll_rate`.

Sequence by leverage:

1. **wholesale_bread first.** Measured prices, volumes, and a Square customer ID already exist (`observed-line-evidence.json`). Needs: Accell delivery cost match (by merchantName until vendorId is live) and a flour allocation from the Baker's Field lot via a recipe/production join. This produces the first real contribution number.
2. **Kitchen hours.** Log actual booked hours for one full month; derive `kitchenHoursPerOrder` per line from the booking calendar.
3. **Founder hours.** One month of coarse per-line time logging (owner task). Building a capture surface (e.g. a hub form) is a follow-up feature — internal-route rules in `AGENTS.md` apply when it is built.
4. **weekly_meal_subscription.** Order-level fulfillment join for the pilot (which meals, delivery component) → revenue and cost per order.
5. **private_dinners_events.** Resolve the Haus of Well receivable (observed $750 vs ~$2,000 final quote) before its economics enter any model; encode Thumbtack spend as CAC per the `vendorEvidenceRules` note, never as food contribution.

## MCP economist tools

Registered in `backend/mcp/economistTools.js`, dispatched through the bridge in `backend/api/index.js`. All three are strictly read-only — no mutation of financial data via MCP, ever. All require a configured bearer token carrying `economist:read` (bearer-only; the self-asserted `x-ucp-*` header path is rejected, same as `brain.*`).

- `economist.cashflow_actuals` `{ from, to }` — proxies Local Budget `GET /api/integration/v1/cashflow-actuals` (contract v1; adopt v2 when shipped).
- `economist.latest_run` — latest committed `references/runs/YYYY-MM.json`; returns a structured explanation while the privacy gate keeps runs uncommitted.
- `economist.current_facts` — serves `current-facts.md` verbatim, with its recheck-by date surfaced.

## le-raise landing checklist

Before committing `skills/le-raise/`:

- decisions log entries exist for standing term decisions (raise-terms-are-proposals is already logged 2026-07-18);
- the snapshot-privacy decision row is resolved or the skill works without committed runs;
- `methodVersion` is cited for every model-derived figure;
- one line binds investor outreach to `AGENTS.md` §Human-facing communications (investor emails are human-facing comms — dry-run to owner first, Brevo only);
- keep "no filing without securities counsel + accountant review" verbatim;
- `current-facts.md` is within its recheck window, or re-verified with the owner.

## Definition of done — acceptance test

A fresh chat Claude session, given only the repo URL, can: (1) read the latest complete-month run with contribution populated or every blank explained in `blockedFields`; (2) cite `methodVersion` and as-of for any figure; (3) read the decisions log for standing term decisions; (4) see `current-facts.md` within its recheck window. Once the MCP bridge speaks standard MCP and the owner connects it, the same session can pull current actuals without any committed data. That session should complete evaluation steps 3–5 (scenarios, runway, exhaustion) without asking the owner for a single number.
