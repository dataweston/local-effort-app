/**
 * Google ledger events → graph projector.
 *
 * The Google syncs (ga4Sync, googleAdsSync, googleBusinessProfileSync,
 * googleMerchantSync) write daily LedgerEvents but nothing consumed them — the
 * same "lands in ledger, never reaches the graph" gap the order projector
 * closed for Square. This module projects the DURABLE facts:
 *
 *   Channel entities        one per observed GA4 default channel group
 *                           ("Web: Organic Search", "Web: Direct", …) plus a
 *                           "Website (localeffortfood.com)" channel, each
 *                           carrying a recomputed properties.webTraffic rollup
 *                           (all-time + last-28d sessions/users, top sources).
 *   Offer|BusinessLine -[USES_CHANNEL]-> Website channel
 *                           for landing pages that map to a known offer via
 *                           the curated LANDING_PATH_MAP. Edge metadata carries
 *                           the per-page session rollup. Unmapped pages are
 *                           reported, never minted.
 *   Campaign -[USES_CHANNEL]-> "Google Ads" channel
 *                           one Campaign entity per Google Ads campaign id,
 *                           with a recomputed properties.adsPerformance rollup.
 *                           (Dormant until google.ads.campaign.daily events
 *                           exist — the Ads account has no recent activity.)
 *
 * Daily numbers stay in the ledger; the graph gets entities, edges, and
 * rollups only. Everything is recomputed from the ledger on each run, and
 * edges are upserted keyed on (srcId, dstId, relType,
 * sourceType='google_graph_projection'), so re-running is idempotent.
 *
 * GBP and Merchant events are NOT projected yet: neither source has produced
 * data (account-side blockers), so their payload shapes are unverified. Add
 * their projections when real events exist to test against.
 *
 * Routes:
 *   POST/GET /api/brain/google-projection/run   (admin | cron | BRAIN_ADMIN_KEY)
 *     body/query: dryRun (default false)
 */

const crypto = require('crypto');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { getPrisma } = require('../utils/prisma');
const { canonicalName, writeLedgerEvent } = require('./ledger');
const { validateRelationship } = require('./relationshipDictionary');
const { withJobRun } = require('./jobRuns');

const verifyAdminRequest = createAdminVerifier();

const WEBSITE_CHANNEL_NAME = 'Website (localeffortfood.com)';
const ADS_CHANNEL_NAME = 'Google Ads';
const GBP_CHANNEL_NAME = 'Google Business Profile';
const LAST_WINDOW_DAYS = 28;
const INTERNAL_LANDING_PREFIXES = [
  '/admin',
  '/auth',
  '/brain',
  '/campaigns',
  '/catherine-schedule',
  '/hub',
  '/inbox',
  '/native-mobile-hub',
  '/portal',
  '/weekly-order',
  '/weeklydemo',
];

// Landing path → existing Offer/BusinessLine/Product. Curated and
// conservative: only paths that unambiguously belong to one offer. Internal/app
// surfaces (/hub, /brain, /weeklydemo, …) are deliberately absent. Targets are
// matched by exact name against EXISTING entities — a missing target is
// counted, never minted (same founder rule as the order projector).
// relType defaults to USES_CHANNEL; Products use LISTED_ON (dictionary src
// lists differ).
const LANDING_PATH_MAP = {
  '/meal-prep-intake': { entityType: 'Offer', name: 'Weekly Meal Prep' },
  '/meal-prep': { entityType: 'Offer', name: 'Weekly Meal Prep' },
  '/book': { entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  '/tiny-diner': { entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  '/chez-garage': { entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  '/june': { entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  '/julydinner': { entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  '/pizza-party': { entityType: 'BusinessLine', name: 'Local Effort Pizza' },
  '/pizza': { entityType: 'BusinessLine', name: 'Local Effort Pizza' },
  '/partners/happy-monday': { entityType: 'BusinessLine', name: 'Wholesale & Bread' },
  '/happymonday': { entityType: 'BusinessLine', name: 'Wholesale & Bread' },
  '/sale': { entityType: 'Offer', name: 'Seasonal Food Drops & Preorders' },
  '/psyche': { entityType: 'Product', name: 'Psyche Olive Oil', relType: 'LISTED_ON' },
};

function normalizeLandingPath(value) {
  let path = String(value || '').trim().toLowerCase();
  if (!path || path === '(not set)') return null;
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q);
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

function isInternalLandingPath(path) {
  return INTERNAL_LANDING_PREFIXES.some((prefix) =>
    path === prefix || path.startsWith(`${prefix}/`)
  );
}

function emptyTrafficTotals() {
  return { sessions: 0, totalUsers: 0, newUsers: 0, engagedSessions: 0 };
}

function addTraffic(totals, payload) {
  totals.sessions += Number(payload.sessions || 0);
  totals.totalUsers += Number(payload.totalUsers || 0);
  totals.newUsers += Number(payload.newUsers || 0);
  totals.engagedSessions += Number(payload.engagedSessions || 0);
}

// find-or-create a synthetic Channel by exact canonicalName. Channels are the
// one entity type this projector mints — they are stable infrastructure nodes,
// not directory records, so the self-identity guard doesn't apply.
async function getOrCreateChannel(prisma, name, role, cache, stats) {
  const key = canonicalName(name);
  if (cache.channels.has(key)) return cache.channels.get(key);
  let ch = await prisma.brainEntity.findFirst({
    where: { entityType: 'Channel', tombstonedAt: null, canonicalName: key },
    select: { id: true, name: true, properties: true },
  });
  if (!ch) {
    ch = await prisma.brainEntity.create({
      data: {
        entityType: 'Channel',
        name,
        canonicalName: key,
        status: 'active',
        properties: { synthetic: true, role },
      },
      select: { id: true, name: true, properties: true },
    });
    stats.channelsCreated++;
  }
  cache.channels.set(key, ch);
  return ch;
}

// Overwrite one properties subkey, preserving everything else on the entity.
async function setEntityProperty(prisma, entity, propKey, value) {
  const properties = { ...(entity.properties || {}), [propKey]: value };
  await prisma.brainEntity.update({ where: { id: entity.id }, data: { properties } });
  entity.properties = properties;
}

// Upsert one durable rollup edge keyed on (src, dst, relType, this projector).
// Unlike order projection (one edge per ledger event), a rollup edge is a
// single assertion whose metadata is refreshed each run.
async function upsertRollupEdge(prisma, { srcId, srcType, dstId, dstType, relType, metadata, validFrom }, stats) {
  const existing = await prisma.brainAssertion.findFirst({
    where: { srcId, dstId, relType, sourceType: 'google_graph_projection', retractedAt: null },
    select: { id: true },
  });
  if (existing) {
    await prisma.brainAssertion.update({ where: { id: existing.id }, data: { metadata } });
    stats.edgesUpdated++;
    return;
  }
  const validation = validateRelationship({ relType, srcType, dstType, srcId, dstId });
  await prisma.brainAssertion.create({
    data: {
      srcId,
      dstId,
      relType,
      metadata: {
        ...metadata,
        ...(validation.warnings.length ? { relationshipWarnings: validation.warnings } : {}),
      },
      validFrom,
      knownFrom: new Date(),
      confidence: 1.0,
      sourceType: 'google_graph_projection',
      sourceId: null,
      createdBy: 'google_graph_projector',
      provisional: false,
    },
  });
  stats.edgesWritten++;
}

// ── GA4 projection ────────────────────────────────────────────────────────────

async function projectGa4(prisma, { dryRun, cache, stats }) {
  const events = await prisma.ledgerEvent.findMany({
    where: { eventType: 'web.traffic.daily', tombstonedAt: null },
    select: { occurredAt: true, payload: true },
    orderBy: { occurredAt: 'asc' },
  });
  stats.ga4EventsSeen = events.length;
  if (!events.length) return;

  const windowStart = new Date(Date.now() - LAST_WINDOW_DAYS * 86_400_000);

  // channelGroup → { totals, recent, sources: Map(source → sessions), firstSeen, lastSeen }
  const groups = new Map();
  // normalizedPath → { totals, recent, firstSeen, lastSeen }
  const pages = new Map();
  const siteTotals = { totals: emptyTrafficTotals(), recent: emptyTrafficTotals(), firstSeen: null, lastSeen: null };

  for (const ev of events) {
    const pl = ev.payload || {};
    const inWindow = ev.occurredAt >= windowStart;
    if (pl.reportType === 'acquisition') {
      const group = String(pl.sessionDefaultChannelGroup || 'Unassigned').trim() || 'Unassigned';
      let rec = groups.get(group);
      if (!rec) {
        rec = { totals: emptyTrafficTotals(), recent: emptyTrafficTotals(), sources: new Map(), firstSeen: ev.occurredAt, lastSeen: ev.occurredAt };
        groups.set(group, rec);
      }
      addTraffic(rec.totals, pl);
      if (inWindow) addTraffic(rec.recent, pl);
      rec.lastSeen = ev.occurredAt;
      const source = String(pl.sessionSource || '').trim();
      if (source) rec.sources.set(source, (rec.sources.get(source) || 0) + Number(pl.sessions || 0));
    } else if (pl.reportType === 'landing_page') {
      const path = normalizeLandingPath(pl.landingPage);
      if (!path || isInternalLandingPath(path)) {
        stats.internalLandingEventsExcluded++;
        continue;
      }
      addTraffic(siteTotals.totals, pl);
      if (inWindow) addTraffic(siteTotals.recent, pl);
      if (!siteTotals.firstSeen) siteTotals.firstSeen = ev.occurredAt;
      siteTotals.lastSeen = ev.occurredAt;
      let rec = pages.get(path);
      if (!rec) {
        rec = { totals: emptyTrafficTotals(), recent: emptyTrafficTotals(), firstSeen: ev.occurredAt, lastSeen: ev.occurredAt };
        pages.set(path, rec);
      }
      addTraffic(rec.totals, pl);
      if (inWindow) addTraffic(rec.recent, pl);
      rec.lastSeen = ev.occurredAt;
    }
  }

  // Channel-group entities with recomputed traffic rollups.
  for (const [group, rec] of groups) {
    stats.channelGroupsSeen++;
    if (dryRun) continue;
    const channel = await getOrCreateChannel(prisma, `Web: ${group}`, 'ga4-channel-group', cache, stats);
    const topSources = [...rec.sources.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, sessions]) => ({ source, sessions }));
    await setEntityProperty(prisma, channel, 'webTraffic', {
      source: 'ga4',
      ga4ChannelGroup: group,
      firstSeen: rec.firstSeen.toISOString().slice(0, 10),
      lastSeen: rec.lastSeen.toISOString().slice(0, 10),
      totals: rec.totals,
      [`last${LAST_WINDOW_DAYS}d`]: rec.recent,
      topSources,
      updatedAt: new Date().toISOString(),
    });
    stats.channelsRolledUp++;
  }

  if (!siteTotals.lastSeen) return;

  // Landing pages → Offer/BusinessLine USES_CHANNEL edges. Target mapping and
  // the unmapped-page report run in dry runs too; only writes are gated.
  // targetKey → { target, pages: [{ path, ...rollup }] }
  const byTarget = new Map();
  for (const [path, rec] of pages) {
    const mapping = LANDING_PATH_MAP[path];
    if (!mapping) {
      if (rec.totals.sessions > 0) stats.unmappedPages.set(path, (stats.unmappedPages.get(path) || 0) + rec.totals.sessions);
      continue;
    }
    const targetKey = `${mapping.entityType}:${mapping.name}`;
    let entry = byTarget.get(targetKey);
    if (!entry) {
      const target = await prisma.brainEntity.findFirst({
        where: { entityType: mapping.entityType, tombstonedAt: null, canonicalName: canonicalName(mapping.name) },
        select: { id: true, name: true, entityType: true },
      });
      if (!target) {
        stats.missingTargets.push(targetKey);
        byTarget.set(targetKey, { target: null });
        continue;
      }
      entry = { target, relType: mapping.relType || 'USES_CHANNEL', pages: [], totals: emptyTrafficTotals(), recent: emptyTrafficTotals(), firstSeen: rec.firstSeen, lastSeen: rec.lastSeen };
      byTarget.set(targetKey, entry);
    }
    if (!entry.target) continue;
    entry.pages.push({ path, sessions: rec.totals.sessions, [`sessions${LAST_WINDOW_DAYS}d`]: rec.recent.sessions });
    addTraffic(entry.totals, rec.totals);
    addTraffic(entry.recent, rec.recent);
    if (rec.firstSeen < entry.firstSeen) entry.firstSeen = rec.firstSeen;
    if (rec.lastSeen > entry.lastSeen) entry.lastSeen = rec.lastSeen;
  }

  if (dryRun) {
    stats.offersLinked = [...byTarget.values()].filter((e) => e.target).length;
    return;
  }

  // Website channel rollup (landing-page report totals).
  const site = await getOrCreateChannel(prisma, WEBSITE_CHANNEL_NAME, 'website', cache, stats);
  const topPages = [...pages.entries()]
    .sort((a, b) => b[1].totals.sessions - a[1].totals.sessions)
    .slice(0, 15)
    .map(([path, rec]) => ({ path, sessions: rec.totals.sessions }));
  await setEntityProperty(prisma, site, 'webTraffic', {
    source: 'ga4',
    firstSeen: siteTotals.firstSeen.toISOString().slice(0, 10),
    lastSeen: siteTotals.lastSeen.toISOString().slice(0, 10),
    totals: siteTotals.totals,
    [`last${LAST_WINDOW_DAYS}d`]: siteTotals.recent,
    topPages,
    updatedAt: new Date().toISOString(),
  });
  stats.channelsRolledUp++;

  for (const entry of byTarget.values()) {
    if (!entry.target) continue;
    await upsertRollupEdge(prisma, {
      srcId: entry.target.id,
      srcType: entry.target.entityType,
      dstId: site.id,
      dstType: 'Channel',
      relType: entry.relType,
      validFrom: entry.firstSeen,
      metadata: {
        source: 'ga4_landing_pages',
        landingPages: entry.pages.sort((a, b) => b.sessions - a.sessions),
        sessionsTotal: entry.totals.sessions,
        [`sessions${LAST_WINDOW_DAYS}d`]: entry.recent.sessions,
        firstSeen: entry.firstSeen.toISOString().slice(0, 10),
        lastSeen: entry.lastSeen.toISOString().slice(0, 10),
      },
    }, stats);
    stats.offersLinked++;
  }
}

// ── Search-term demand projection (Phase 2) ───────────────────────────────────
//
// Search terms are customer language. Three sources feed one mapper:
//   google.ads.search_term.daily          (one event per term/day)
//   google.business_profile.search_keywords (one event per month, keywords[])
//   google.search_console.daily            (reportType 'query')
// Terms match existing entities deterministically — curated business vocabulary
// first, then whole-phrase entity-name/alias containment. Matched demand becomes
// Channel -[DEMAND_SIGNAL_FOR]-> entity rollup edges; unmatched high-volume
// terms are reported (the demand worklist), never minted.

// Curated business vocabulary → target entity. Longest-phrase specificity is
// handled by matching ALL contained keywords and deduping targets.
const DEMAND_KEYWORD_MAP = [
  { phrase: 'meal prep', entityType: 'Offer', name: 'Weekly Meal Prep' },
  { phrase: 'meal delivery', entityType: 'Offer', name: 'Weekly Meal Prep' },
  { phrase: 'meal service', entityType: 'Offer', name: 'Weekly Meal Prep' },
  { phrase: 'wedding', entityType: 'Offer', name: 'Wedding Catering' },
  { phrase: 'corporate lunch', entityType: 'Offer', name: 'Corporate Lunch' },
  { phrase: 'corporate catering', entityType: 'Offer', name: 'Corporate Lunch' },
  { phrase: 'catering', entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  { phrase: 'caterer', entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  { phrase: 'private chef', entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  { phrase: 'personal chef', entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  { phrase: 'private dinner', entityType: 'BusinessLine', name: 'Private Dinners & Events' },
  { phrase: 'pizza', entityType: 'BusinessLine', name: 'Local Effort Pizza' },
  { phrase: 'sourdough', entityType: 'BusinessLine', name: 'Wholesale & Bread' },
  { phrase: 'bread', entityType: 'BusinessLine', name: 'Wholesale & Bread' },
  { phrase: 'olive oil', entityType: 'Product', name: 'Psyche Olive Oil' },
  { phrase: 'farmers market', entityType: 'BusinessLine', name: 'Farmers Market' },
];

function normalizeTerm(value) {
  const t = String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return !t || t === '(not set)' ? null : t;
}

function phraseInTerm(phrase, term) {
  // whole-word containment with plural tolerance ("caterers" matches "caterer")
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\W)${esc}s?($|\\W)`).test(term);
}

// Match one search term to entity targets. Returns [{entityType, name}].
// Exported for tests: pure given the (curated map + entity name index) inputs.
function matchSearchTerm(term, entityNameIndex) {
  const targets = new Map();
  for (const kw of DEMAND_KEYWORD_MAP) {
    if (phraseInTerm(kw.phrase, term)) targets.set(`${kw.entityType}:${kw.name}`, { entityType: kw.entityType, name: kw.name });
  }
  // Generic containment against existing entity names/aliases (≥5 chars, whole
  // phrase) — catches dish/product-specific searches the curated map can't.
  for (const [phrase, target] of entityNameIndex) {
    if (phrase.length < 5) continue;
    if (phraseInTerm(phrase, term)) targets.set(`${target.entityType}:${target.name}`, target);
  }
  return [...targets.values()];
}

// name/alias (lowercased) → { entityType, name }. Dishes/Products/Offers/
// Occasions/Ingredients only — matching a Vendor or Customer name in a search
// term would be noise.
async function buildEntityNameIndex(prisma) {
  const index = new Map();
  const entities = await prisma.brainEntity.findMany({
    where: { entityType: { in: ['Dish', 'Product', 'Offer', 'Occasion', 'Ingredient'] }, tombstonedAt: null },
    select: { entityType: true, name: true, aliases: { select: { alias: true } } },
  });
  for (const e of entities) {
    const target = { entityType: e.entityType, name: e.name };
    const nm = normalizeTerm(e.name);
    if (nm) index.set(nm, target);
    for (const a of e.aliases) {
      const al = normalizeTerm(a.alias);
      if (al && !al.includes('@')) index.set(al, target);
    }
  }
  return index;
}

async function projectSearchDemand(prisma, { dryRun, cache, stats }) {
  // channel+term → metrics. Keep sources separate so the same phrase observed
  // in Ads and organic search does not copy the combined volume onto both
  // channel edges.
  const terms = new Map();
  const seen = (term, channelName, impressions, clicks, at) => {
    const t = normalizeTerm(term);
    if (!t) return;
    const key = `${channelName}\u001f${t}`;
    let rec = terms.get(key);
    if (!rec) {
      rec = { term: t, channelName, impressions: 0, clicks: 0, firstSeen: at, lastSeen: at };
      terms.set(key, rec);
    }
    rec.impressions += Number(impressions || 0);
    rec.clicks += Number(clicks || 0);
    if (at < rec.firstSeen) rec.firstSeen = at;
    if (at > rec.lastSeen) rec.lastSeen = at;
  };

  const adsTerms = await prisma.ledgerEvent.findMany({
    where: { eventType: 'google.ads.search_term.daily', tombstonedAt: null },
    select: { occurredAt: true, payload: true },
  });
  for (const ev of adsTerms) {
    seen(ev.payload?.searchTerm, ADS_CHANNEL_NAME, ev.payload?.impressions, ev.payload?.clicks, ev.occurredAt);
  }

  const gbpKeywords = await prisma.ledgerEvent.findMany({
    where: { eventType: 'google.business_profile.search_keywords', tombstonedAt: null },
    select: { occurredAt: true, payload: true },
  });
  for (const ev of gbpKeywords) {
    for (const kw of ev.payload?.keywords || []) {
      // below-privacy-threshold keywords report threshold instead of a value
      seen(kw.keyword, GBP_CHANNEL_NAME, kw.impressions ?? kw.threshold, 0, ev.occurredAt);
    }
  }

  const scQueries = await prisma.ledgerEvent.findMany({
    where: { eventType: 'google.search_console.daily', tombstonedAt: null },
    select: { occurredAt: true, payload: true },
  });
  for (const ev of scQueries) {
    if (ev.payload?.reportType !== 'query') continue;
    seen(ev.payload?.query, 'Web: Organic Search', ev.payload?.impressions, ev.payload?.clicks, ev.occurredAt);
  }

  stats.searchTermsSeen = new Set([...terms.values()].map((rec) => rec.term)).size;
  if (!terms.size) return;

  const entityNameIndex = await buildEntityNameIndex(prisma);

  // channelName → targetKey → { target?, terms: [...], impressions, clicks, firstSeen, lastSeen }
  const byChannelTarget = new Map();
  const targetCache = new Map();
  for (const rec of terms.values()) {
    const matches = matchSearchTerm(rec.term, entityNameIndex);
    if (!matches.length) {
      if (rec.impressions > 0) {
        stats.unmatchedTerms.set(
          rec.term,
          (stats.unmatchedTerms.get(rec.term) || 0) + rec.impressions
        );
      }
      continue;
    }
    for (const m of matches) {
      const targetKey = `${m.entityType}:${m.name}`;
      if (!targetCache.has(targetKey)) {
        targetCache.set(targetKey, await prisma.brainEntity.findFirst({
          where: { entityType: m.entityType, tombstonedAt: null, canonicalName: canonicalName(m.name) },
          select: { id: true, name: true, entityType: true },
        }));
      }
      const target = targetCache.get(targetKey);
      if (!target) continue;
      const chKey = `${rec.channelName}\u001f${targetKey}`;
      let entry = byChannelTarget.get(chKey);
      if (!entry) {
        entry = {
          channelName: rec.channelName,
          target,
          terms: [],
          impressions: 0,
          clicks: 0,
          firstSeen: rec.firstSeen,
          lastSeen: rec.lastSeen,
        };
        byChannelTarget.set(chKey, entry);
      }
      entry.terms.push({ term: rec.term, impressions: rec.impressions, clicks: rec.clicks });
      entry.impressions += rec.impressions;
      entry.clicks += rec.clicks;
      if (rec.firstSeen < entry.firstSeen) entry.firstSeen = rec.firstSeen;
      if (rec.lastSeen > entry.lastSeen) entry.lastSeen = rec.lastSeen;
    }
  }

  stats.demandTargetsMatched = byChannelTarget.size;
  if (dryRun) return;

  for (const entry of byChannelTarget.values()) {
    const role = entry.channelName === ADS_CHANNEL_NAME ? 'google-ads'
      : entry.channelName === GBP_CHANNEL_NAME ? 'google-business-profile'
      : 'ga4-channel-group';
    const channel = await getOrCreateChannel(prisma, entry.channelName, role, cache, stats);
    await upsertRollupEdge(prisma, {
      srcId: channel.id,
      srcType: 'Channel',
      dstId: entry.target.id,
      dstType: entry.target.entityType,
      relType: 'DEMAND_SIGNAL_FOR',
      validFrom: entry.firstSeen,
      metadata: {
        source: 'google_search_terms',
        terms: entry.terms.sort((a, b) => b.impressions - a.impressions).slice(0, 12),
        termCount: entry.terms.length,
        impressionsTotal: entry.impressions,
        clicksTotal: entry.clicks,
        firstSeen: entry.firstSeen.toISOString().slice(0, 10),
        lastSeen: entry.lastSeen.toISOString().slice(0, 10),
      },
    }, stats);
    stats.demandEdgesUpserted++;
  }
}

// ── Google Ads projection ─────────────────────────────────────────────────────

async function projectGoogleAds(prisma, { dryRun, cache, stats }) {
  const events = await prisma.ledgerEvent.findMany({
    where: { eventType: 'google.ads.campaign.daily', tombstonedAt: null },
    select: { occurredAt: true, payload: true },
    orderBy: { occurredAt: 'asc' },
  });
  stats.adsEventsSeen = events.length;
  if (!events.length || dryRun) return;

  const windowStart = new Date(Date.now() - LAST_WINDOW_DAYS * 86_400_000);
  // campaignId → rollup
  const campaigns = new Map();
  for (const ev of events) {
    const pl = ev.payload || {};
    const id = String(pl.campaignId || pl.campaign?.id || '');
    const customerId = String(pl.customerId || '');
    if (!id) continue;
    const campaignKey = `${customerId || 'unknown'}:${id}`;
    let rec = campaigns.get(campaignKey);
    if (!rec) {
      rec = {
        campaignId: id,
        customerId: customerId || null,
        name: pl.campaignName || pl.campaign?.name || `Google Ads campaign ${id}`,
        status: pl.campaignStatus || pl.campaign?.status || null,
        channelType: pl.channelType || pl.advertisingChannelType || null,
        totals: { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 },
        recent: { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 },
        firstSeen: ev.occurredAt,
        lastSeen: ev.occurredAt,
      };
      campaigns.set(campaignKey, rec);
    }
    for (const bucket of [rec.totals, ...(ev.occurredAt >= windowStart ? [rec.recent] : [])]) {
      bucket.impressions += Number(pl.impressions || 0);
      bucket.clicks += Number(pl.clicks || 0);
      bucket.cost += Number(pl.cost || 0);
      bucket.conversions += Number(pl.conversions || 0);
      bucket.conversionsValue += Number(pl.conversionsValue || 0);
    }
    rec.lastSeen = ev.occurredAt;
    if (pl.campaignName) rec.name = pl.campaignName;
    if (pl.campaignStatus) rec.status = pl.campaignStatus;
  }
  if (!campaigns.size) return;

  const adsChannel = await getOrCreateChannel(prisma, ADS_CHANNEL_NAME, 'google-ads', cache, stats);

  for (const rec of campaigns.values()) {
    const id = rec.campaignId;
    // Campaign entities are keyed on the Google Ads campaign id, not the name —
    // names are mutable in the Ads UI (see the Square catalog-rename phantom).
    const identityFilters = [
      { properties: { path: ['googleAdsCampaignId'], equals: id } },
    ];
    if (rec.customerId) {
      identityFilters.push({
        properties: { path: ['googleAdsCustomerId'], equals: rec.customerId },
      });
    }
    let campaign = await prisma.brainEntity.findFirst({
      where: {
        entityType: 'Campaign',
        tombstonedAt: null,
        AND: identityFilters,
      },
      select: { id: true, name: true, properties: true },
    });
    if (!campaign) {
      campaign = await prisma.brainEntity.create({
        data: {
          entityType: 'Campaign',
          name: rec.name,
          canonicalName: canonicalName(rec.name),
          status: 'active',
          properties: {
            synthetic: true,
            role: 'google-ads-campaign',
            googleAdsCustomerId: rec.customerId,
            googleAdsCampaignId: id,
          },
        },
        select: { id: true, name: true, properties: true },
      });
      stats.campaignsCreated++;
    }
    const rollup = {
      source: 'google_ads',
      customerId: rec.customerId,
      status: rec.status,
      advertisingChannelType: rec.channelType,
      firstSeen: rec.firstSeen.toISOString().slice(0, 10),
      lastSeen: rec.lastSeen.toISOString().slice(0, 10),
      totals: rec.totals,
      [`last${LAST_WINDOW_DAYS}d`]: rec.recent,
      updatedAt: new Date().toISOString(),
    };
    await setEntityProperty(prisma, campaign, 'adsPerformance', rollup);
    await upsertRollupEdge(prisma, {
      srcId: campaign.id,
      srcType: 'Campaign',
      dstId: adsChannel.id,
      dstType: 'Channel',
      relType: 'USES_CHANNEL',
      validFrom: rec.firstSeen,
      metadata: {
        source: 'google_ads',
        customerId: rec.customerId,
        campaignId: id,
        impressionsTotal: rec.totals.impressions,
        clicksTotal: rec.totals.clicks,
        costTotal: rec.totals.cost,
        conversionsTotal: rec.totals.conversions,
        firstSeen: rollup.firstSeen,
        lastSeen: rollup.lastSeen,
      },
    }, stats);
    stats.campaignsRolledUp++;
  }
}

// ── run ───────────────────────────────────────────────────────────────────────

async function runGoogleGraphProjection({ logger, dryRun = false } = {}) {
  const prisma = getPrisma();
  const cache = { channels: new Map() };
  const stats = {
    dryRun,
    ga4EventsSeen: 0,
    adsEventsSeen: 0,
    channelGroupsSeen: 0,
    channelsCreated: 0,
    channelsRolledUp: 0,
    offersLinked: 0,
    campaignsCreated: 0,
    campaignsRolledUp: 0,
    searchTermsSeen: 0,
    demandTargetsMatched: 0,
    demandEdgesUpserted: 0,
    edgesWritten: 0,
    edgesUpdated: 0,
    missingTargets: [],
    unmappedPages: new Map(),
    unmatchedTerms: new Map(),
    internalLandingEventsExcluded: 0,
  };

  await projectGa4(prisma, { dryRun, cache, stats });
  await projectGoogleAds(prisma, { dryRun, cache, stats });
  await projectSearchDemand(prisma, { dryRun, cache, stats });

  // Unmapped-page report is the LANDING_PATH_MAP worklist; unmatched-term
  // report is the DEMAND_KEYWORD_MAP worklist (both top by volume).
  const unmappedReport = [...stats.unmappedPages.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([path, sessions]) => ({ path, sessions }));
  const unmatchedTermReport = [...stats.unmatchedTerms.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([term, impressions]) => ({ term, impressions }));
  const result = {
    ...stats,
    unmappedDistinct: stats.unmappedPages.size,
    unmappedReport,
    unmatchedTermsDistinct: stats.unmatchedTerms.size,
    unmatchedTermReport,
  };
  delete result.unmappedPages;
  delete result.unmatchedTerms;

  if (!dryRun) {
    await writeLedgerEvent({
      eventType: 'google.projection.run',
      source: 'google_graph_projector',
      actorType: 'system',
      payload: { ...result, unmappedReport: unmappedReport.slice(0, 10), unmatchedTermReport: unmatchedTermReport.slice(0, 10) },
    });
  }

  logger?.info(result, 'brain/google-projection: complete');
  return result;
}

// ── routes ────────────────────────────────────────────────────────────────────

function hasBrainAdminHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = process.env.BRAIN_ADMIN_KEY || '';
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

let running = false;
let lastRun = null;

function registerGoogleProjectionRoutes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      const isCron = req.headers['x-vercel-cron'] === '1'
        || String(req.headers['user-agent'] || '').startsWith('vercel-cron');
      if (!admin && !isCron && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'projection already running', lastRun });

      const dryRun = String(req.body?.dryRun ?? req.query?.dryRun) === 'true';

      running = true;
      const exec = dryRun
        ? runGoogleGraphProjection({ logger, dryRun })
        : withJobRun('google-graph-projection', () => runGoogleGraphProjection({ logger, dryRun }));
      exec
        .then((result) => { lastRun = { completedAt: new Date().toISOString(), dryRun, ...result }; })
        .catch((err) => logger?.error({ err }, 'brain/google-projection: run error'))
        .finally(() => { running = false; });

      return res.json({ ok: true, status: 'started', dryRun });
    } catch (err) {
      logger?.error({ err }, 'brain/google-projection: trigger error');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  app.post('/api/brain/google-projection/run', runHandler);
  app.get('/api/brain/google-projection/run', runHandler);

  // Last completed run (in-process; survives until the lambda recycles).
  app.get('/api/brain/google-projection/last', async (req, res) => {
    const admin = await verifyAdminRequest(req);
    if (!admin && !hasBrainAdminHeader(req)) return res.status(403).json({ error: 'admin only' });
    return res.json({ ok: true, lastRun });
  });
}

module.exports = { runGoogleGraphProjection, registerGoogleProjectionRoutes, matchSearchTerm, DEMAND_KEYWORD_MAP };
