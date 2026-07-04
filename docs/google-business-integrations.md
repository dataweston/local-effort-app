# Google business integrations

The Brain has read-only ingestion for four Google systems:

| System | Route | Ledger events |
|---|---|---|
| Google Analytics 4 | `/api/brain/ga4/sync` | `web.traffic.daily` |
| Google Business Profile | `/api/brain/google-business-profile/sync` | `google.business_profile.current`, `google.business_profile.daily`, `google.business_profile.search_keywords` |
| Merchant Center | `/api/brain/google-merchant/sync` | `google.merchant.diagnostics.daily` |
| Google Ads | `/api/brain/google-ads/sync` | `google.ads.campaign.daily`, `google.ads.search_term.daily` |
| Search Console | `/api/brain/search-console/sync` | `google.search_console.daily` (reportType `query` \| `page` \| `query_page`) |

All sync routes accept GET for Vercel Cron and POST for an authenticated
manual run. They are read-only against Google. Brain writes are idempotent.

## Shared OAuth setup

Create one Google Cloud OAuth web client for the Google account that owns or
manages the Business Profile, Merchant Center, Ads, and GA4 property.

Enable these APIs in that Cloud project:

- Google Analytics Data API
- Google Business Profile Performance API
- Google My Business Account Management API
- Google My Business Business Information API
- Merchant API
- Google Ads API

Configure this authorized redirect URI:

```text
https://www.localeffortfood.com/api/brain/google/callback
```

Set these server-side environment variables in Vercel:

```text
GOOGLE_BUSINESS_CLIENT_ID=
GOOGLE_BUSINESS_CLIENT_SECRET=
GOOGLE_BUSINESS_OAUTH_STATE_SECRET=
```

The existing `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are used as fallbacks,
so a second OAuth client is not required. When reusing that client, add the new
Google business callback URI to its authorized redirect URIs.

`GOOGLE_BUSINESS_REDIRECT_URI` is optional. The server defaults to the exact
registered production callback:

```text
https://www.localeffortfood.com/api/brain/google/callback
```

`GOOGLE_BUSINESS_OAUTH_STATE_SECRET` should be a random secret. If omitted,
the server falls back to `BRAIN_ADMIN_KEY`.

Generate the authorization URL with an admin JWT or the Brain admin key:

```bash
curl -H "x-brain-admin-key: YOUR_KEY" \
  "https://www.localeffortfood.com/api/brain/google/auth?format=json"
```

Open the returned `authUrl` in a browser and complete the Google grant. The
callback stores the refresh token in `BrainApiToken` under
`google-business-integrations`.

The grant requests these scopes:

- `analytics.readonly`
- `business.manage`
- `content`
- `adwords`
- `webmasters.readonly` (added 2026-07-04 for Search Console — grants stored
  before then must be re-authorized via `/api/brain/google/auth`)

For local-only setup, `GOOGLE_BUSINESS_REFRESH_TOKEN` can supply an existing
refresh token instead of the stored database token.

## GA4

Required:

```text
GA4_PROPERTY_ID=
```

This is the numeric property ID, not measurement ID `G-P0Q3W8KEKY`.

GA4 can use the shared OAuth grant. It also supports dedicated service-account
credentials through either `GA4_SERVICE_ACCOUNT_JSON` or
`GA4_CLIENT_EMAIL` plus `GA4_PRIVATE_KEY`.

The Google identity must have Viewer access to the GA4 property. Daily runs
refresh the last three completed days because GA4 data can settle after initial
processing.

## Google Business Profile

The OAuth user must manage the listing. The sync normally discovers accessible
accounts and locations. To pin it to one listing:

```text
GOOGLE_BUSINESS_PROFILE_LOCATION_ID=
GOOGLE_BUSINESS_PROFILE_LOCATION_TITLE=
```

It captures Search and Maps impressions by device; website clicks, calls,
directions, conversations, bookings, food orders, and menu clicks; monthly
discovery keywords; and a current listing metadata snapshot.

If the enabled API shows quota `0`, request Google Business Profile API access.
Enabling the API alone does not guarantee usable quota.

## Merchant Center

Optional when OAuth exposes exactly one account; otherwise required:

```text
MERCHANT_CENTER_ACCOUNT_ID=
```

The OAuth user must have access to the Merchant Center account, and the Cloud
project must be registered for Merchant API use.

The sync intentionally diagnoses rather than repairs. Its daily snapshot
contains account-level issues and remediation links, plus active, pending,
disapproved, and expiring product counts and aggregate item-level issues.

Use `/api/brain/google-merchant/sync` after authorization to establish why the
account is not working. Do not automate corrective mutations until the returned
policy/account issues have been reviewed.

## Google Ads

Required:

```text
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
```

Optional for a manager-account setup:

```text
GOOGLE_ADS_LOGIN_CUSTOMER_ID=
```

Customer IDs may contain hyphens in configuration; the integration normalizes
them. If the OAuth identity exposes exactly one Ads customer,
`GOOGLE_ADS_CUSTOMER_ID` may be omitted.

The default API version is `v24`. Override only during a controlled API upgrade:

```text
GOOGLE_ADS_API_VERSION=v24
```

Daily reports ingest campaign impressions, clicks, spend, conversions, value,
and actual search terms. The integration never creates or changes campaigns.

## Schedules and freshness

| UTC | Job |
|---:|---|
| 04:00 | GA4 |
| 04:15 | Business Profile |
| 04:30 | Merchant Center |
| 04:45 | Google Ads |
| 05:00 | Search Console |
| 05:15 | Graph projection |

## Search Console

`backend/api/brain/searchConsoleSync.js` pulls one Pacific calendar day at a
time for query totals, page totals, and query-to-page pairs (default property
`sc-domain:localeffortfood.com`, override with `SEARCH_CONSOLE_SITE_URL`).
Search Console returns top rows rather than an exhaustive query log, so ledger
payloads explicitly carry `dataCompleteness: "top_rows"` and truncated-report
status. Data lags ~2 days, so daily runs refresh the last 5 completed days.
Requires the `webmasters.readonly` scope on the shared grant and Search Console
access for the OAuth identity.

All jobs are included in `/api/brain/jobs/freshness` with a 24-hour SLA.
Until credentials and account grants are complete, the sync jobs will correctly
show as stale or errored.

## Graph projection

The syncs write ledger events only. `backend/api/brain/googleGraphProjector.js`
(`/api/brain/google-projection/run`, job `google-graph-projection`) projects the
durable facts into the graph on a nightly cron:

- One `Channel` entity per observed GA4 default channel group
  (`Web: Organic Search`, `Web: Direct`, …) plus
  `Website (localeffortfood.com)`, each carrying a recomputed
  `properties.webTraffic` rollup (all-time + last-28d, top sources/pages).
- `Offer|BusinessLine -[USES_CHANNEL]-> Website` edges (Products use
  `LISTED_ON`) for landing pages in the curated `LANDING_PATH_MAP`. Unmapped
  pages are reported in the run output (`unmappedReport`) — that report is the
  worklist for extending the map. Targets are matched against existing
  entities, never minted.
- `Channel -[DEMAND_SIGNAL_FOR]-> Dish|Product|Offer|Occasion|BusinessLine`
  edges from search terms (Ads search terms, GBP discovery keywords, Search
  Console queries). Terms match deterministically: curated business vocabulary
  (`DEMAND_KEYWORD_MAP`) plus whole-phrase entity-name/alias containment.
  Unmatched high-volume terms land in `unmatchedTermReport`.
- One `Campaign` entity per Google Ads campaign (keyed on campaign id, names
  are mutable) with a `properties.adsPerformance` rollup and a
  `USES_CHANNEL` edge to the `Google Ads` channel. Dormant until the Ads
  account produces `google.ads.campaign.daily` events.

Daily metric series stay in the ledger. Re-running is idempotent: rollups are
recomputed from the ledger, edges upserted on
(src, dst, relType, sourceType=`google_graph_projection`). Business Profile
and Merchant events are not projected yet — add those projections once real
payloads exist to test against.

## Organic search gap

Business Profile explains local Search/Maps discovery, but it does not explain
organic website ranking, indexing, or query performance. The Search Console
sync above closes that gap — it is gated only on re-authorizing the shared
grant with the `webmasters.readonly` scope.
