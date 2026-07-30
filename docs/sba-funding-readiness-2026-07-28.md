# SBA / SBIR / grants readiness — investigation + plan of action

Date: 2026-07-28. Scope: what SBA and the federal funding stack can actually do for
Local Effort, what we can connect to programmatically, what documents a real
application needs, and what is blocking us today.

Status: **investigation only.** Nothing has been submitted, no account has been
created, no message has left this machine.

---

## 1. The headline findings

**1. There is no SBA API you can apply for money through.** SBA's programmatic
surfaces are read-only data:

| Surface | What it is | Auth | Verified |
| --- | --- | --- | --- |
| `data.sba.gov` | Open-data registry (loan datasets, lender lists) | none | listed, not exercised |
| SBA.gov Content API (`developer.sba.gov`) | Searches sba.gov site content | none | portal page failed to render for us |
| CAFS APIs (`catweb.sba.gov/apidocs`) | LoanLIST, Settlement Express | **lender/broker-dealer role only** | out of reach as a borrower |
| `api.grants.gov/v1/api/search2` | Federal grant opportunity search | **none required** | **✅ live, HTTP 200, 610 hits on a test query** |
| `api.www.sbir.gov/public/api/*` | SBIR/STTR awards, firms, solicitations | none | **⚠️ returning `TooManyRequestsError` / "not available at this time"** — the site itself notes the APIs are under maintenance |
| `sam.gov` | UEI + entity registration | account + entity validation | not started |

The borrower-facing paths are all portal or human: a **lender** for 7(a) and
microloans, **Grants.gov** for grant submission, **MySBA/CAFS** for servicing an
existing loan. So "connect to the SBA API" resolves to: connect to Grants.gov
(done, works), connect to SBIR.gov (blocked upstream), and register on SAM.gov
(requires the owner).

**2. SBA does not give grants to operating businesses.** Directly from
[sba.gov/funding-programs/grants](https://www.sba.gov/funding-programs/grants):
*"SBA does not provide grants for starting and expanding a business."* SBA grant
money goes to SBIR/STTR (R&D), to states (STEP export program), and to nonprofit
intermediaries (SBDC, WBC, SCORE). Any "SBA grant" pitch outside those is wrong.

**3. SBIR/STTR does not fit the catering business — it may fit the brain.**
SBIR funds *scientific R&D against a federal agency's stated topic*. Cooking,
catering, and meal prep are not R&D. Two things are worth a second look:

- **USDA NIFA "Food Science and Nutrition" topic** — funds new processes and
  technologies for food safety, processing, and nutrition. Phase I is up to
  ~$175k. This would require a genuine technical research question (e.g. a
  process/shelf-life/safety innovation in the frozen DTC line), not "we want to
  scale production."
- **The company brain itself** — a knowledge graph + inference layer over messy
  small-operator financial and ops data (6,110 assertions, 3,100+ Local Budget
  ledger events, entity resolution, provisional-assertion review). That is a
  defensible software R&D story for a small-operator-decision-support topic. But
  the applicant would need a principal investigator and a real research plan.

Either way SBIR is an **18-month-plus** path with a **3–6 week registration
prerequisite** (SAM.gov UEI → SBA Company Registry → SBC Control ID) before you
can even submit. It is not the money that funds the fall hiring plan.

**4. The near-term money is a microloan, and the blocker is bookkeeping, not
paperwork.** See §3.

---

## 2. What actually fits Local Effort

Ranked by realistic time-to-cash against the ~$50,000 raise target in the
2026-07-23 pro forma.

| Path | Amount | Fit | Reality |
| --- | --- | --- | --- |
| **SBA Microloan** | up to **$50,000** | **strongest** — matches the raise target exactly | Via a nonprofit intermediary, not a bank. MN intermediaries on SBA's list include [African Development Center](https://adcminnesota.org) (Minneapolis, 612-333-4772) and [African Economic Development Solutions](https://aeds-mn.org) (St. Paul, 651-646-9411); the full MN list needs pulling. Intermediaries lend on cashflow + character and provide technical assistance — far more forgiving of a ~breakeven P&L than a bank. |
| **MN DEED Emerging Entrepreneur Loan Program (ELP)** | up to **$150,000** | **now the likely lead** | Owner-demographic-gated on minority / low-income / **women** / veteran / disability. Local Effort is **majority women-owned** (§2a) → eligible. 3× the microloan ceiling. Applied for through a certified nonprofit lender; [Elevate Hennepin](https://www.elevatehennepin.org) is the Hennepin County partner. Contact `ELP@state.mn.us`. |
| **MN CERT / TGB certification + federal WOSB** | not a loan — **revenue** | **high value, previously missed** | Majority women-ownership qualifies for Women-Owned Business Enterprise certification via the [MN Small Business Certification Portal](https://sbcp.mn.gov/) — one application covers TGB (state), CERT (St. Paul / Minneapolis / Hennepin / Ramsey), and DBE. Certified vendors get preference in public contracting. For a catering business, that is direct access to city, county, and state event catering. Federal [WOSB](https://www.sba.gov/federal-contracting/contracting-assistance-programs/women-owned-small-business-federal-contract-program) set-asides work the same way at federal level. **This may be worth more than the loan** and does not depend on the P&L. See the control caveat in §2a. |
| **SBA 7(a) Small Loan / Express** | $50k–$350k | possible, harder | Banks underwrite on debt-service coverage. At −$735/mo average operating result before founder pay, DSCR does not clear today without the pro forma carrying the argument plus collateral/guarantees. Better after Q4 if the capacity plan lands. |
| **Grants.gov federal grants** | varies | **weak** | Our live queries returned mostly agency-to-agency, embassy, and research programs. Value-added / local-food programs (VAPG, LFPP) generally require producer, cooperative, or nonprofit applicant status. **Owner question: is "Local Effort Cooperative" a legally formed cooperative, an LLC, or a d/b/a?** That answer opens or closes an entire category. |
| **SBIR/STTR** | $175k Phase I | speculative, long | See §1.3. Worth a decision, not worth blocking on. |
| **SBA grants for the operating business** | — | **does not exist** | Stop looking. |

---

## 2a. Cap table (from the brain) and what it means

Owner-confirmed 2026-07-28: Local Effort is an **actual cooperative**, majority women-owned.
The brain holds a full cap table under snapshot `6b062655-d651-4abe-a014-5e63bf1c702b`:

| Holder | % | Basis | SBA relevance |
| --- | --- | --- | --- |
| **Catherine Olsen** (woman) | **47.5** | initial 50% − 2.5% to Sarah Olsen Trust | **20%+ → Form 1919, Form 413, 3yr returns, personal guarantee** |
| **Weston Smith** | **45.5** | initial 50% − 2.5% Sarah − 2% Renee | **20%+ → Form 1919, Form 413, 3yr returns, personal guarantee** |
| Sarah Olsen Contribution Trust (woman) | 5.0 | granted for contributions over prior 6 months | below 20% — no forms |
| Renee Owens (woman) | 2.0 | purchased from Weston Smith for $6,000 | below 20% — no forms |
| *Maria Beck (offered, not accepted)* | *1.0* | worker equity, 90-day vest | future dilution |
| *Zachary Hurdle (offered, not started)* | *0.5* | worker equity, 90-day vest | future dilution |

Sums to 100.0%. Women-held: **54.5%**.

**⚠️ The graph holds two contradictory versions of the Renee transaction under the same
snapshot ID** — 2% for $6,000 (leaving Weston at 45.5%) *and* 1% for $3,000 (leaving him at
46.5%). Both reconcile to 100% internally, so neither is self-evidently wrong. The owner's
statement ("1 owns 2%") resolves it in favour of the 2%/$6,000 version, but **the stale rows
should be retracted in the brain before any number is copied onto a federal form.**

**⚠️ Majority-women *ownership* is not the same as the majority-women *control* that
certification requires.** WBE/CERT and WOSB both test ownership **and** control — voting
power and day-to-day management, not just economics. Two facts in the graph threaten the
count:

- **Renee's 2% is an explicitly non-governance profit interest** (`Future Non-Governance
  Profit Interest Class`, status `proposed`, `legalLabelStatus: needs counsel review`). A
  certifier may exclude non-voting interests. Without it: women at **52.5%** — still over
  51%, but thin.
- **Sarah's 5% is held by a trust**, not by her personally. Trust-held ownership counts only
  where the woman controls the trust; certifiers scrutinize this. Exclude both and women
  fall to **47.5% — below the 51% threshold, and certification fails.**

**⚠️ The cap table is not fully papered.** Three severity-5 constraints in the brain say so:
*"Incomplete Founder/Cofounder Capitalization Formalities"*, *"Legal and Paperwork Completion
for Renee Equity Issuance"*, and *"Governing Documents and Board/Member Approval Mechanics"*.
Certification requires legally effective documented ownership, and Form 1919 asks for
ownership under signature. **Counsel papering the cap table is now on the critical path for
both the loan and the certification** — it is no longer a someday item.

**Cooperative structure — one wrinkle.** SBA requires personal guarantees from 20%+ owners.
The Main Street Employee Ownership Act of 2018 was meant to relax this for cooperatives, but
implementation has been [criticized as undermining the Act's intent](https://www.nceo.org/employee-ownership-blog/house-committee-urges-sba-fully-implement-main-street-eo-act),
with SBA SOPs still requiring personal or entity guarantees on 7(a) loans to co-ops. Assume
Catherine and Weston both guarantee, and ask the intermediary directly. This does not affect
ELP or the microloan intermediary's own underwriting.

---

## 3. The real blocker: the books do not yet support an application

This is the finding that matters most. Probing the Local Budget database
directly (5,570 transactions, 2024-01-11 → 2026-07-27):

| Gap | Evidence | Why it blocks a loan |
| --- | --- | --- |
| **23% of transactions are unclassified — and it is *not* old data** | 1,271 of 5,570 rows, totaling **$129,111**, concentrated in **Sep 2025 – Feb 2026**. See breakdown below. | No lender accepts a P&L where nearly a quarter of the money is uncategorized — and the gap sits precisely in the trailing-twelve-month window underwriters scrutinize hardest. |
| **No business entity exists in the ledger** | Exactly one `Entity` row: `"Personal"`, type `PERSON`. All six accounts hang off it. | SBA requires *business* financial statements separate from *personal* ones, and a separate Form 413 per 20%+ owner. Today the data cannot produce either cleanly. |
| **Second principal is absent** | No second `PERSON` entity, no accounts attributed to a second owner | Both principals with 20%+ ownership must each file Form 1919, Form 413, and 3 years of personal returns. |
| **No liability accounts at all** | Account types present: `CHECKING`, `SAVINGS`, `OTHER`. **Zero** `CREDIT_CARD`, zero `LOAN`. Total tracked balance: $229.23 | The SBA business debt schedule is a required exhibit and cannot be generated. The June 2026 **Square Capital loan (~$2,200 original, ~¾ repaid, ~$550 outstanding)** does not appear anywhere in the ledger. The amount is immaterial to debt-service coverage — but it still has to be disclosed, and any credit card balances the co-op carries have to be found and entered too. Housekeeping, not a crisis. |
| **Zero receipts stored** | `Receipt` count = 0 | Weakens the COGS story precisely where it was already contested (the "COGS bucket = inventory purchases" correction). |

### Where the unclassified transactions actually are

The intuition that this is old, pre-2025 mess is wrong — 2024 is the *cleanest* year.
Unclassified count by year: **2024 → 139 · 2025 → 859 · 2026 → 273**.

| Month | Txns | Unclassified | % | $ unclassified |
| --- | ---: | ---: | ---: | ---: |
| 2025-09 | 211 | 75 | 36% | $8,694 |
| 2025-10 | 273 | 118 | 43% | $7,788 |
| 2025-11 | 205 | 114 | 56% | $9,022 |
| **2025-12** | 187 | **135** | **72%** | $9,377 |
| **2026-01** | 151 | **121** | **80%** | **$23,694** |
| 2026-02 | 166 | 76 | 46% | $9,121 |
| 2026-03 → 07 | 1,591 | 76 | **3–7%** | $5,623 |

The shape tells the story: classification was worked back through 2024 and has been kept
current since March 2026, but the **six-month window Sep 2025 – Feb 2026 was never done** —
639 transactions, ~$68k. That window is the back half of FY2025 and the start of FY2026,
i.e. the most recent complete tax year and the front of the trailing twelve months. It is
the worst possible place for a hole, and it is also a bounded, finite job: roughly six
months of work, on a system that already has a rules engine and 432 normalized vendors.

What *is* strong and ready:

- **2.5 years of transaction history** (Jan 2024 → Jul 2026) — clears the
  typical 2-year lookback.
- **Generated P&L reports already exist**: `reports/local-budget-pnl/local-budget-profit-loss-2025.pdf`
  and `-2026.pdf`, plus HTML, generated by `scripts/generate-local-budget-pnl.cjs`.
- **A versioned financial API** exists on the Local Budget side —
  `/api/integration/v1/pnl?year=`, `/cashflow-actuals`, `/recurring-revenue`,
  `/transactions`, `/vendors` (see [local-budget-integration.md](local-budget-integration.md)).
  These can generate lender exhibits on demand rather than by hand.
- **432 normalized vendors** — supports a credible A/P and COGS narrative.
- **The 2026-07-23 business plan + pro forma** — base/downside/upside scenarios,
  corrected 27% food cost, breakeven math. This is the narrative exhibit lenders
  ask for and most applicants don't have.
- **The brain graph** — 687 Customers, 6 BusinessLines, 6 CustomerSegments,
  1,816 SPEND_HISTORY and 211 ORDERED assertions. Useful for the customer
  concentration disclosure a lender will ask about (and it will not flatter us:
  prior segmentation found ~92% of paying revenue in 7 anchor accounts).

---

## 4. Document checklist

Marked: ✅ have · ⚠️ partial · ❌ missing · 👤 owner-only

### Business, entity, and identity
- ❌ 👤 Entity formation documents — articles, operating agreement / co-op bylaws
- ❌ 👤 EIN letter (CP-575)
- ❌ 👤 MN Secretary of State certificate of good standing
- ❌ 👤 Business licenses: MN Dept. of Agriculture / Health food licenses, commercial kitchen agreement (MSP Kitchenery Hopkins), certificate of insurance
- ⚠️ Ownership breakdown with exact percentages — **known** (§2a), but the brain holds contradictory rows and the cap table is not legally papered
- ❌ 👤 Counsel-executed capitalization documents — membership/equity agreements for all four holders, plus the governing-document amendment for the proposed non-governance class
- ❌ 👤 SAM.gov registration + UEI *(only needed for grants/SBIR/WOSB, not for a microloan or ELP)*

### Financial statements — business
- ⚠️ P&L 2024, 2025, YTD 2026 — generated reports exist for 2025/2026; **2024 not generated, and FY2025 rests on a 6-month unclassified hole (Sep 2025 – Feb 2026)**
- ❌ Balance sheet — cannot be produced: no liability accounts, no business entity
- ❌ Business debt schedule — must include the Square Capital loan (~$550 outstanding) and any co-op credit cards
- ⚠️ A/R and A/P aging — Square invoices exist; not assembled into aging reports
- ✅ 12–24 month cashflow projection — the 2026-07-23 pro forma covers this
- ❌ 👤 Business tax returns, 2 years
- ❌ 👤 Bank statements, most recent 3–6 months (Chase, SoFi, Square)

### Financial statements — personal (Catherine Olsen 47.5% and Weston Smith 45.5% only)
Sarah Olsen Trust (5%), Renee Owens (2%), Maria Beck (1% offered) and Zachary Hurdle
(0.5% offered) are all under 20% and file nothing.
- ❌ 👤 SBA Form 413 (Personal Financial Statement) ×2 — data model can't split by principal yet
- ❌ 👤 Personal tax returns, 3 years, signed ×2
- ❌ 👤 IRS Form 4506-C (tax transcript authorization) ×2
- ❌ 👤 Credit report authorization ×2

### SBA forms
- ❌ SBA Form 1919 (Borrower Information) ×2 — Catherine and Weston, plus any officer/director
- ❌ SBA Form 413 ×2
- ❌ SBA Form 912 (Statement of Personal History) — if triggered
- ❌ Lender's own application package — varies by intermediary

### Certification (MN CERT/TGB + federal WOSB)
- ⚠️ Proof of majority women ownership **and control** — see the control caveat in §2a
- ❌ 👤 Executed cap-table documents (same blocker as above)
- ❌ 👤 Governing documents showing women hold voting control
- ❌ 👤 Proof of Twin Cities metro location — Ramsey County qualifies
- ❌ 👤 SAM.gov + UEI — federal WOSB only

### Narrative
- ✅ Business plan + pro forma (2026-07-23)
- ⚠️ Use of proceeds — the pro forma implies it (staged hires, packaging/logistics, kitchen); needs a line-item statement
- ⚠️ Management résumés for both principals
- ⚠️ Customer concentration disclosure — brain has the data, needs writing up honestly

---

## 5. Plan of action

### Phase 0 — Resolved 2026-07-28
1. ✅ **Legal entity: actual cooperative.** Opens ELP, co-op programs; brings the
   personal-guarantee wrinkle in §2a.
2. ✅ **Ownership known** — Catherine Olsen 47.5%, Weston Smith 45.5%, Sarah Olsen Trust 5%,
   Renee Owens 2%. Only the first two cross 20% and file forms.
3. ✅ **ELP eligibility: yes**, majority women-owned (54.5%). **ELP at $150k now leads the
   microloan at $50k** — pursue it first.
4. ✅ **Square Capital: ~$2,200 original, ~¾ repaid, ~$550 outstanding.** Immaterial to
   coverage; disclose anyway.
5. ⏳ **SBIR go/no-go** — still open. Only starts the 3–6 week SAM.gov clock if yes.

### Phase 0b — New owner-blocked items (raised by the co-op / women-owned answer)
6. 👤 **Get counsel to paper the cap table.** Three severity-5 constraints say the
   founder/cofounder capitalization formalities, the Renee issuance, and the governing-document
   mechanics for the proposed non-governance class are all incomplete. This now gates both
   the certification and an honestly signed Form 1919. Highest-value legal spend available.
7. 👤 **Confirm who holds voting control**, and whether Sarah's trust and Renee's
   non-governance interest count toward the 51% women-control test. If they don't, women hold
   47.5% and certification fails — worth knowing before paying for an application.
8. 👤 **Decide on the pending 1% (Maria) and 0.5% (Zachary) worker-equity offers** — they
   dilute, and an unresolved offer is awkward to describe on a federal form.

### Phase 1 — Fix the books (2–3 weeks, the actual critical path)
9. **Classify the Sep 2025 – Feb 2026 window first** — 639 transactions, ~$68k, the six
   months that were never worked. Then mop up the ~330 scattered elsewhere. Local Budget
   already has a rules engine (`ClassificationRule`) and 432 normalized vendors, so most of
   this should be rule-driven with owner review of exceptions only.
10. **Create a `BUSINESS` entity and a second `PERSON` entity in Local Budget**, and
    attribute accounts and transactions accordingly. Without this there is no
    business balance sheet and no per-owner Form 413.
11. **Add the liability accounts** — credit cards, the Square Capital loan, any
    personal notes — as `CREDIT_CARD` / `LOAN` accounts so the debt schedule and
    Form 413 can be generated rather than hand-typed.
12. **Generate 2024 P&L** alongside the existing 2025/2026 reports.
13. **Retract the stale Renee equity rows in the brain** (the 1%/$3,000 variant and the
    Weston 46.5% row) so the graph has one truthful cap table.

### Phase 2 — Build the package (1 week, runs after Phase 1)
10. **Write a `scripts/generate-sba-package.cjs`** that pulls from the Local Budget
    integration API and emits, per lender: P&L by year, balance sheet, debt
    schedule, A/R–A/P aging, and a 12-month projection — regenerable when numbers
    change, rather than a one-off spreadsheet.
11. **Pull the customer concentration analysis from the brain** into a written
    disclosure. Lenders will find the concentration anyway; leading with it and
    with the diversification plan is stronger than being asked.
12. **Draft the use-of-proceeds statement** from the pro forma's staged hires and
    packaging/logistics spend.

### Phase 3 — Connect the funding-discovery surfaces (parallel, low cost)
13. **Grants.gov opportunity monitor.** The API is live and needs no key. A small
    poller with Local-Effort-relevant filters, writing hits into `HubDocument` or
    the brain as `Opportunity` entities, gives ongoing coverage instead of
    one-time searching. The ontology already has an `Opportunity` entity type.
14. **SBIR.gov API** — retry periodically; it is down upstream, not on our end.
    Grants.gov mirrors most SBIR NOFOs in the meantime.
15. **SAM.gov** — owner-driven, only if the SBIR/grant path is a go.

### Phase 3b — Certification (parallel, gated only on counsel + Phase 0b)
16. **Apply for MN CERT / TGB / WBE via [sbcp.mn.gov](https://sbcp.mn.gov/)** — one
    application covers state TGB, St. Paul CERT (honoured by Minneapolis, Hennepin, and
    Ramsey), and DBE. Roseville is in Ramsey County, so the geography qualifies. This runs
    on ownership documents, not on the P&L, so it does **not** wait for Phase 1 — it waits
    on counsel papering the cap table.
17. **Federal WOSB** — same ownership-and-control test, needs SAM.gov + UEI. Only worth it
    if federal catering contracts are a real ambition; the state/county route is the
    near-term revenue.

### Phase 4 — Approach lenders (after Phase 1 and 2)
18. **Lead with DEED ELP at $150k** via a certified lender — [Elevate Hennepin](https://www.elevatehennepin.org)
    for Hennepin County, or `ELP@state.mn.us` for a referral. Majority women-ownership
    qualifies the co-op, and the ceiling is 3× the SBA microloan.
19. **Keep the SBA microloan as the fallback**, and pull the complete MN microlender list to
    shortlist by food-business experience. Known starting points: African Development Center,
    African Economic Development Solutions; MCCD, WomenVenture, NDC, and LEDC are also
    active Twin Cities small-business lenders worth checking against the current SBA list.
    Ask any SBA intermediary directly how they handle personal guarantees for a cooperative.
20. **Contact the MN SBDC / SCORE** — free, SBA-funded, and they will pre-review
    the package before a lender sees it.
21. **Then** submit. Forms 1919 and 413 get filled once the underlying data can
    populate them truthfully.

### What to do first
Two things, and they run in parallel because they share no dependencies:

- **Counsel papers the cap table** (Phase 0b, items 6–7). It gates certification, and
  certification is revenue that does not care about the P&L.
- **Classify Sep 2025 – Feb 2026** (Phase 1, item 9). 639 transactions, bounded, and it
  gates every financial exhibit a lender will ask for.

Everything else is downstream of those two.

---

## 6. Sources

- [SBA — Grants](https://www.sba.gov/funding-programs/grants)
- [SBA — Microloans](https://www.sba.gov/funding-programs/loans/microloans) · [list of microlenders](https://www.sba.gov/funding-programs/loans/microloans/list-microlenders)
- [SBA — Minnesota District](https://www.sba.gov/district/minnesota)
- [SBA developer portal](https://developer.sba.gov/) · [SBA.gov Content API](https://developer.sba.gov/markdown_apis/sbagov-content.html) · [SBA open data](https://data.sba.gov/) · [CAFS API docs](https://catweb.sba.gov/apidocs/apidetail.cfm)
- [Grants.gov API resources](https://grants.gov/api) · [search2](https://grants.gov/api/common/search2) · [fetchOpportunity](https://grants.gov/api/common/fetchopportunity)
- [SBIR.gov API](https://www.sbir.gov/api) · [Apply](https://www.sbir.gov/apply) · [Required registrations](https://www.sbir.gov/tutorials/registration-requirements/tutorial-1) · [Topics](https://www.sbir.gov/topics)
- [USDA NIFA SBIR/STTR topic areas](https://www.nifa.usda.gov/grants/programs/sbir-sttr/sbir-topic-areas) · [Food Science and Nutrition topic](https://www.sbir.gov/node/1710787) · [How to apply](https://www.nifa.usda.gov/grants/programs/sbir-sttr/how-do-i-apply-sbirsttr-programs)
- [MN DEED — Emerging Entrepreneur Loan Program](https://mn.gov/deed/elp/) · [SBA financing programs in MN](https://mn.gov/deed/business/financing-business/guidance/sba-financing.jsp) · [Elevate Hennepin](https://www.elevatehennepin.org/en/what-we-offer/resource-directory/emerging-entrepreneur-loan-program)
- [SBA Form 1919](https://www.sba.gov/document/sba-form-1919-borrower-information-form)
- [MN Small Business Certification Portal](https://sbcp.mn.gov/) · [eligibility](https://sbcp.mn.gov/instructions/about-eligibility) · [St. Paul CERT program](https://www.stpaul.gov/departments/human-rights-equal-economic-opportunity/procurement/cert-program) · [Hennepin CERT](https://www.elevatehennepin.org/what-we-offer/resource-directory/central-cert-program) · [Ramsey County CERT](https://www.ramseycountymn.gov/businesses/doing-business-ramsey-county/contracts-vendors/cert-program)
- [SBA WOSB federal contract program](https://www.sba.gov/federal-contracting/contracting-assistance-programs/women-owned-small-business-federal-contract-program)
- [Main Street Employee Ownership Act of 2018](https://www.congress.gov/bill/115th-congress/house-bill/5236/text) · [NCEO on SBA implementation](https://www.nceo.org/employee-ownership-blog/house-committee-urges-sba-fully-implement-main-street-eo-act)
