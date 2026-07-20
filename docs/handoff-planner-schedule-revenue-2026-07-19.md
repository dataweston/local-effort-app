# Handoff: staff schedule / event dates / revenue calendar input (2026-07-19)

## Task
Add three capabilities across the two planner surfaces:
1. **Staff schedule** — per-person week grid (who works when).
2. **Event dates** — events visible as dates on calendars.
3. **Revenue calendar input** — day-level revenue entry; **revenue should seek to be accurate** (actuals, owner's words).

## Owner's scope decisions (given 2026-07-19, authoritative)
- **`/weeklydemo` is headquarters**: receives ALL info, purely admin-facing. All input lives here.
- **`/hub` is semi-public**: receives SELECT info for SELECT audiences (role-gated projections only).
- Implication: revenue data must NOT leak to hub. Staff schedule and event dates MAY project to hub (staff audience).

## Architecture facts (verified)
- Both surfaces share ONE data store: `PlannerCard` (prisma/schema.prisma:374). Hub reads the owner's planner via `masterPlannerUid()` (`HUB_MASTER_SUPABASE_UID`), so cards created in weeklydemo appear in hub automatically.
- Card fields: `date` (string YYYY-MM-DD), `zone` (timed/untimed), `objectType` (`shift`|`event`|`prep_task`), `people[]` (free-text names), `startTime/endTime`, `revenue` (Int, **whole dollars**), `cost`, `costPerHour`, `optional/enabled`, `status`, `templateId` (recurring).
- **Gotcha — objectType whitelist**: `backend/api/routes/planner.js:9` `PLANNER_OBJECT_TYPES = Set('shift','event','prep_task')` nulls any other value on save. Adding a new type (e.g. `revenue`) requires adding it there (both `save-all` and `update-recurring` use it).
- **Gotcha — save-all semantics**: `usePlannerState` (src/components/weeklyplanner/usePlannerState.js) loads ALL cards and persists with `action: 'save-all'`, which **deletes any card not present in the client's list** (planner.js:50). Any new card type must round-trip through the client card state or it will be wiped on next save.
- Hub projections: `api-handlers/hub/calendar.js` → `getPlannerObjects` (`api-handlers/hub/_planner.js`) exposes ALL cards to staff, **including `revenue`/`cost` in metadata** (already a leak vs. the new hub policy — strip it). `api-handlers/hub/shifts.js` filters to shift cards only (`isShiftCard`), claim/put-up via `HubShiftClaim`, matches people by displayName string.
- Financials: `src/components/weeklyplanner/financials.js` — pure functions; `dayTotals`/`weekTotals` sum card `revenue` (planned) and cost; `monthTotals` adds overheads + COGS (`plannerOverhead`, `plannerCOGS` tables via /api/planner/overhead|cogs).
- `PEOPLE` is a hardcoded list in `src/components/weeklyplanner/defaultSchedule.js` used by EditPanel — not hub profiles.
- Hub money elsewhere is **cents** (`formatMoneyCents`); planner is whole dollars. Don't mix.
- HubPage.jsx is a 4,961-line single file; new hub views belong in `src/components/hub/` (pattern: `EconomicsModelView`).

## Recommended implementation plan
1. **Revenue actuals** (no DB migration): store as `PlannerCard` with `objectType: 'revenue'`, zone `untimed`, `revenue` = amount, one per date (+ optional note in title).
   - Add `'revenue'` to the whitelist in planner.js.
   - In `usePlannerState`: split `cards` into plan cards (all views) and `revenueEntries`; expose `actualsByDate` + an upsert handler. Keep revenue cards IN the saved card list (save-all).
   - In `financials.js`: return planned vs actual separately; day "effective revenue" = actual when an entry exists for that date, else planned. Net uses effective. Never blend silently — display both (le-economist: observed vs modeled stay separate).
   - Input UI: MonthCalendarGrid day cells (admin inline $ input) and/or DailyView; show actual vs planned in top bar + MonthlyView summary.
   - **Hub filtering**: exclude `objectType 'revenue'` from hub calendar/today projections AND strip `revenue`/`cost` from `cardToObject` metadata (check all consumers of `getPlannerObjects`/`cardToObject`: calendar.js, today.js, object-plan.js, checkins.js — grep first).
2. **Staff schedule**: new weeklydemo component (rows = people from cards ∪ PEOPLE, cols = weekDates, cells = shift/event cards). Optionally a read-only "by person" quick view in hub CalendarView built from existing calendar items' `metadata.people`.
3. **Event dates**: `objectType 'event'` already flows everywhere; add event markers/badges to MonthCalendarGrid and make sure hub calendar renders them distinctly. Single-date only today; multi-day = new fields (defer unless asked).

## State when handed off
- Nothing implemented yet; investigation complete. No files changed by this task.
- Working tree already has UNRELATED uncommitted changes on branch `min` (le-economist skill + economics model files) — do not commit or revert them.
- Files read/verified: WeeklyDemoPage.jsx, HubPage.jsx (structure + main component), usePlannerState.js (full), financials.js, EditPanel.jsx, MonthlyView.jsx, MonthCalendarGrid.jsx, backend/api/routes/planner.js (full), api-handlers/hub/{shifts,calendar,_planner}.js, PlannerCard prisma model.
- Not yet read: DailyView/WeeklyView/DayLane/DayTotalsBar/AgendaView, hub today.js/object-plan.js, defaultSchedule.js PEOPLE list.
