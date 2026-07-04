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
