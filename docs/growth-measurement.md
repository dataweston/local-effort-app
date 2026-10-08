# Growth measurement

The canonical acquisition path is:

`search/ad/referral -> landing page -> lead/checkout -> payment -> contribution margin`

Browser events are emitted through `src/lib/trackEvent.js`. The helper:

- captures first- and last-touch UTM/click identifiers at initial page load;
- sends supported commercial events to GA4 without customer PII;
- sends the same event plus bounded acquisition context to `/api/store/events`;
- preserves the legacy Firestore checkout log while also writing Brain ledger
  events with `source = web_checkout`.

## Event tiers

| Tier | Events | Google Ads bidding |
| --- | --- | --- |
| Economic outcome | `purchase` backed by a successful payment and unique transaction ID | Primary |
| Qualified lead | A later operational status confirming fit, date, budget, and service area | Primary only after the status workflow exists |
| Submitted lead | `generate_lead` from a successful meal-prep intake, event estimate, or event quote request | Secondary initially |
| Funnel diagnostic | `begin_checkout`, `add_shipping_info`, `add_payment_info` | Never primary |
| Engagement | product/cart views and partner clicks | Never primary |

Do not mark every GA4 key event as a primary Google Ads conversion. Google Ads
should optimize against payments and genuinely qualified opportunities, not the
easiest interaction.

## Acquisition payload

The server accepts:

```json
{
  "acquisition": {
    "firstTouch": {
      "source": "google",
      "medium": "cpc",
      "campaign": "private-dinners",
      "gclid": "...",
      "landingPage": "/book",
      "gaClientId": "...",
      "gaSessionId": "..."
    },
    "lastTouch": {}
  }
}
```

Supported identifiers are `utm_source`, `utm_medium`, `utm_campaign`,
`utm_term`, `utm_content`, `gclid`, `gbraid`, and `wbraid`. Landing and referrer
URLs are stored without query strings or fragments. Unknown fields and
PII-shaped values are dropped or redacted before Brain ingestion.

## Current limitations

- GA4 and Search Console provide aggregate reporting; they do not establish an
  individual customer-to-channel join by themselves.
- A submitted lead is not yet the same thing as a qualified opportunity.
- Historical Google Ads accounts must remain separately labeled and excluded
  from current-account scorecards by default.
- Enhanced conversions and offline conversion imports require a reviewed
  consent/customer-data policy and should be enabled only after event
  deduplication and lead-stage definitions are verified.

## Pizza on Smith release state

The storefront/feed integration shares the current product catalog and prices,
but the catalog does not define a per-drop order window, pickup date/time, or
capacity. Do not describe inventory as limited, imply a closing deadline, or
send timed drop reminders until those facts are sourced and enforced by both
the storefront and server-side checkout. Existing pickup is described as
Tuesdays; no specific time is configured.

## Drop commerce and re-engagement channels

Treat product discovery and permissioned follow-up as part of the storefront
release, not as afterthought campaigns:

- **Google:** keep product feed and product-specific checkout links generated
  from the same catalog and pricing source as checkout. Pizza on Smith's feed
  is pickup-only; Merchant Center pickup/location setup and feed diagnostics
  remain operator-side launch gates. Google's checkout annotation is optional
  and device/algorithm dependent, not a guaranteed placement.
- **Instagram/Meta:** `/api/feeds/meta-commerce.csv` supplies Pizza on Smith's
  pickup-only products from the storefront catalog for a Meta scheduled catalog
  feed. Configure that URL in the intended Commerce Manager catalog; product
  tagging and website checkout remain account-eligibility/configuration
  dependent. Native in-app checkout is not assumed. Meta Pixel/CAPI and
  retargeting are not implemented; add only with a reviewed consent policy,
  deduplicated purchase events, and account-side approval.
- **SMS/MMS:** use a separate, explicit opt-in for the stated brand and
  re-engagement purpose, store consent provenance and opt-outs, and suppress
  sends against that state. Transactional order updates are not marketing
  consent. The current Brevo Hub campaign path is not a Pizza on Smith consent
  flow; do not add checkout phone numbers to a marketing audience. Use clear
  sender identity, cadence, pickup/drop details, and STOP/HELP instructions.
- **iMessage:** do not promise blue-bubble delivery from an SMS number.
  Apple's Messages for Business is a separate customer-initiated service and
  onboarding path; ordinary brand outreach should be described as SMS/MMS.
- **Email and paid re-engagement:** Brevo remains the implemented email
  provider and maintains the existing email double-opt-in flow. Do not add
  Mailchimp as a second contact/consent source absent a deliberate migration.
  Google Ads and Meta Ads should optimize against deduplicated, consent-eligible
  purchases or qualified outcomes—not phone-number uploads by default.

**Release gates:** verify SMS sender/program registration, a purpose-specific
opt-in and auditable STOP handling before any marketing text; verify the
Merchant Center and Meta Commerce account configurations before promising
Google/Instagram placement. No customer-facing send or ad activation is part
of code implementation.
