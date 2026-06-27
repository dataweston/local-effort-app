# Capture guide — how to feed the brain (you + staff)

The unified ingest engine (`backend/api/brain/ingest/`) reads whatever you type,
figures out what it is, and either applies it or queues it for review. You do not
have to follow a format — plain language works. The tags below are **optional**;
they just make parsing faster, more confident, and less likely to need a confirm.

Rule of thumb: **the more specific you are, the less you'll be asked to confirm.**
Medical/allergy items always ask for a confirm, on purpose.

---

## The lanes (intents) and how to phrase them

| You want to record… | Just type… | Optional tag for instant apply |
|---|---|---|
| A customer dietary change | `Samantha: no legumes this month` | `diet: Samantha no legumes this month` |
| An allergy (always confirmed) | `Dave Levy allergic to shellfish` | `diet: Dave Levy allergic to shellfish` |
| An ingredient price | `carrots $1.20/lb from CPW` | `price: carrots $1.20/lb from CPW` |
| A to-do | `call Bakers Field about flour` | `task: call Bakers Field about flour` |
| A vendor/contact to remember | `Sunrise Farms, pastured eggs` | `vendor: Sunrise Farms (pastured eggs)` |
| A freeform note | (anything) | `note: Walker Art Center wants to talk partnership` |

### Dietary (the most important lane)
- **Direction:** "no / avoid / exclude / cut / off" → avoid · "likes / wants / more / add" → prefer.
- **Severity:** "allergic / celiac / medical / can't have" → **medical** (always confirmed). Otherwise a firm "no" → avoid, a soft dislike → preference.
- **Duration (optional):** "this month" → end of month · "this week" → next Monday · "until 7/15" or "until 2026-08-01" → that date. No duration = open-ended until changed.
- **Who:** start with the customer name + `:` (e.g. `Katie: ...`), or — on the Hub panel — **pick the customer first** and just type the change. Picking the customer is the single biggest accuracy boost.

Examples that apply with one tap (customer picked or named, not medical):
- `Katie: no cilantro`
- `Sam: no legumes this month`
- `Shelley: cut beef and pork until 2026-08-01`

Examples that ask for a confirm (by design):
- anything with `allergic` / `medical`
- a name the system can't match to a customer
- vague phrasing it's only ~60% sure about

### Prices (feeds recipe costing later)
`price: <ingredient> $<amount>/<unit> from <vendor>` — unit can be lb, oz, kg, each, case, dozen, gal, bunch, head, ct. The `from <vendor>` part is what links the price to a supplier; include it.

### Tasks
`task: <what to do>` or just start with a verb (call, order, email, pick up, schedule, pay, prep…).

---

## iPhone — Drafts app template

Create a Drafts action that posts the current draft to the brain. One action, any lane.

**1. The note format (type in Drafts):** just write naturally, optionally lead with a tag:
```
diet: Samantha no legumes this month
```

**2. Drafts → Actions → New Action → add a "Script" step** (or a "URL"/HTTP step).
Script step contents:
```javascript
// Brain Quick Capture — posts the current draft to /api/brain/capture
const http = HTTP.create();
const r = http.request({
  url: "https://<your-app-domain>/api/brain/capture",
  method: "POST",
  headers: {
    "Authorization": "Bearer " + credential.getValue("token"),
    "Content-Type": "application/json"
  },
  data: { text: draft.content, source: "Drafts", commit: true }
});
if (r.success) {
  app.displaySuccessMessage("Captured ✓");
} else {
  app.displayErrorMessage("Capture failed: " + r.statusCode);
}
```
Store your brain token once via a Drafts **Credential** named `token` (Drafts will
prompt the first time). Get a token from the brain: `POST /api/brain/tokens`
(admin) with `{ "label": "drafts-iphone", "scopes": ["brain:write"] }`.

**3. (Optional) Home-screen / share-sheet:** assign the action a keyboard row
button or add it to the share sheet so you can capture from anywhere.

Notes:
- `commit: true` applies high-confidence captures immediately; anything uncertain
  lands in the brain inbox for review (nothing is lost).
- Use one line per capture. For several at once, run the action per draft, or
  separate with blank lines (each block is parsed independently — *future*; today
  it's one capture per draft).

---

## Hub notepad / shared iPad

Use the **Quick Capture** panel on the Hub home (staff view). Workflow:
1. (Optional but recommended) search + pick the customer.
2. Type the change in plain language.
3. **Preview** to see what it understood, then **Apply** — or it applies directly
   when it's confident and a customer is selected.

The customer picker is the streamliner: pick Katie, type "no cilantro", done.

---

## What the system does with each capture

- High confidence + safe → **applied** immediately (writes the graph edge), with a
  ledger record you can always retract.
- Medical, unmatched customer, or low confidence → **confirm step** (Hub) or
  **brain inbox** (Drafts/feeds) for one-tap review.
- Everything is recorded as a ledger event and surfaces in the Brain Browser on
  the affected entity, and in the Hub capture feed.
