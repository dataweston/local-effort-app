# Decisions and calibration log

Append-only. Record recommendations, owner decisions, execution, and outcomes as separate events. Never edit an old forecast to resemble the result.

Use this format:

`DATE | STATUS | decision | recommendation or action | decisive assumption | kill/pause/review condition | outcome | reasoning verdict and prior update`

## Calibration events

- 2026-07-18 | CALIBRATION | Economist evidence audit | Retire unsupported standing priors and rebuild decisions from current sources | high-confidence narrative memory was being treated as verified fact | review any recommendation whose controlling input lacks a reproducible source | The audit corrected at least five consequential priors: unsupported $120K revenue, unsupported 20% EBITDA, obsolete flat kitchen rent, incorrect August-peak seasonality, and an unsupported DSCR-based HOLD; it also retired the PropCo/OpCo financing plan from current strategy | Evidence confidence and analytical confidence must be scored separately. A plausible or later-nearby number is not a supported input. Owner statements control policy and definitions but empirical recollections retain an evidence label.

## Owner policies and decisions

- 2026-07-18 | OWNER POLICY | Founder compensation basis | Accrue Weston at $90K/year and Catherine at $70K/year from 2026-04-01; qualifying PERSONAL transactions offset the accrual subject to review | salary basis represents a growth-calibrated target rather than measured market compensation | review monthly and obtain accountant treatment before booking or disclosure | Open | Preserve as-paid and fully loaded columns without double counting founder labor.
- 2026-07-18 | OWNER POLICY / STRUCTURE NOT EXECUTED | Deferred-comp settlement | Settle qualifying back pay for cash in exchange for founder shares moved to treasury | a supportable pricing peg and permissible Minnesota 308B instrument can be established | do not execute or present as final until pricing, share class, milestone subordination, and disclosure order receive accountant and counsel review | Open | Analyze as an owner-designed financing structure, not as completed capitalization.
- 2026-07-18 | OWNER DECISION | Capital raise readiness | Treat the Wefunder/SMBX process as operationally ready, while rebuilding the financial model and final terms from evidence | readiness is a decision/status fact; raise size and coverage are empirical/model outputs | pause any point estimate that depends on unavailable executable terms or fabricated line economics; use a labeled conditional range when sensitivities are decision-relevant | Open | Do not reinstate the prior DSCR HOLD without a reproducible current model.
- 2026-07-19 | OWNER DECISION REQUIRED — OPEN | Snapshot privacy for committed model runs | The repo is public; before any `references/runs/YYYY-MM.json` snapshot is committed, the owner must either (a) approve publishing aggregate-only snapshots (integer cents, no customer PII, no raw transactions, no bank descriptors) or (b) designate a private data repo for runs. Until decided, `references/runs/` is gitignored and agents must not force-add snapshots | financial aggregates in a public repo are an irreversible disclosure | any commit containing run data before this decision is recorded here | Open | Snapshot tooling (`scripts/snapshot-month.cjs`) ships ahead of the decision so the owner can run it locally either way.

## Recommendation rows

Add new rows below. Every recommendation must carry a steelman in its underlying analysis even though this compact log records only the decisive assumption and kill condition.
