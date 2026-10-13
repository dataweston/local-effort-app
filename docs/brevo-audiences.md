# Brevo audiences

Owner: Local Effort Cooperative. As of: 2026-10-13. Review by: when the next drop audience is built.

Brevo is the single email provider. Audiences are built by `scripts/brevo-consolidate-audiences.cjs` (dry run by default; `--apply` creates lists and adds members). It never removes anyone from an old list, never changes blacklist or unsubscribe flags, and never sends.

Folder `Audiences 2026-10` (id 23):

| Id | List | Who |
|---|---|---|
| 24 | LE \| Customers | Paid (Square/checkout), Thumbtack "Job done", or on an old customer list |
| 25 | LE \| Meal Prep | Meal-prep clients and leads |
| 26 | LE \| Community & Neighbors | Localist, newsletter, neighbors |
| 27 | LE \| Events & Summer Sale Leads | Small-event, venue and summer-sale leads |
| 28 | LE \| Thumbtack Leads | Thumbtack-only leads with a sendable email |
| 29 | LE \| Partners & Media (no consumer promos) | Partners, press, vendors |
| 30 | LE \| Phone Only (no email - SMS opt-in required) | Phone-only holding bucket; not consented for marketing SMS |
| 31 | Pizza Drop 1 \| Target | Customers + Meal Prep + Community + Events, deduplicated by email |
| 32 | LE \| Owner Test Seed (never a send list) | yum@localeffortfood.com only; Brevo requires a test recipient to be a list contact |

Rules: blacklisted contacts, internal addresses and duplicates are skipped. Marketing SMS needs separate explicit opt-in (`docs/growth-measurement.md`); list 30 is not a send audience.

`scripts/brevo-add-square-customers.cjs` (dry run by default) adds Square customers Brevo does not know yet to lists 24 and 31, skipping Square-unsubscribed profiles and never overriding an existing Brevo contact. Phone numbers are not copied. Unconfirmed newsletter signups (Sanity `pending_double_opt_in`) are not added.

## Pizza drop email

`scripts/build-pizza-drop-email.cjs` renders the announcement from the live Sanity-backed record (`/api/store/products?store=pizza-on-smith`) and, with `--draft`, saves a Brevo **draft** campaign on list 31 from `yum@localeffortfood.com`. It never sends or schedules. Preview HTML lands in `.tmp/`. A test send goes only to yum@localeffortfood.com (list 32); real recipients need explicit owner approval.

## Known gaps

- Thumbtack history is not imported: the account is blocked by a card-failure takeover and no webhook credentials exist (`backend/api/routes/thumbtack.js`).
- ZIP/city data is sparse, so proximity to 608 Smith Ave S can't be scored.
- Old ad hoc lists (ids 1-22) remain; retire them only after the owner reviews this mapping.
- List 31 size must fit the Brevo plan's daily send limit before any send.
