# Booking funnel assessment — home page pricing & booking tools

**Date:** 2026-07-05 · **Scope:** `/` (FullPageDemoPage) sections: Weekly Meals, Small Events, For Business, Local Pizza, plus the wizards behind them.
**Frame:** the owner's target — 50 meal prep subscriptions and 5 events per day — treated as the design constraint.

This doc has three parts: (1) engineering critique, (2) sales & marketing critique, (3) prioritized recommendations, including items out of scope for this change. The stripped-down implementation that accompanies this doc is summarized at the end.

---

## 1. Engineering critique

### 1.1 The For Business form was broken by design, not by accident

**Root cause:** `handleWholesaleSubmit` in `src/pages/FullPageDemoPage.jsx` (previously lines 546–550) was:

```js
const handleWholesaleSubmit = (event) => {
  event.preventDefault();
  if (!wholesaleEmail) return;
  setWholesaleSubmitted(true);
};
```

No `fetch`. No API call. Nothing. The UI said *"Get menu + pricing"* and *"We'll send a copy of the pricing sheet too"*, flipped to a *"Wholesale menu unlocked"* success state — and the email address never left the visitor's browser tab. Every wholesale lead ever submitted through this form was silently discarded. This is the worst kind of bug: it looks like it works, so nobody notices until a customer says "you never sent me the sheet."

Compounding issues:

- The form was hidden behind a tab click (`businessPanel === 'wholesale'`), so it also violated its own purpose — two interactions before the one field even appeared.
- It had **no honeypot field**, violating the repo's own rule (AGENTS.md: "Public forms must keep their anti-bot guards: honeypot field named `website` + server-side rate limiting"). Moot only because it never hit the network.

**Fix shipped:** the handler now POSTs to the existing `/api/messages/submit` endpoint (type `wholesale-inquiry`, `sendCopy: true`, honeypot included), the form is always visible (zero clicks to reach it), and the menu unlock is preserved as the instant-gratification reward after a *successful* network call, with a visible error state and a mailto fallback.

### 1.2 Dead code shipped to every visitor

`renderSmallEventDialogContent` (~730 lines) — a full estimator dialog with an admin calendar, hold management, deposit overrides, and estimate persistence — **is never called anywhere**. It was superseded by `SmallEventsWizard` but left in the file. ESLint already flags it (`no-unused-vars`) along with its `HOLD_WINDOW_HOURS` constant. Roughly 1,300 lines of the homepage component (estimator + its state, `saveEstimate`, hold/slot admin machinery) exist only to support UI that cannot be opened. It all ships in the homepage bundle.

### 1.3 One 4,600-line component, ~85 state hooks

`FullPageDemoPage.jsx` was ~4,625 lines with a single component holding ~85 `useState` hooks — gallery drag-and-drop state, three product funnels, five dialog systems, feedback, newsletter, announcement bar. Every keystroke in any form re-rendered the entire page tree (including the dnd-kit gallery). The homepage also eagerly imports `framer-motion`, `@dnd-kit/*`, and `DOMPurify`. For "the business's storefront must be fast" (AGENTS.md goal #1), this is the heaviest possible shape.

### 1.4 Pricing config was triplicated — and had already drifted

`SMALL_EVENT_CONFIG` exists in three places: `FullPageDemoPage.jsx`, `SmallEventsWizard.jsx`, and `backend/api/routes/smallEvents.js`. They had **already diverged**: the homepage copy had `minimumTotal: 0` for all types, while the wizard and backend enforce $850/$850/$1,200. Worse, the JSON-LD structured data advertised "$85 per guest" and "$45 per guest" — numbers that match *no* config anywhere (invented). Google can and does surface these. The new price anchors and structured data are derived from the real constants (dinner `baseRate: 95`, floor 65, min $850; pizza 55/38, min $850; events 70/48, min $1,200; meal prep $18 family dinner / $24 solo / $45 for two / $13.50 breakfast / $10 delivery from `MealPrepIntakePage.jsx`).

### 1.5 The meal prep section told customers "no"

The section opened with a struck-through "Pickup on Sundays" and a **disabled** "order here" button — the visual language of a closed shop — then routed the only willing buyers into a 10-field waitlist modal (name, email, phone, family size, children & ages, days/week, meals/day, allergies, questions). A waitlist is anti-selling: it converts demand into a promise to maybe contact them later. The full intake at `/meal-prep-intake` is a 1,076-line multi-step interview — fine as a *post-commitment* onboarding tool, fatal as the front door.

### 1.6 Mobile & SEO/prerender

- **Mobile:** 70vh heroes inside a full-page scroll container, dialogs with `max-h-[90vh]` inner scrolling (scroll-within-scroll-within-scroll), a 56px announcement bar, and a 7-step wizard in a modal. Each is survivable; stacked, they're hostile on a phone — where most "personal chef near me" traffic originates.
- **SEO:** the products live at hash anchors (`/#small-events`) on a single URL. Google indexes one page for four products, so ads and rich results can't deep-link. The `sr-only` crawl summaries and JSON-LD are good practice (and prerender via `tools/static-export.js` makes them visible without JS), but per-product routes would be materially better for ads Quality Score and rich results. Weekly Meals and Local Pizza had **no** structured data at all until this change.
- **Wizard nit:** `SmallEventsWizard` defines subcomponents (`WizardCard`, `Nav`, etc.) inside the render function — new component identity every render, which forces child remounts and risks input focus loss.

---

## 2. Sales & marketing critique

### 2.1 Count the decisions before money can move

Before this change, a dinner-party buyer had to make **~12 decisions across 7 wizard steps** (event type → guest count → meal style → date from an availability calendar → location → kitchen access → dietary tags → notes → name → email → phone → deposit-vs-save) before anything reached the business. The meal prep buyer had **8 required fields** including "days per week" and "meals per day" — we assigned homework before agreeing to feed them. The wholesale buyer had one field that went nowhere.

Every step in a funnel loses 20–40% of the people who enter it. Compound seven steps at even a generous 80% per-step continuation and only ~21% of *starters* finish — and most visitors never start, because the first screen demands a project instead of offering a price.

### 2.2 What a calculator says vs. what a price anchor says

A configurator/calculator communicates: *"Pricing is complicated. You do the work. Prepare for a negotiation."* It shifts cognitive labor and risk onto the buyer. That's appropriate for **considered purchases** — weddings, kitchen remodels — where the buyer *wants* control and expects a consultation.

A price anchor + "book now" communicates: *"We've done this a thousand times. Here's the number. Hand us a date."* Meal prep is a **convenience/habit purchase**: the buyer is deciding whether to trust you with Tuesday dinner, not engineering a bespoke event. Pizza parties are impulse-adjacent celebrations. For these, every configuration question re-opens the decision the customer was trying to close. The calculator didn't inform the sale; it postponed it, indefinitely.

The estimator also produced a *range* ("$765–$1,020") — which reads as "the real number comes later," i.e., a negotiation. "From $850, 15% deposit holds your date" is one number, one commitment mechanism, no ambiguity.

### 2.3 Trust signals were thin exactly where the money is

One testimonial ("Local Effort is truly top tier") sits in the events section; live feedback renders elsewhere. There were no Google review stars, no review count, no partner logos ("find us at Happy Monday"), no "responds within one business day" promise near any CTA. The new success states set an explicit SLA ("we confirm within one business day"), but review proof is an out-of-scope gap (see recommendations).

### 2.4 The math on 50 subscriptions and 5 events/day

Treat the goal as capacity to aim at, and work the funnel backwards with defensible benchmarks (food-service landing pages convert visitors→leads at roughly 3–8% when purpose-built; site-wide multi-purpose pages 1–3%; lead→customer 20–40% *if* follow-up happens within a business day):

- **50 meal prep subscriptions** (stock, not flow): at 3% visitor→lead and 30% lead→subscriber (≈0.9% visitor→sub), that's ~5,500 *targeted* visitors cumulatively. At 8% × 40% (dedicated landing page + fast follow-up + a real "from $82/week" anchor) it's ~1,600 visitors. Entirely reachable with modest Google Ads spend on "meal prep Minneapolis" intent terms — *if* the page can close.
- **5 events/day** = ~150/month ≈ $130–180k/month at the $850–$1,200 minimums. At 0.9% visitor→booked that's ~550 targeted visitors *per day*; at 3.2% (optimized) ~160/day. This is a traffic × conversion problem: the old funnel capped conversion so low that no realistic ad spend could work. Halving friction roughly doubles the ceiling before a dollar of media is spent — that's why this change is the prerequisite, not the whole plan.

Blunt version: the website was optimized to *qualify* leads a cooperative of chefs didn't have time to chase, when the actual scarcity was leads. Qualification is what the one-business-day phone call is for.

### 2.5 Miscellaneous funnel leaks found in passing

- The events hero pushed "home dinners in June" (`/june`) — it is July 2026. A stale promo as the loudest CTA reads as an unattended shop. Removed.
- "Office lunches (coming soon)" as one of three business options: a dead-end CTA in the money path. Removed (kept as a future product, just not as a button).
- The B2B section spent its space on a software case study (Happy Monday portal) — impressive, wrong audience, wrong section. Removed from the funnel path.

---

## 3. Prioritized recommendations

**Done in this change** (see §4): 1) fix wholesale lead capture; 2) one price-anchored CTA per product with minimal fields; 3) wizard demoted to optional "detailed planner" secondary link; 4) schema.org Offers with *real* prices for all four products; 5) honeypots on all new forms; 6) `trackEvent('contact.completed', { leadType })` on every quick form for funnel measurement.

**Out of scope for this change — owner / follow-up work, in priority order:**

1. **Google Business Profile (highest leverage, ~zero cost).** Claim/complete the GBP for Local Effort, set the booking link to `https://www.localeffortfood.com/book`, add products ("Weekly meal prep — from $82/week", "Pizza party — from $850") with photos, and post weekly. The Brain already ingests GBP metrics (`docs/google-business-integrations.md`), so results are measurable in-house.
2. **Google appointment/booking links.** No `calendar.app.google` or scheduling URL exists anywhere in the codebase (verified by search), so the new CTAs post to the existing booking endpoints instead — nothing fake was invented. Owner should create a Google Calendar **appointment schedule** (or a Reserve-with-Google-supported partner) for consult calls; once a real URL exists, add it as a "book a 10-minute call" secondary CTA next to each form.
3. **GA4 funnel events + follow-up SLA.** Add `form_start`/`form_submit` events per product (the `leadType` values are now consistent: `meal_prep_quick_start`, `quick_book_small-events`, `quick_book_local-pizza`, `wholesale_menu_request`) and build the GA4 funnel report. Pair with an operational rule: every lead gets a human reply within one business day — the new success copy promises it, so the business must keep it. Add a Brevo auto-acknowledgement within minutes.
4. **Dedicated landing pages per product** (`/meal-prep`, `/events`, `/pizza-party`) as prerendered routes for Google Ads and organic deep links; keep home sections as teasers pointing at them. Then run small Ads tests on high-intent local queries.
5. **Review proof at the point of sale.** Pipe Google/Thumbtack reviews (count + stars) next to each CTA; ask every completed event and 4-week subscriber for a Google review with a direct GBP review link.
6. **Delete the dead estimator** (`renderSmallEventDialogContent` + hold/admin machinery, ~1,300 lines) and **consolidate `SMALL_EVENT_CONFIG` into one shared module** imported by the wizard, the page, and (as the source of truth mirrored to) the backend. The drift documented in §1.4 will recur otherwise.
7. **Sell meal prep as a purchase, not a lead.** Next step after volume proves out: Square/Stripe checkout for a first week (~$82 solo anchor) directly from the home section — the infrastructure (Square checkout links) already exists for small-events deposits.
8. **Split FullPageDemoPage.** Extract each section into its own component file; lazy-load dnd-kit with the gallery. This is performance *and* maintainability — the wholesale bug lived unnoticed partly because the file is unreviewably large.

---

## 4. What changed (before → after friction)

| Product | Before (interactions to submit a lead) | After |
|---|---|---|
| **Weekly Meals** | Struck-through "closed" messaging → "Join the waitlist" click → modal → **8 required fields** + 3 optional → submit (≥10 interactions, framed as waiting) | Section shows "from $82/week" → **3 required fields** (name, email; phone/start-week optional) → submit (4 interactions). Secondary: full intake link. |
| **Small Events** | Button → 7-step wizard: ~12 decisions / 15+ inputs → deposit-or-save | Form in section: type select + name, email, phone, date → submit (**5–6 interactions**). Secondary: detailed planner (wizard), contact dialog. |
| **For Business** | Tab click → 1 field → **submitted into the void (bug)** | Form visible with price anchor ("from $3.10/unit") → 1 field → actually submits, unlocks menu, emails team + copy to lead. |
| **Local Pizza** | Button → same 7-step wizard | Form in section, type pre-set: name, email, phone, date → submit (**4 interactions**). Secondary: detailed planner. |

All quick forms reuse existing endpoints (`/api/events/request`, `/api/messages/submit`) with their server-side dedupe, Supabase/Sanity persistence, team email + ICS attachments, honeypot handling, and rate limiting. Nothing was rebuilt.
