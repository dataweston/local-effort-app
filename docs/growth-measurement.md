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

## Public crawl hygiene

`src/config/routes.js` is the public route contract. `tools/static-export.js`
combines its indexable routes with public blog posts and active products from
Sanity, renders their HTML, and writes the authoritative
`https://www.localeffortfood.com/sitemap.xml`. Public CMS snapshots embedded in
HTML contain public presentation facts only; member/paid posts
are excluded using the existing publishing access rules. A configured CMS fetch
failure fails export rather than advertising empty dynamic pages.

`tools/sync-vercel-routes.js` consumes the generated dynamic-path manifest and
maps both static and dynamic pages to their prerendered documents. Trailing
slashes and retired aliases redirect to final canonical URLs. Query parameters
and fragments do not create separate canonical documents. Keep redirects for
retired pages, but never list redirect sources or intentional noindex pages in
the sitemap. `/api/sitemap.xml` is a compatibility redirect, not a second feed.
Venue placeholder pages retain noindex until their existing publishability
contract is satisfied; member investment information remains noindex.

### October 13, 2026 Ahrefs audit evaluation

Owner: site operator. As of: October 13, 2026. Review on the first post-deployment
Ahrefs crawl of project **9538697**; these findings are a local remediation
snapshot, not a claim that the hosted crawl counts have cleared.

| Audit finding | Relevance and response |
| --- | --- |
| Sitemap redirects, competing sitemaps, missing indexable URLs | Real canonical-host/feed mismatch. Use one www sitemap, generated public CMS routes, and explicit noindex exclusions. |
| Duplicate pages/no canonical, no outgoing links, missing OG/X | Real empty-shell problem on dynamic products. Render product/blog facts, canonical and social metadata; product pages link to the shop. |
| Missing H1 and metadata length warnings | Add missing initial-page headings and improve useful service/list metadata. Do not pad product descriptions, truncate authored CMS copy blindly, or treat character thresholds as ranking requirements. |
| Low word count and only one incoming dofollow link | Evaluate the page's job. Product facts, a booking interface, and a visual storefront do not need artificial prose or unrelated links. Products have shop/catalogue discovery paths. |
| Oversized images | Preserve photos/crops and animated artwork, use smaller WebP derivatives, and bound Sanity/Cloudinary originals. Verify actual served URLs, not just source-file sizes. |
| Schema.org validation errors | `unitText` belongs on `UnitPriceSpecification`, not generic `PriceSpecification`. Separate the per-guest rate from the total party minimum; retain valid `FoodService` and return-policy fields. |
| Broken link and external 4XX | Confirmed the Psyche-specific EVA URL returns 404; link to the working official EVA resource with a general informational label, not a product-specific verification claim. |
| Internal/external redirects and redirect chain | Link directly to final external destinations where verified; normalize public slash variants and retired aliases. The platform-level apex-to-www hop is outside repository routing. |
| Redirected pages without incoming links; HTTP-to-HTTPS | Expected for retired aliases and transport/canonical-host redirects. Do not create internal links to obsolete pages just to suppress warnings. |
| Noindex / noindex-follow | Intentional for internal or unpublished information. Preserve boundaries and exclude those pages from sitemap, rather than removing noindex. |
| IndexNow, changed H1, SERP title mismatch | Informational, not implementation defects by themselves. IndexNow is optional; a changed heading is expected after edits; search engines may rewrite SERP titles. |

Local validation exercises the production bundle/export/route-sync/copy path,
the existing public-context feed contract, and generated HTML before JavaScript.
Deployment and an authenticated URL-level Ahrefs recrawl are still required to
attribute every original affected row. The original report/API credentials were
unavailable during implementation. A CMS-authored press resource still points
at retired `/gallery`; correct that source content in Sanity rather than adding
a presentation-only link substitution or resurrecting the retired route.

This remediation does not alter checkout, fulfillment, payment verification,
or confirmation delivery and does not authorize deployment or customer sends.

Verification recorded on October 13: production bundle/export/sync/copy passed;
the existing public-context tests passed **3/3**. All **44** sitemap documents
passed generated-HTML checks for one H1, one matching canonical, descriptions,
OG/X metadata, outgoing links, and absence of noindex. **238** JSON-LD blocks
parsed, including **7** correctly typed unit-price specifications; this is not
a substitute for the authenticated Ahrefs semantic-validation report.
The export includes **21** public CMS snapshots (one post, twenty products).

A local preview returned HTTP 200 for all 44 sitemap URLs and direct canonical
308s for their 43 non-root slash variants. Browser checks covered product facts
and shop navigation, booking controls without submission, the public article,
and optimized shop/candlelight artwork. The article's API refresh supplied an
apex canonical; the browser now retains the www canonical and matching OG URL
after that refresh. Five optimized artwork sources total **1,337,746 bytes**
versus **17,135,897 bytes** for the originals (92.2% smaller); the animation
retains its twelve frames and loop setting.

