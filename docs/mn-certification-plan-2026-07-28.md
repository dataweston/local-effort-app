# MN CERT / TGB / WBE certification — eligibility analysis and plan

Date: 2026-07-28. Supersedes the certification section of
[sba-funding-readiness-2026-07-28.md](sba-funding-readiness-2026-07-28.md); the SBA
loan track is parked at owner's direction.

**Bottom line: Local Effort qualifies on ownership with real margin, and the control story
is strong. The remaining work is documentary and legal, not structural — plus one timing
question about the newest transfer.**

---

## 1. Cap table

Two writes to the brain on 2026-07-28, both supersession-based and idempotent:

1. `scripts/correct-brain-cap-table-2026-07-28.mjs` — ledger event
   `01123545-0519-4fa2-9eef-99c815f7a665`. Renee's 2% came 1% from each founder, not 2%
   from Weston. Zachary Hurdle's 0.5% offer retracted and grant entity tombstoned.
2. `scripts/record-brain-equity-transfer-2026-07-28.mjs` — ledger event
   `66d490ef-d089-4fad-8c97-725691e23c8a`. **Weston transferred 10% to Catherine.**

| Holder | % | Qualifying (woman)? |
| --- | ---: | --- |
| **Catherine Olsen** | **56.5** | ✅ **clears 51% alone** |
| Weston Smith | 36.5 | ❌ |
| Sarah Olsen | 5.0 | ✅ |
| Renee Owens | 2.0 | ✅ |
| **Total** | **100.0** | **Women: 63.5%** |

Maria Beck's 1% offer stands, unaccepted, and would dilute Weston alone — if she accepts,
women rise to **64.5%** and Weston falls to 35.5%. Maria accepting is *good* for
certification.

**The 10% transfer removes the single biggest risk in the earlier analysis.** Catherine now
holds a majority outright, so the ownership test no longer depends on Sarah's 5% or Renee's
2% counting. Every stress scenario passes:

| Scenario | Women-held | Verdict |
| --- | ---: | --- |
| All interests count | 63.5% | ✅ |
| Renee's 2% discounted | 61.5% | ✅ |
| Sarah's 5% discounted | 58.5% | ✅ |
| Both discounted — **Catherine alone** | **56.5%** | ✅ |

Sarah owning her 5% personally (owner-confirmed) closes the trust question in
Minn. R. 1230.1604 as well. Ownership is settled.

---

## 2. What the rules actually require

These are administrative rules, not guidelines. Both tests must pass.

**Ownership — [Minn. R. 1230.1604](https://www.revisor.mn.gov/rules/1230.1604/):**
- *"at least 51 percent owned by socially and economically disadvantaged individuals"*
- For LLCs: *"at least 51 percent of **each class** of member interest"* (corporations:
  51% of each class of voting stock **and** 51% of aggregate stock)
- Ownership must be *"real, substantial, and continuing, going beyond pro forma ownership"*
- Trust-held interests count only where the beneficial owner is a qualifying individual
  **and** the trustee is the same or another qualifying individual — or where the
  qualifying beneficial owner *"exercises effective control over management and policy
  making or daily operational activities"*

**Control — [Minn. R. 1230.1605](https://www.revisor.mn.gov/rules/1230.1605/):**
- Qualifying owners must *"possess the power to direct or cause the direction of the
  management and policies … and to make day-to-day as well as long-term decisions"*
- *"A qualifying owner must hold the chief executive officer, president, or highest-ranking
  officer position in the company"*
- Qualifying owners must control the governing body
- Non-qualifying individuals *"must not possess or exercise the power to control the
  business or be disproportionately responsible for the operation of the business"*
- No restrictions *"that prevent qualifying owners, without the cooperation or vote of any
  nonqualifying individual, from making any business decision"*

Size and geography are non-issues: TGB's cap is a **$31.84M** three-year average
(Local Effort is around $108k annualized), and Roseville sits in Ramsey County, inside
CERT's 15-county metro area.

---

## 3. Ownership — settled

See the stress table in §1. Catherine holds 56.5% outright, Sarah owns her 5% personally,
and women hold 63.5% in aggregate. Every discount scenario still clears 51%. The trust
question that dominated the earlier draft is closed, and Renee's non-governance class no
longer matters to the threshold — it is worth papering properly (§4c) but it is not
load-bearing.

One new item, created by the 10% transfer itself: see §4d.

---

## 4. Control — strong, with documentation gaps

Catherine's actual role (owner-stated 2026-07-28): **cofounder and kitchen manager, creates
substantial parts of the menu, cooks roughly half the food.** Direct, hands-on, managerial.
For a catering business that is not adjacent to operations — it *is* the operations.
Combined with 56.5% ownership, the substance of the control test is met.

**A correction to the earlier draft.** The previous version of this document read Weston as
"disproportionately responsible for the operation of the business," inferred from how
central he is across this repo and the brain. That inference was drawn from a *web
application* repository and a knowledge graph fed by Gmail, Square, Local Budget, GA4, and
web forms — systems that measure software and back-office work. It measured the sources,
not the business. In a food business the operations are the kitchen, and that is
Catherine's domain.

Worth noting what the probe of the graph actually found: the brain knows Catherine **only**
as an equity holder — one `HOLDS_EQUITY_IN` assertion, a `HAS_FOUNDER` edge, and nothing
else. No `HAS_ROLE`, no link to a single `Dish`, `Menu`, or `ProcessStep`. Maria Beck, by
contrast, has `HAS_ROLE → Chef` with hours and payroll detail. The one operational fact the
graph does hold — the `Labor Hours` constraint — names Weston, Catherine, and Maria as the
production team, which supports the owner's account. So the brain is not evidence about who
runs the kitchen; it is evidence that **kitchen and menu authorship has never been ingested
into it.** That is a documentation gap, and §4b turns it into an action.

What remains to be done is narrow:

**a) A woman must hold the highest-ranking officer position — formally.**
Minn. R. 1230.1605 is explicit: *"A qualifying owner must hold the chief executive officer,
president, or highest-ranking officer position."* Catherine at 56.5% and running the kitchen
makes this natural, but it has to be true in the governing documents, not just in practice.
This is the one hard requirement still open.

**b) The job-duty statements need a system of record behind them.**
Certification requires résumés and job-duty statements for every owner, officer, and
manager. Catherine's will assert kitchen management, menu authorship, and about half of
production — all true, and none of it currently recorded anywhere queryable. The fix is
cheap and useful beyond the application: record her role in the brain (`HAS_ROLE →
Kitchen Manager`, authorship edges to the `Dish` and `Menu` entities she created, her share
of production hours). The graph already holds 430 Dishes and 51 Menus; attributing them is
substantiation the application can cite instead of assert.

**c) Governing documents must not give Weston blocking power.**
On ownership Catherine can now act alone — 56.5% beats 36.5% without needing anyone. But a
unanimity or supermajority clause would hand Weston a veto and violate 1230.1605 directly
*("no restrictions that prevent qualifying owners, without the cooperation or vote of any
nonqualifying individual, from making any business decision")*. Since the documents are
still unwritten, this is a drafting instruction, not a renegotiation. Renee's
non-governance class should be defined here too.

**d) The 10% transfer needs a date and a consideration — and it is recent.**
The graph records this transfer with `effectiveDate: null`, `consideration: null`, and
`documentationStatus: not_yet_papered`, because neither was stated. Both matter. 1230.1604
requires ownership that is *"real, substantial, and continuing, going beyond pro forma
ownership,"* and certifiers specifically probe interests transferred shortly before an
application — a 10% move to the qualifying owner immediately pre-filing is exactly the
pattern they look for. This is very likely fine, but it needs to be papered honestly: the
actual effective date (if it predates today, record that date, not today's), the actual
consideration or a documented gift, and board or member approval. Do not let this be the
one soft spot in an otherwise clean application.

**The cooperative structure remains a wildcard worth counsel's attention.** If Local Effort
is organized under Minn. Ch. 308A/308B with one-member-one-vote governance, voting control
decouples from ownership percentage and women hold 3 of 4 member votes (4 of 5 if Maria
accepts) — which strengthens the control story further. The 1230.1604 ownership test still
applies on its own terms.

**The leverage:** three severity-5 constraints in the brain say the governing documents, the
capitalization formalities, and the board/member approval mechanics are all still
incomplete. Here that is an advantage — **the documents can be drafted to satisfy 1230.1605
by construction**, which is far cheaper than amending them after a denial.

**The cooperative structure is a genuine wildcard here.** If Local Effort is organized
under Minn. Ch. 308A/308B with one-member-one-vote governance, voting control decouples
from ownership percentage entirely, and women would hold 3 of 4 member votes (4 of 5 if
Maria accepts) — a much stronger control story than the percentages give. But the
ownership test in 1230.1604 still applies on its own terms. Counsel needs to look at both.

**The opportunity:** three severity-5 constraints in the brain say the governing documents,
the capitalization formalities, and the board/member approval mechanics are all still
incomplete. That is usually bad news. Here it is leverage — **the documents can be drafted
to satisfy 1230.1605 on the first pass**, which is far cheaper than amending them after a
denial.

---

## 5. What certification is actually worth

This is revenue, not debt, and it does not depend on the P&L — which is why it can proceed
while the bookkeeping backlog is still being cleared.

One application at [sbcp.mn.gov](https://sbcp.mn.gov/) covers:

| Program | Buyer reach |
| --- | --- |
| **CERT** (WBE + SBE) | City of Saint Paul, City of Minneapolis, Hennepin County, Ramsey County |
| **TGB** | State of Minnesota agencies (procurement preference) |
| **DBE / ACDBE** | Federally funded contracts; ACDBE covers **airport concessions** |

For a catering business the near-term targets are city, county, and state event and
meeting catering, plus programs that buy prepared food. Two adjacent programs worth
noting once certified: the [Metropolitan Council Underutilized Business (MCUB)](https://metrocouncil.org/About-Us/Organization/Office-of-Equal-Opportunity/Small-Business-Programs/Metropolitan-Council-Underutilized-Business-Progra.aspx)
program, and [Metropolitan Airports Commission](https://metroairports.org/doing-business/small-disadvantaged-businesses)
ACDBE concessions — a real, if longer-horizon, path for a food business.

CERT certification is free. The program moved from the City of Saint Paul to an external
administrator (Strong and Starlike Consulting) and now runs at
[cert.smwbe.com](https://cert.smwbe.com/), though applications originate at the state
portal.

---

## 6. Document checklist

✅ have · ⚠️ partial · ❌ missing · 👤 owner-only

### Decisive, do first
- ✅ Who holds Sarah's 5% — **Sarah personally** (owner-confirmed 2026-07-28); trust question closed
- ❌ 👤 **Effective date and consideration for the 10% Weston → Catherine transfer**, plus its approval record (§4d)
- ❌ 👤 Governing documents naming a woman as highest-ranking officer (§4a)

### Entity and ownership
- ❌ 👤 Articles of incorporation / organization as filed with the MN Secretary of State
- ❌ 👤 Cooperative bylaws or operating agreement *(do not exist yet — see §4)*
- ❌ 👤 Membership / equity agreements executed by all four holders
- ❌ 👤 Board or member minutes evidencing approvals
- ✅ Cap table with sourced percentages — now correct in the brain (§1)
- ❌ 👤 EIN letter (CP-575) and IRS Form W-9

### Control evidence
- ❌ 👤 Résumés for all owners, officers, and managers
- ❌ 👤 **Job-duty statements** for each — the document where the control test is won or lost
- ❌ Catherine's operational role recorded in the brain — `HAS_ROLE → Kitchen Manager`,
  authorship edges to the Dishes and Menus she created, share of production hours (§4b).
  Buildable here; turns assertions in the application into citable substantiation
- ❌ 👤 Signature authority: bank accounts, contracts, Square, insurance
- ❌ 👤 Payroll records showing who is compensated for what role

### Financial
- ⚠️ Business tax returns showing yearly gross income — needed for the size test, which
  Local Effort passes by a wide margin
- ❌ 👤 Personal net worth statement — required for DBE (< $1.32M cap); confirm whether
  CERT/TGB require it
- ✅ Revenue well under every applicable cap

### Operational
- ❌ 👤 Business licenses: MN Dept. of Agriculture / Health food licenses
- ❌ 👤 Commercial kitchen agreement (MSP Kitchenery Hopkins)
- ❌ 👤 Certificate of insurance
- ❌ 👤 Proof of Ramsey County principal place of business

---

## 7. Plan of action

Ownership is settled, so this is now a legal-drafting and documentation exercise. Nothing
here requires restructuring how the business runs.

### Step 1 — Brief counsel, with certification as an explicit drafting constraint (this week)
The governing documents have to be written regardless; three severity-5 constraints have
been flagging that for months. Brief counsel to draft them so Minn. R. 1230.1605 is
satisfied by construction:
- **Catherine as chief executive / president / highest-ranking officer** — the one hard
  open requirement
- women controlling the governing body
- **no unanimity or supermajority provision** that would hand Weston a veto
- Renee's non-governance class defined so it doesn't muddy the voting-interest test
- the capitalization formalities executed so ownership is "real, substantial, and
  continuing" rather than pro forma
- **the 10% transfer papered** with its true effective date, consideration, and approval

This is the same legal spend already identified as necessary. Adding the certification
constraint costs little and is worth a great deal.

### Step 2 — Pin down the 10% transfer (this week, before counsel drafts)
Recover the actual effective date and consideration. The brain currently holds both as
`null`. If the transfer predates today, record the real date — an older, documented transfer
is materially stronger than a fresh one under 1230.1604's "real, substantial, and
continuing" language. See §4d.

### Step 3 — Record Catherine's operational role (buildable here, ~a day)
Add `HAS_ROLE → Kitchen Manager`, authorship edges from Catherine to the Dishes and Menus
she created, and her share of production hours. The graph already holds 430 Dishes and 51
Menus and currently attributes none of them to her. This converts the job-duty statements
from assertion into citable substantiation, and it fixes a real hole in the brain
regardless of the application.

### Step 4 — Résumés and job-duty statements (1 week, parallel)
Write them from what is actually true: Catherine as cofounder, kitchen manager, menu author,
~50% of production. Weston's statement should be equally accurate about his domain — web,
systems, finance, back office — which is support infrastructure, not operational control of
a food business.

### Step 5 — Resolve Maria's offer (parallel)
Her accepting 1% raises women to 64.5% and reduces Weston to 35.5%. Worth resolving before
filing rather than during.

### Step 6 — Assemble and file (1–2 weeks once 1–4 are done)
Create the company profile at [sbcp.mn.gov](https://sbcp.mn.gov/) and apply for CERT
(WBE + SBE) and TGB together. Add DBE/ACDBE only if federal or airport work is a real
ambition — it brings a personal net worth statement and more scrutiny.

### Step 7 — Then pursue the work
Certification is the key, not the door. Once certified, get on the vendor lists: St. Paul's
vendor outreach program, Hennepin and Ramsey procurement, the state's supplier portal.

### What not to do
Do not file before the governing documents exist and name Catherine as highest-ranking
officer. A denial is not a free retry — it creates a record, and a control finding is
difficult to walk back on a later application.

---

## 8. Sources

- [Minn. R. 1230.1604 — Ownership](https://www.revisor.mn.gov/rules/1230.1604/) · [1230.1605 — Operating Control](https://www.revisor.mn.gov/rules/1230.1605/) · [1230.1600 — Eligibility](https://www.revisor.mn.gov/rules/1230.1600/) · [Chapter 1230](https://www.revisor.mn.gov/rules/1230/)
- [MN Small Business Certification Portal](https://sbcp.mn.gov/) · [eligibility instructions](https://sbcp.mn.gov/instructions/about-eligibility) · [portal launch announcement](https://mn.gov/admin/media/news/?id=36-338062)
- [St. Paul CERT program](https://www.stpaul.gov/departments/human-rights-equal-economic-opportunity/procurement/cert-program) · [CERT administrator site](https://cert.smwbe.com/) · [Hennepin / Elevate Hennepin](https://www.elevatehennepin.org/what-we-offer/resource-directory/central-cert-program) · [Ramsey County CERT](https://www.ramseycountymn.gov/businesses/doing-business-ramsey-county/contracts-vendors/cert-program)
- [MN Office of Equity in Procurement — Targeted Group](https://mn.gov/admin/business/vendor-info/oep/sbcp/tg) · [MnDOT small business eligibility](https://www.dot.state.mn.us/civilrights/small-business-eligibility.html)
- [Metropolitan Council MCUB](https://metrocouncil.org/About-Us/Organization/Office-of-Equal-Opportunity/Small-Business-Programs/Metropolitan-Council-Underutilized-Business-Progra.aspx) · [MAC small + disadvantaged businesses](https://metroairports.org/doing-business/small-disadvantaged-businesses)
