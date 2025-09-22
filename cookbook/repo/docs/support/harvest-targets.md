# Expanded Cookbook Harvest Targets

## Library of Congress (LoC)
- API: `https://www.loc.gov/search/?q=…&fo=json`
- Use `provider.name`, `sourceResource.*` filters, `?fo=iiif` manifests (Cloudflare challenge may require cached access).

## MSU Feeding America
- Collection page: `https://d.lib.msu.edu/search?fq=RELS_EXT_isMemberOfCollection_uri_s%3Ainfo%5C%3Afedora/fa%5C%3Aroot`
- IIIF manifests at `https://d.lib.msu.edu/fa/{id}/manifest` (no auth required).
- HTML search endpoint returns 76 item IDs; API JSON endpoints require authentication.

## DPLA Provider Filters
- Base: `https://api.dp.la/v2/items`
- Filter by `provider.name=Recollection Wisconsin` or similar via `--provider` flag in harvester.

## Access-Gated Sources
- **American Antiquarian Society** (ContentDM): IIIF and REST endpoints return HTTP 403 without whitelisting.
- **State Historical Societies (MN/WI)**: provide ContentDM/OAI feeds; several require partner credentials.
- **Minnesota Historical Society**: OAI-PMH feeds available upon request.
- **Wisconsin Historical Society**: ContentDM search API accessible but may enforce rate limits; use institutional user agent.
