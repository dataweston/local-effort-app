# Discovery UX Enhancements

## Geo Faceted Navigation
- **Goal**: Help users pivot by state, county, city without textual guesswork.
- **Implementation Sketch**:
  - Extend `recipes` OpenSearch mapping with `location` as nested keyword (already populated via curation).
  - Create aggregation queries in the FastAPI layer (e.g., `/api/search?facets=state,county`).
  - In the Next.js search page, render facet chips and counts; preserve selections in the query string for shareable URLs.
  - Cache facet responses for 5 minutes using the existing API caching util to keep interactions snappy.

## Map Overlay
- **Goal**: Provide spatial context for county/city matches.
- **Implementation Sketch**:
  - Use a lightweight GeoJSON of MN/WI counties (TopoJSON converted to GeoJSON and stored under `public/data/counties.geojson`).
  - Extend `recipes` documents with `location.centroid` (lat/lon) when spatial hints are available; fall back to county centroids.
  - Integrate `react-leaflet` in the search page’s sidebar, highlighting polygons for selected facets and plotting available items.
  - Provide hover tooltips that summarize curator notes, digital availability, and call-to-action links.

## Saved Filter Shortcuts
- **Goal**: Let curators share curated slices (e.g., “Hennepin County Church Cookbooks”).
- **Implementation Sketch**:
  - Persist saved filters in Firestore / Supabase (whichever is already available for admin tooling) with schema `{ name, query, filters, notes }`.
  - Expose an authenticated management view under `/curation/saved-searches` with create/update/delete.
  - Surface saved searches on the public landing page as quick-start cards that deep link into `/search` with the appropriate query params.
  - Add API endpoint `/api/saved-searches` that returns public entries with minimal caching and includes highlight descriptions.

## Highlights + Curator Notes
- **Goal**: Carry the richer metadata from the ingest pipeline into the UI.
- **Implementation Sketch**:
  - Update the FastAPI search response to include highlight fragments from OpenSearch (`highlight` parameter on `title`/`description`).
  - Render highlight spans in result cards with subtle emphasis.
  - Surface `curation_notes` and `curation.score` in the detail drawer/panel with curator avatars sourced from the allowlist metadata.
  - Log highlight usage and interactions (click-throughs) in our analytics pipeline for feedback loops.

## Rollout Checklist
1. Normalize existing records to include `location.centroid` (backfill script reading county centroids CSV).
2. Add regression tests that assert facet aggregations return expected keys when ingest fixtures contain geo coverage.
3. Prototype the Leaflet map with mock data behind a feature flag, then connect to live API once performance is acceptable.
4. Define saved search permission model (public vs. private) and add end-to-end tests that verify only curated entries are exposed.
