# New Gmail Extraction — Plan

> Date: 2026-06-15. A plan, not built. Supersedes the historical
> python/gpt-4o extractors that produced the pollution in
> `docs/brain-data-audit.md` §1.2. Builds on what works now: the menu-quote
> extractor (`backend/api/brain/menuQuoteExtractor.js`, deterministic, 13/13
> clean quotes) and the self-identity + fragment guards.

## Why redo it

The current gmail graph is ~30–40% wrong (audit): business's own addresses
minted as Customers, sentence-fragment Dishes, wrong-offer mappings, self-loops.
Root causes, now understood:

1. **No self-identity guard** at mint time → "Local Effort"/"Weston Smith"/Brevo
   addresses became Customers/Vendors. *(Fixed for the live path in
   `selfIdentity.js`; the historical rows still need the cleanup script.)*
2. **LLM extraction with no grounding discipline** → confident fabrication
   (mid-sentence Dishes, "Wholesale Bread Supply" for a private-dinner lead).
3. **Single-pass, all-or-nothing** → one classifier tried to do entity-minting,
   typing, and relationship-mapping at once, so one bad guess poisoned everything
   downstream.
4. **Thread metadata only** → `email.thread` events store from/to/subject but
   empty snippets; the rich body lived only in the sent-harvest pipeline.

## Design principles (what changed)

- **Deterministic-first, LLM-residue-only.** Default to regex/structured parsers
  that emit a verifiable `sourceSpan` and `extractor: deterministic`. Use the LLM
  ONLY for the messy minority, tagged `extractor: llm`, never auto-confirmed.
  (Proven by the menu-quote extractor: 13/13 real quotes, zero fabrication.)
- **One narrow extractor per signal, not one mega-classifier.** Each extractor
  answers one question (quote price? dietary constraint? vendor invoice?) and
  writes one relType. A miss in one doesn't corrupt the others.
- **Resolve, never mint, for counterparties.** Recipients resolve to EXISTING
  Customer/Person entities through the self-identity guard; unresolved → reported,
  not written. New Customer creation is a separate, deliberate step.
- **Everything provisional.** Extractors write `provisional: true`; the Smart
  Review queue + automation rules (already built) promote/retract in bulk.
- **Idempotent on (relType, src, dst, sourceId).** Re-runs don't duplicate.

## Source of record

Use `gmail_sent_harvest` payloads (structured: `participants[]` as
`{name,email,domain}`, `sentBodyPreview`, `subject`, `gmailLink`) as the primary
text source — it's far richer than `email.thread`. Extend `gmailSync.js` to
capture the body preview into the same shape for inbound threads too, so both
directions are extractable. **Keep the ingest (ledger write) and the extraction
(graph write) as separate steps** — ingest stays dumb and idempotent; extractors
read the ledger.

## Extractor inventory (priority order)

| # | Extractor | relType emitted | Method | Status |
|---|---|---|---|---|
| 1 | **Event menu quote** | `QUOTED` Customer→Offer | deterministic ($N/person) | **built** |
| 2 | **Dietary constraint** | `AVOIDS`/`PREFERS`/`MEDICAL_CONSTRAINT` | exists (`constraintMiner.js`) | built, gmail not wired |
| 3 | **Inbound lead** | `EMAILED` Customer→(thread) + lead props | deterministic: real inquiry detection (date/venue/guest-count present) | new |
| 4 | **Vendor invoice / bill** | `PAYMENT_SENT` / `SOURCED_FROM` Vendor | deterministic: invoice-shape + sender domain allowlist | new |
| 5 | **Sales wording corpus** | `USES_WORDING` Person→Note | exists (works well) | keep |
| 6 | **Occasion / seasonality** | `MENTIONED_OCCASION` | deterministic keyword + date | tighten (audit: wrong-occasion maps) |
| 7 | **Residue classifier** | any of the above | LLM, grounded, provisional-only | new, last |

## Hard guards (apply to every extractor)

1. **Self-identity** (`checkSelfIdentity`) — never mint/resolve the business or
   founder as a counterparty. Already centralized.
2. **Sender allowlist/blocklist for typing.** 28% of `email.thread` senders are
   automated/marketing (weddingpro, narvar, intuit, faire, mailchimp — see
   audit). Maintain a domain blocklist so press/marketing/SaaS senders are NOT
   minted as Customer/Vendor. Press contacts (`tips@`, `*@startribune.com`) →
   a `Press` type or skip, never Customer.
3. **Name-shape validation** (`foodNameLooksValid` / `isFoodFragment` /
   `looksLikeEmailSubject`) — no sentence fragments as Dish/Ingredient, no email
   subjects as Menu.
4. **Offer mapping requires evidence.** Don't map an inquiry to an Offer unless
   the body contains offer-specific signal; default to `Custom Menu Development`
   rather than guessing "Wholesale Bread Supply".

## The LLM step (when it's finally used)

Only on emails that passed the "is a real business thread" gate but that NO
deterministic extractor matched. Constraints:
- Structured output (tool/JSON schema), one relType per call, must return a
  verbatim `sourceSpan` it's grounding on — if it can't quote the email, reject.
- `extractor: 'llm'`, `provisional: true`, confidence capped (≤0.6) so it never
  auto-confirms.
- Needs `ANTHROPIC_API_KEY` with credit; falls back to no-op (logged), never to
  silent garbage. Same pattern as `constraintMiner` / `triageEngine`.

## Rollout

1. Run the cleanup script (`brain-cleanup.cjs --apply`) to archive existing
   pollution first — extract onto a clean base.
2. Ship extractors #3–#4 deterministic; backfill over `gmail_sent_harvest`.
3. Wire constraint miner (#2) to gmail bodies.
4. Add the residue LLM pass (#7) last, once credits are confirmed.
5. Each extractor: dry-run script first (show proposed edges), then `--apply`
   writing provisional, then review via Smart Review. (Same loop as menu quotes.)

## Acceptance

- Re-running extraction is idempotent (no new rows on second run).
- 0 new Customer/Vendor entities that are the business's own identity.
- Spot-check: provisional precision ≥ ~90% on a 30-row sample (vs. the prior
  ~60–70% grounded / 30–40% wrong-edge rate in the audit).
