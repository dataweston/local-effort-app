# Helcim as a Square replacement: technical compatibility study

**Date:** 2026-08-10  
**Scope:** Current production architecture and non-archived code in this repository, plus current first-party Helcim and Square documentation.  
**Decision:** **Do not attempt a full, immediate Square-to-Helcim replacement.** Helcim is technically viable for a bounded subset of new card/ACH payment flows, but it is not compatible with several live Square-dependent capabilities and it is not a drop-in API substitution. A staged hybrid pilot is the only presently supportable migration path.

## Executive finding

Helcim is a credible payment processor for Local Effort's ordinary online card payments, invoices, customer vault, ACH, recurring billing, and potentially in-person payments. Its published pricing is attractive and its API covers the core payment primitives.

However, Square is functioning as much more than a card processor in this repository. It is also:

- the embedded browser payment SDK and wallet layer;
- the dynamic hosted-checkout-link generator;
- the native gift-card ledger and redemption system;
- the order, customer, catalog, invoice, subscription, and receipt identity system;
- the source of company-brain order/customer evidence;
- the source used to reconcile net bank deposits;
- a third-party OAuth integration target for Happy Monday's own Square account;
- an input to planner forecasts and operational audits; and
- **the staff timekeeping, wage, and shift-scheduling system** behind Hub payroll evidence and the planner-to-Square scheduled-shift writeback.

There are **155 non-archived files containing Square references** across `src/`, `backend/`, `api-handlers/`, `scripts/`, and `prisma/`. That count includes historical/secondary code and is not a count of live payment routes, but it accurately reflects broad coupling. **23 of the handlers currently mounted in `backend/api/index.js` contain Square references**, of which roughly fifteen make direct payment or checkout-link calls.

There are **two hard blockers, and neither is solvable in code**:

1. **Gift cards.** Helcim's current U.S. acceptable-use policy lists sales of digital or physical preloaded payment cards and gift cards as prohibited. The public `/gift-cards` route currently charges the buyer, creates a native Square gift card, activates it against the Square order, and returns the redeemable code. Even setting policy aside, Helcim has no documented equivalent to Square's gift-card API.
2. **Labor and scheduling.** Helcim's entire v2 API is 28 endpoints covering payments, customers, invoices, recurring billing, card batches, and terminals. It has no timecard, wage, team-member, or scheduled-shift API of any kind. Square Labor is not a payment feature Local Effort could swap; it is an operational system with no Helcim counterpart at any price.

A third item is a serious underwriting risk rather than a blocker: Helcim's AUP places advance-paid events in its **Restricted** category, and advance-paid events are the shape of most Local Effort checkout flows. See "Acceptable-use exposure" below.

## Current Square footprint

### 1. Browser checkout and wallets

`src/hooks/useSquareCard.js`, `src/hooks/useSquareExpressPay.js`, and `src/lib/useSquarePayments.ts` load Square's Web Payments SDK, attach embedded card fields, tokenize payment details, invoke buyer verification, and expose express checkout. These hooks are reused by multiple public and internal pages.

Square's SDK produces a short-lived token in the browser. The existing server handlers then validate prices and inventory, reserve local inventory where required, and call `paymentsApi.createPayment`. That separation is embedded in handlers for the sale/store, gift cards, pizza parties, Chez Garage at Home, seasonal dinner pages, Psyche, weekly orders, Happy Monday, and food-truck deposits.

HelcimPay.js uses a different control flow. The server first initializes a checkout session with the final amount and receives `checkoutToken` and `secretToken`; the browser renders Helcim's iframe/modal and normally completes the payment there; the application then validates the returned transaction. Tokens expire after 60 minutes or after use. This is a sound model, but it requires a new shared client hook, a server-side initialize endpoint for every priced flow, callback validation, webhook reconciliation, and changes to when inventory is reserved and released.

Compatibility: **possible with redesign, not drop-in**.

Relevant Helcim documentation: [HelcimPay.js initialization](https://devdocs.helcim.com/docs/initialize-helcimpayjs), [HelcimPay.js overview](https://devdocs.helcim.com/docs/overview-of-helcimpayjs), and [payment methods](https://devdocs.helcim.com/docs/available-payment-types-and-methods-through-helcimpayjs).

### 2. Dynamic hosted checkout links

The repo creates one-off Square payment links for small-event deposits, Localist food orders, weekly orders, seasonal dinners, Happy Monday, pizza parties, and other fallbacks. The links contain server-priced line items and frequently redirect to a local success route. The local database records Square payment-link and order IDs before payment, then the Square webhook changes the local state when payment completes.

Helcim offers Hosted Payment Pages, but the documented product is a configured hosted page rather than a direct equivalent to Square's per-request `createPaymentLink`. Helcim invoices do expose a tokenized online view and HelcimPay.js can be attached to an invoice. Therefore the practical replacement is one of:

1. create a Helcim invoice, persist its identifiers, and send the invoice online-view URL; or
2. create a Local Effort hosted-checkout route that initializes and renders HelcimPay.js.

Both are architectural changes, particularly for redirects and abandoned-checkout tracking.

Compatibility: **partial; custom replacement required**.

Relevant documentation: [Hosted Payment Pages](https://devdocs.helcim.com/docs/hosted-payment-pages), [Invoice API](https://devdocs.helcim.com/docs/invoice-api), and [online invoice view](https://devdocs.helcim.com/docs/online-invoice-view).

### 3. Payment webhooks and local state transitions

`backend/api/index.js` receives a signed Square webhook containing a payment object. It verifies the raw-body signature and uses payment fields to update small-event and Localist orders, apply completed-payment state, and optionally ingest evidence into the company brain.

Helcim signs webhook events with HMAC-SHA256, so the security model is compatible. Its documented card-transaction webhook contains only an event type and transaction ID. The receiver must call the Card Transaction API to obtain the amount and details. The replacement therefore needs:

- a new raw-body middleware route and Helcim signature verifier;
- replay/timestamp protection and event-id idempotency storage;
- an authenticated transaction lookup;
- correlation through a durable local checkout ID placed in `invoiceNumber` or another supported reference; and
- revised retry behavior so local state is idempotent when Helcim retries for up to roughly ten hours.

Compatibility: **good primitives, more application work and another failure boundary**.

Relevant documentation: [Helcim webhooks](https://devdocs.helcim.com/docs/webhooks) and [Card Transaction collection](https://devdocs.helcim.com/reference/getcardtransactions).

### 4. Gift cards

`api-handlers/store/gift-card-checkout.js` uses a Square-specific four-step flow: create a `GIFT_CARD` order, charge it, create a digital gift card, and activate the card against the order line item. The Square-generated account number is subsequently sent by Brevo and can be redeemed in Square.

No equivalent gift-card issuance/redemption API appears in Helcim's documented API families. More importantly, Helcim's current U.S. AUP explicitly prohibits sales of preloaded cards and gift cards. This is a **hard blocker** for full replacement while `/gift-cards` remains live.

Compatibility: **not compatible**. Keep Square or use a separately approved stored-value provider. Do not build a home-grown stored-value ledger without legal/accounting review, fraud controls, escheat/unclaimed-property handling, and explicit processor approval.

Relevant policy: [Helcim U.S. Acceptable Use Policy](https://legal.helcim.com/us/acceptable-use-policy/).

### 5. Customers, recurring membership, and card vault

The Localist signup handler searches or creates a Square customer, then creates a checkout link tied to a Square subscription-plan variation. Other brain and hub code uses `squareCustomerId` as a stable identity anchor.

Helcim has customer, card-vault, payment-plan, subscription, and add-on APIs. HelcimPay.js can verify and save a default card or bank account. Feature coverage is broadly adequate, but IDs, schedule semantics, first-payment behavior, and webhook evidence differ. Helcim charges a published additional 0.4% per recurring transaction. Membership/subscription business models may also receive underwriting scrutiny, so Local Effort must obtain written approval for the exact Localist model before migration.

Compatibility: **technically feasible after data-model and workflow migration; underwriting gate remains**.

Relevant documentation: [Customer API](https://devdocs.helcim.com/docs/customer-api), [Recurring API](https://devdocs.helcim.com/docs/recurring-api), and [subscription behavior](https://devdocs.helcim.com/docs/recurring-subscriptions).

### 6. Orders, catalog, inventory, partner OAuth, and gift-card redemption

Square's Orders and Catalog APIs appear in checkout line-item creation, the Square-to-Sanity catalog import, Happy Monday catalog/inventory sync, company-brain order ingestion, and reporting. Happy Monday also has a Square OAuth flow granting Local Effort access to Happy Monday's Square inventory.

Helcim invoices can hold line items and its POS has a product catalog, but the public API overview does not document a Square-equivalent Orders/Catalog/Inventory API surface or a seller OAuth flow suitable for connecting a different merchant's Helcim account. Even if Local Effort changes its own processor, Happy Monday's Square account integration is logically independent and should remain Square unless Happy Monday changes systems.

Compatibility: **invoice line items are feasible; broader catalog/inventory and external-merchant OAuth are not established substitutes**.

### 7. Invoices and planner forecasting

`backend/api/planner/forecast.js` and `api-handlers/hub/_mealPrepLifecycle.js` list Square invoices, retrieve linked Square orders, infer recurring monthly revenue, identify paid meal-prep invoices, and attach customers to revenue evidence.

Helcim's Invoice API can create, retrieve, list, and update itemized invoices, so a replacement forecast adapter is plausible. Field mappings are not one-to-one, and the current forecast infers cadence from Square invoice dates/statuses. The Helcim pilot must validate scheduled, unpaid, partially paid, refunded, and recurring-subscription records before the planner can switch sources.

Compatibility: **feasible with an adapter and parallel-result validation**.

### 8. Company-brain order and customer evidence

`backend/api/brain/squareOrdersSync.js` searches completed Square orders across locations, fetches related payments, harvests customer/email/receipt/card-fingerprint signals, and writes `source: 'square'` ledger events. `orderGraphProjector.js`, hub enrichment, and the resolver then use Square customer IDs and source-specific fields to resolve customers and attribute sales.

Helcim can list transactions and customers, and card records contain a token plus first-six/last-four information. It does not expose the same order/customer/receipt graph. A new `helcimTransactionsSync` would need to use Helcim transactions and invoices as the source, explicitly map `customerCode` and `invoiceNumber`, and accept weaker or different identity signals. Historical `source: 'square'` events must remain immutable; new events should use `source: 'helcim'`.

Compatibility: **possible, but not equivalent; identity quality must be measured during a parallel run**.

### 9. Settlement and Local Budget reconciliation

`backend/api/brain/squareReconcile.js` retrieves Square payouts and payout entries, matches net Square bank deposits to Local Budget income by amount/date, and optionally walks payment-to-order links for customer attribution.

Helcim exposes card transactions and card batches, and supports either gross or net deposits. Its documented Card Batch API provides batch totals and settlement state, but does not establish an API equivalent to Square's payout object with bank-arrival date, net amount, fee/capital deductions, and payout-entry membership. This is a material accounting gap. Card batches might be sufficient only if each closed batch maps deterministically to one bank deposit under Local Effort's selected funding mode.

Compatibility: **unproven**. A production-like pilot must compare Helcim batch exports/API results with actual bank deposits for at least two complete funding cycles before replacing Square reconciliation.

Relevant documentation: [Card batches](https://devdocs.helcim.com/docs/card-batches) and [Payment API](https://devdocs.helcim.com/docs/payment-api).

### 10. UCP and agent-facing checkout

`backend/api/routes/ucp.js` currently reports `payment.provider: 'square'` and delegates completion to provider-specific checkout handlers. The UCP/MCP surface is externally advertised in `public/ai/manifest.json` and related agent-facing files.

The UCP session abstraction is helpful, but its completion payload and escalation path assume the present browser-token flow. A Helcim adapter can sit behind UCP, but agent-facing completion will normally need to escalate to a HelcimPay modal or invoice URL. Provider metadata and public manifests must change only after the tested production path changes.

Compatibility: **feasible after provider abstraction; not an isolated environment-variable change**.

### 11. Staff timekeeping, wages, and shift scheduling

This is a live, non-payment dependency on Square that has no Helcim analogue at all.

`api-handlers/hub/payroll.js` (mounted at `/api/hub/payroll`) calls `teamApi.searchTeamMembers` to match a Hub profile to a Square team member, `laborApi.listTeamMemberWages` to read the current hourly rate, and `laborApi.searchShifts` to pull closed shifts, subtract unpaid breaks, and compute paid minutes and gross wages. `src/components/hub/HubCalendarView.jsx` renders the result and distinguishes "Current Square Labor wage setting" from Company Brain evidence. `scripts/audit-square-labor.cjs` and `scripts/audit-hub-payroll.cjs` audit the same source.

The dependency also runs in the write direction: `scripts/sync-square-scheduled-shifts.cjs` pushes planner cards into Square as scheduled shifts via `POST /v2/labor/scheduled-shifts`, then publishes them with `scheduled_shift_notification_audience: 'NONE'`. The weekly planner is, in part, a front end for Square's scheduling system.

Helcim's published v2 API surface is 28 endpoints across card batches, card terminals, card transactions, customers, HelcimPay initialization, invoices, and payments. There is no team, labor, timecard, wage, or scheduled-shift resource, and Helcim does not market employee time tracking or scheduling as a product. Its POS app offers user accounts and permissions, not timekeeping suitable for wage computation.

Compatibility: **not compatible, and not on a roadmap this study can rely on**. If Local Effort leaves Square entirely, Hub payroll evidence and planner shift publishing lose their data source and must be rebuilt against a separate timekeeping system (or against Company Brain evidence alone, which `payroll.js` already treats as the weaker fallback). This is unrelated to card processing cost and should be priced as its own project.

Relevant Square documentation: Labor API (`searchShifts`, `listTeamMemberWages`, `/v2/labor/scheduled-shifts`) and Team API.

### 12. Split-brain SDK resolution (pre-existing hazard)

This is not a Helcim question, but it materially affects the cost and risk of any payment refactor, so it belongs in scope.

Two different major versions of the Square Node SDK are installed and both are live:

| Location | Declared | Resolved | Export shape |
| --- | --- | --- | --- |
| root `package.json` | `square ^37.0.0` | 37.1.0 | `{ Client, Environment }`, `client.paymentsApi` |
| `backend/package.json` | `square ^43.0.1` | 43.0.2 | `{ SquareClient, SquareEnvironment }`, plus a `square/legacy` compat entry point |

Node resolves `square` by walking up from the requiring file. Code under `backend/` (`backend/api/index.js`, `backend/api/brain/*`, `backend/api/planner/forecast.js`, `backend/api/routes/smallEvents.js`) resolves to **v43**. Code under `api-handlers/` — including the shared `api-handlers/_lib/squareClient.js` that most checkout handlers import — walks up past `api-handlers/node_modules` to the root and resolves to **v37**. The two SDKs therefore coexist inside a single serverless function.

This explains the defensive dual-shape branches in both `api-handlers/_lib/squareClient.js` and `backend/api/index.js`, and the `require('square/legacy')` fallback. Those branches are not speculative forward-compatibility; they are load-bearing compatibility shims for a real version split. Note also that `getSquareClient()` validates the client by probing for *either* `catalogApi.listCatalog` (v37) or `catalog.list` (v43) and caches the result in module scope.

Implications for this study:

- The payment layer is already paying an abstraction tax for a version split nobody chose. A provider abstraction (Phase 1) should absorb this at the same time, collapsing both SDKs behind one internal interface.
- Any estimate that assumes "swap one SDK for one HTTP client" is optimistic. Two call conventions must be traced, not one.
- This split should be resolved on its own merits regardless of the Helcim decision. It is a live source of subtle behavioral difference between handlers that appear identical.

Note that a previously recorded assumption that "backend uses root `node_modules`" does not hold for this package; `backend/node_modules/` exists and contains its own `square`, alongside `@modelcontextprotocol/sdk`, `google-gax`, and `pm2`.

## Acceptable-use exposure beyond gift cards

The gift-card prohibition is quoted correctly above, but Helcim's U.S. AUP contains a second category that maps directly onto Local Effort's core business and deserves explicit attention before any underwriting conversation.

Under **Restricted** businesses, the AUP lists "Events or event planning, promotion and organization where ticket fees are paid for in advance" and "Ticket brokers and agencies; advanced ticket sales". Under **Prohibited**, it lists "Businesses with a delayed delivery greater than one year on more than 25% of sales volume".

Nearly every checkout flow in this repository takes money in advance for a meal or event delivered on a later date: the seasonal dinner pages (`july-dinner`, `winter-dinner`, `february`, `psyche`), pizza parties, small-event deposits, weekly meal-prep orders, and Localist membership. Local Effort's delayed delivery is measured in days or weeks, so the one-year prohibition does not apply. But "Restricted" means the account requires specific approval and may carry reserves, rolling holds, or volume caps — terms that would materially change cash flow for a business whose deposits fund the events they pay for.

This does not make Helcim unusable. It does mean the published headline rate is not the rate Local Effort should assume, and that **underwriting must approve the advance-payment model in writing, including any reserve or hold terms, before engineering effort is committed**. A processor that approves the account and then imposes a rolling reserve is worse than the status quo regardless of API quality.

Policy source: [Helcim U.S. Acceptable Use Policy](https://legal.helcim.com/us/acceptable-use-policy/).

## Cross-cutting technical differences

| Concern | Current Square behavior in repo | Helcim implication |
| --- | --- | --- |
| Browser flow | Embedded fields tokenize; server performs charge | Server initializes amount-bound session; modal typically performs charge |
| Online wallets | Repo supports Square express pay; Square documents Apple Pay and Google Pay | HelcimPay.js documentation explicitly describes Google Pay; online Apple Pay support is not documented and must be confirmed |
| Buyer verification | Repo passes Square `verificationToken` from buyer verification | No like-for-like 3DS/SCA token flow was established in reviewed Helcim docs; confirm fraud/liability behavior with Helcim |
| Hosted links | Dynamic per-order Square Payment Links with redirect | Use Helcim invoice online view or build a Local Effort hosted HelcimPay route |
| Webhook payload | Full payment object usable immediately | Event ID only; fetch transaction before applying local state |
| Idempotency | Existing keys are generally UUIDs or sanitized up to 45 characters | Helcim Payment API accepts 25–36 character keys and clears keys after five minutes; recurring endpoints have stricter endpoint-specific rules. Centralize key generation and retain local uniqueness permanently |
| Local development | Square SDK explicitly supports HTTPS or localhost in the shared hook | HelcimPay.js requires a public HTTPS origin; local work needs an approved tunnel or preview URL |
| SDK | Two Square Node SDK versions are genuinely installed and both are reachable at runtime — see "Split-brain SDK resolution" below | Helcim publishes no official Node SDK; the npm packages under that name are community-maintained and one is a 3-year-old Pipedream component. Implement a small typed `fetch` client rather than depend on an unofficial package |
| Money | Square SDK uses integer minor units/`BigInt` in parts of this repo | Helcim examples use decimal currency amounts. Use a single cents-to-decimal boundary helper and never float-based business arithmetic |
| IDs | String IDs stored in many Square-specific columns | Helcim transaction/customer/invoice identifiers differ. Preserve historical fields and add provider-neutral records |
| Test environment | Square sandbox is configured by environment variables | Helcim developer test account is separate and must be requested; it does not imply production underwriting approval |

Testing references: [Helcim developer testing](https://devdocs.helcim.com/docs/developer-testing), [localhost testing via tunnel](https://devdocs.helcim.com/docs/testing-helcimpay-in-localhost-environments), and [idempotency](https://devdocs.helcim.com/docs/idempotency).

## Security and compliance assessment

Helcim's basic security posture is compatible with this stack: backend-only API token, domain-restricted checkout configuration, hosted payment iframe, HMAC-signed webhooks, and tokenized cards. The migration should nevertheless be rejected unless all of the following are true:

1. Local Effort receives production merchant approval for its exact mix of personal-chef service, advance event tickets/deposits, Localist membership, catering, and physical food sales.
2. Helcim confirms in writing which flows are permitted and explicitly addresses the live gift-card program. Current published policy says gift-card sales are prohibited.
3. No API token is exposed as `VITE_*` or placed in runtime client config. Only short-lived checkout tokens go to browsers. Note the model difference: Square legitimately ships `VITE_SQUARE_APP_ID`, `VITE_SQUARE_LOCATION_ID`, and `VITE_SQUARE_ENV` to the browser because an application ID is publishable by design. **Helcim has no publishable client key.** HelcimPay.js is driven by a server-minted `checkoutToken` that is amount-bound and expires in 60 minutes, so the correct migration deletes the `VITE_SQUARE_*` pattern rather than renaming it. Any `VITE_HELCIM_*` variable holding a credential is a defect, not a port.

   Server-side, the live Square config surface to be replaced is: `SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`/`SQUARE_ENV`, `SQUARE_LOCATION_ID`, `SQUARE_BASE`, `SQUARE_SANDBOX_TOKEN`, `SQUARE_APP_ID`/`SQUARE_APP_SECRET` and `SQUARE_OAUTH_REDIRECT_URI` (Happy Monday OAuth), and `SQUARE_LOCALIST_MONTHLY_PLAN_VARIATION_ID`/`SQUARE_LOCALIST_ANNUAL_PLAN_VARIATION_ID`. The last two pin Localist membership to specific Square subscription-plan variation IDs and have no meaning outside Square; they must be recreated as Helcim payment-plan IDs, not migrated.
4. Webhook timestamp tolerance, constant-time signature comparison, replay prevention, and idempotent event application are implemented.
5. The server remains authoritative for SKU availability, delivery rules, amounts, and inventory reservation before initializing the checkout session.
6. The production HelcimPay domain allowlist includes the canonical site and the chosen preview/tunnel strategy is separated from production credentials.
7. Customer communications follow the repository's dry-run and approval rules. A processor migration does not authorize emailing customers or requesting new cards without an approved message test.

## Data migration design

Do not rename or reuse historical `square*` columns for Helcim IDs. Preserve them as immutable historical references and add provider-neutral storage, preferably:

```text
PaymentProviderAccount(provider, externalAccountId, environment)
PaymentCustomer(entityId, provider, externalCustomerId)
PaymentCheckout(localOrderId, provider, externalCheckoutId, externalOrderId, url, status)
PaymentTransaction(localOrderId, provider, externalPaymentId, amountCents, status, receiptUrl, occurredAt)
PaymentSettlement(provider, externalSettlementId, grossCents, feeCents, netCents, arrivalDate)
```

Provider IDs should have composite uniqueness on `(provider, externalId)`. Existing tables can initially gain neutral columns instead, but a mapping-table design will reduce the current coupling in Prisma, the brain resolver, MCP tools, hub views, and future processor changes.

Helcim advertises free assisted import/export of card data, typically 5–10 business days and sometimes up to 30. It requires full card numbers, expiry, and a customer identifier delivered through a PCI-compliant process. Square and Helcim must coordinate; Square tokens themselves are not portable. Treat successful card migration as a vendor-managed prerequisite, not an engineering assumption. See [Helcim card-data migration](https://learn.helcim.com/docs/migrate-credit-card-data).

Subscriptions must be recreated against Helcim customer/default-payment records and reconciled against Square cancellation dates. Never run both processors' recurring schedules simultaneously.

## Cost comparison (directional only)

Square currently publishes 2.9% + 30 cents for Online API card payments on its U.S. pricing page. Helcim publishes interchange plus 0.50% + 25 cents for keyed/online volume below $50,000 per month, with automatic lower margins at higher volume; Helcim recurring payments add 0.4%. Helcim says most keyed/online merchants have an effective rate below 2.5%, but actual interchange and card mix determine the outcome.

Helcim may save meaningful processing cost, especially on larger tickets and ACH (published at 0.5% + 25 cents, capped at $6). It is not possible to quantify savings responsibly from repository code. The decision model needs 3–6 months of Square statements split by channel, ticket size, card type, refunds, chargebacks, gift-card loads, subscriptions, and hardware volume. Compare total effective cost, including retained Square costs, new hardware, engineering, operational reconciliation, and conversion loss from wallet/checkout changes.

Pricing sources: [Helcim pricing](https://www.helcim.com/pricing/) and [Square U.S. pricing](https://squareup.com/us/en/pricing).

## Recommended architecture and migration path

### Recommendation: hybrid pilot, then decide

Keep Square as the system of record for historical Square data and for capabilities Helcim cannot lawfully or technically replace. Pilot Helcim only on a low-risk, ordinary card checkout with no gift card, subscription, partner inventory, or complex post-payment state. A suitable candidate is a limited single-product/seasonal flow after verifying that it is still intended to be active; do not choose `/gift-cards`, Localist membership, Happy Monday, or the small-event deposit funnel as the first pilot.

### Phase 0: vendor gates (no production code cutover)

- Obtain written underwriting approval for every intended business/payment flow.
- Ask Helcim to confirm online Apple Pay, 3DS/SCA/liability shift, per-order hosted-link options, webhook events for HelcimPay and recurring payments, exact deposit/batch mapping, API rate limits, and seller OAuth/catalog availability.
- Request a developer test account and confirm production API access roles.
- Confirm Square-to-Helcim card-vault export eligibility and subscription migration procedure.
- Export Square statements and calculate channel-specific savings.

Any negative answer on gift cards means the full-replacement proposal is closed; use a hybrid or another processor.

### Phase 1: provider abstraction and test harness

- Add a provider-neutral payment service and cents/decimal conversion boundary.
- Implement Helcim REST client, checkout initialization, callback validation, transaction lookup, and webhook verification.
- Add provider-neutral ID mappings without altering historical Square fields.
- Build contract tests against Helcim's developer account plus webhook replay/idempotency tests.
- Add a public-HTTPS test strategy using a controlled tunnel or preview domain.

### Phase 2: one-flow canary

- Run a single eligible checkout through Helcim behind a server-side feature flag.
- Keep Square fallback available.
- Validate customer experience, Brevo confirmations, refunds/reversals, receipts, accounting exports, support workflow, and inventory release behavior.
- Reconcile at least two complete Helcim funding cycles to bank deposits and Local Budget.

### Phase 3: parallel operational adapters

- Add Helcim transaction/customer/invoice ingestion with `source: 'helcim'`.
- Compare planner forecast and brain customer attribution against hand-verified transactions.
- Add provider-aware hub labels and receipt links.
- Update UCP/MCP provider metadata only for flows actually migrated.

### Phase 4: selective expansion

Move ordinary card/ACH checkouts whose feature and conversion results meet thresholds. Retain Square for gift cards, historical reads, and Happy Monday's Square connection unless those functions are intentionally replaced by separately approved systems.

## Estimated engineering effort

For one experienced engineer familiar with this repo:

| Workstream | Estimate |
| --- | ---: |
| Provider-neutral model and Helcim REST client | 4–7 engineer-days |
| HelcimPay shared frontend flow and callback validation | 5–8 days |
| Webhook, event correlation, replay protection, refund/reverse tools | 4–7 days |
| First production canary and end-to-end tests | 4–6 days |
| Migrate ordinary direct-payment and hosted-link flows | 8–15 days |
| Customer/subscription/invoice adapters | 5–9 days |
| Brain, planner, UCP/MCP, and settlement adapters | 7–12 days |
| Cutover validation, observability, and runbooks | 4–7 days |
| Replace Hub payroll evidence + planner shift publishing against a non-Square timekeeping source (only if Square is dropped entirely) | 6–10 days, plus vendor selection |

**Selective hybrid:** roughly 17–28 engineer-days for the foundation plus a canary and a few simple flows. Square is retained, so labor and gift cards are untouched.  
**Broad migration:** roughly 41–71 engineer-days (8–14 weeks for one engineer), excluding vendor underwriting, card migration, hardware procurement, customer re-consent, any replacement gift-card system, and the labor/scheduling replacement above. These are planning ranges, not commitments.

Note the asymmetry: the hybrid path avoids both hard blockers entirely, because both gift cards and Square Labor simply stay where they are. The blockers only bind on full replacement.

## Go/no-go criteria

Proceed beyond a pilot only when all are true:

- written Helcim production approval covers every migrated flow, **including the advance-payment event model, with any reserve or rolling-hold terms stated in writing**;
- gift cards have an explicitly approved retained or replacement system;
- Hub payroll evidence and planner shift publishing have a confirmed home — either a retained Square account or a funded replacement timekeeping system;
- payment success rate is no worse than Square by more than 0.5 percentage points over a meaningful sample;
- mobile completion and wallet availability meet an agreed conversion threshold;
- refunds, reversals, duplicate prevention, and abandoned checkout recovery pass end-to-end tests;
- two or more funding cycles reconcile exactly to bank and Local Budget;
- planner/brain attribution reaches an agreed match rate and unmatched sales have an operations queue;
- net annual savings after engineering, retained Square costs, hardware, and operational labor exceed the migration hurdle; and
- rollback can route new checkouts to Square without losing Helcim transactions already in flight.

## Final verdict

**Helcim is an appropriate candidate for a cost-saving secondary processor and potentially the primary processor for ordinary eligible card/ACH flows. It is not an appropriate full replacement for Square in the repository's present form, and the reason is not API quality.**

Helcim's payment API is clean, its pricing is genuinely better for this volume profile, and its primitives (tokenized cards, HMAC webhooks, invoices, recurring plans, ACH) are sufficient for ordinary checkout. The obstacle is that Square is not functioning as a payment processor here. It is the business's catalog, order ledger, customer directory, gift-card issuer, settlement record, and timeclock. Helcim's published API is 28 endpoints; it does not attempt to be that system and does not claim to.

Two capabilities have no Helcim replacement at any price — native gift cards (also prohibited by policy) and Square Labor timekeeping/scheduling. Both are live and both are load-bearing. A third, the advance-paid event model, sits in Helcim's Restricted category and must be underwritten explicitly before anything is built.

The best next decision is not "rewrite for Helcim." It is "complete vendor underwriting and a one-flow test-account prototype, then run a measured production canary" — with Square retained for the surfaces it uniquely provides. Framed that way the hybrid is not a compromise, it is the correct end state: route card volume to whoever prices it best, and stop treating a processor as the system of record. The provider abstraction in Phase 1 is worth building on its own merits, because it is what makes this and any future processor decision cheap.
