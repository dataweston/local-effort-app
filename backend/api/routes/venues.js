// /api/venues — availability, iCal export, and external-calendar import for
// the two event spaces (FIREHOUSE, FOODIST).
//
// Facts come from src/config/venues.json, the same file the pages import, so a
// capacity or a slug cannot drift between the page and the API. That path is
// listed in vercel.json includeFiles so the serverless trace keeps it.
//
// Availability is FAIL-CLOSED, matching the finance-core paths: if the database
// is unreachable we return 503 rather than an empty calendar. An empty calendar
// reads as "every night is open", which is how you double-book a room.

const express = require('express');
const { prisma } = require('../utils/prisma');
const { buildCalendar, parseCalendar, groupIntoRanges, addDaysIso } = require('../utils/ical');

// Static relative require, not path.join: @vercel/node traces static requires
// and would miss a computed path. vercel.json includeFiles names it too, as a
// second line of defence.
const venuesData = require('../../../src/config/venues.json');

const VENUES = venuesData.venues;
const VENUE_BY_SLUG = new Map(VENUES.map((venue) => [venue.slug, venue]));

const ADMIN_TOKEN = process.env.SMALL_EVENTS_ADMIN_TOKEN || process.env.EVENTS_ADMIN_TOKEN || '';
const CRON_SECRET = process.env.CRON_SECRET || '';

// How far ahead a public calendar is allowed to be read. Bounded so a crawler
// cannot ask for ten years of rows, and long enough for wedding-season lead
// times.
const MAX_HORIZON_DAYS = 550;
const DEFAULT_HORIZON_DAYS = 365;

// Feeds are fetched server-side. A hostile or misconfigured feed URL should not
// be able to hang the function or hand us a gigabyte.
const FEED_TIMEOUT_MS = 10000;
const FEED_MAX_BYTES = 4 * 1024 * 1024;

const todayIso = () => new Date().toISOString().slice(0, 10);

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const normalizeString = (value, limit = 200) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, limit);
};

const ensurePrisma = (res) => {
  if (!prisma) {
    res.status(503).json({ error: 'database-unavailable' });
    return false;
  }
  return true;
};

const extractBearerToken = (req) => {
  const header = req.headers?.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : '';
};

const isAdmin = (req) => {
  if (!ADMIN_TOKEN) return false;
  const supplied = extractBearerToken(req) || normalizeString(req.headers?.['x-admin-token'], 200);
  return Boolean(supplied) && supplied === ADMIN_TOKEN;
};

// Vercel crons issue GET requests, so the sync endpoint has to accept one. It
// is gated on CRON_SECRET or the admin token rather than left open, because a
// sync triggers outbound fetches.
const isCronOrAdmin = (req) => {
  if (isAdmin(req)) return true;
  if (!CRON_SECRET) return false;
  const supplied =
    extractBearerToken(req) ||
    normalizeString(req.query?.secret, 200) ||
    normalizeString(req.headers?.['x-cron-secret'], 200);
  return Boolean(supplied) && supplied === CRON_SECRET;
};

/** Only the fields a public page may see; TODO placeholders are stripped. */
const publicVenue = (venue) => {
  const clean = (value) =>
    value == null || String(value).startsWith('TODO') ? null : value;
  return {
    slug: venue.slug,
    nickname: venue.nickname,
    name: clean(venue.name),
    accent: venue.accent,
    capacity: venue.capacity,
    areaSqFt: venue.areaSqFt,
    amenities: venue.amenities || [],
    hours: {
      earliest: clean(venue.hours?.earliest),
      latest: clean(venue.hours?.latest),
    },
    roomFeeCents: venue.roomFeeCents,
    eventTypes: venue.eventTypes || [],
    timezone: venue.timezone,
    verified: venue.verified === true,
  };
};

/**
 * Merge every source of truth for a venue's calendar into one status per day.
 *
 * Precedence, strongest first:
 *   booked   a confirmed hold, or an imported block from an external feed
 *   held     an unexpired 24h hold against an estimate
 *   blocked  an admin-closed date
 *   open     an admin-opened date
 * Days with no row at all are absent from the map; the UI renders those as
 * "enquire" rather than guessing, because an unmanaged date is not a promise.
 */
async function loadVenueCalendar({ slug, from, to, db = prisma }) {
  const [slots, blocks, holds] = await Promise.all([
    db.smallEventAvailability.findMany({
      where: { venue: slug, date: { gte: from, lte: to } },
    }),
    db.venueBlock.findMany({
      where: { venue: slug, date: { gte: from, lte: to } },
    }),
    db.smallEventHold.findMany({
      where: {
        OR: [{ status: 'confirmed' }, { status: 'held', holdUntil: { gt: new Date() } }],
      },
      include: { slot: true },
    }),
  ]);

  const days = new Map();
  const put = (date, status, extra = {}) => {
    days.set(date, { date, status, ...extra });
  };

  for (const slot of slots) {
    put(slot.date, slot.status === 'blocked' ? 'blocked' : 'open', {
      types: [slot.type],
      notes: slot.notes || '',
      source: slot.source,
    });
  }

  // Holds outrank admin status: a date can be open in the grid and still be
  // spoken for by someone mid-checkout.
  for (const hold of holds) {
    if (!hold.slot || hold.slot.venue !== slug) continue;
    const date = hold.slot.date;
    if (date < from || date > to) continue;
    put(date, hold.status === 'confirmed' ? 'booked' : 'held', {
      holdUntil: hold.holdUntil,
      source: 'hold',
    });
  }

  // Imported blocks are the strongest signal: the room is physically taken
  // according to a system the owner also operates.
  for (const block of blocks) {
    put(block.date, 'booked', { source: block.source, summary: block.summary || '' });
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Fetch one feed with a timeout and a size cap. */
async function fetchFeed(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.8' },
    });
    if (!response.ok) {
      throw new Error(`feed-http-${response.status}`);
    }
    const text = await response.text();
    if (text.length > FEED_MAX_BYTES) {
      throw new Error('feed-too-large');
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Pull one feed and replace that feed's blocks.
 *
 * Delete-then-insert inside a transaction: a cancelled reservation vanishes
 * from the upstream feed and has to vanish here, and only rows belonging to
 * this feed are touched, so one broken Airbnb link cannot wipe the Google
 * Calendar blocks sitting beside it.
 */
async function syncFeed(feed, { logger } = {}) {
  try {
    const text = await fetchFeed(feed.url);
    const events = parseCalendar(text);
    const horizonEnd = addDaysIso(todayIso(), MAX_HORIZON_DAYS);

    const rows = [];
    const seen = new Set();
    for (const event of events) {
      for (const day of event.days) {
        // Past days and absurd horizons are dropped rather than stored.
        if (day < todayIso() || day > horizonEnd) continue;
        if (seen.has(day)) continue;
        seen.add(day);
        rows.push({
          venue: feed.venue,
          date: day,
          source: feed.label,
          summary: event.summary || null,
          feedId: feed.id,
        });
      }
    }

    await prisma.$transaction([
      prisma.venueBlock.deleteMany({ where: { feedId: feed.id } }),
      ...(rows.length ? [prisma.venueBlock.createMany({ data: rows })] : []),
      prisma.venueCalendarFeed.update({
        where: { id: feed.id },
        data: {
          lastSyncAt: new Date(),
          lastStatus: 'ok',
          lastError: null,
          lastBlockCount: rows.length,
        },
      }),
    ]);

    return { feedId: feed.id, label: feed.label, status: 'ok', blocks: rows.length };
  } catch (error) {
    if (logger?.error) logger.error({ err: error, feedId: feed.id }, 'venue feed sync failed');
    // A failed sync leaves the previous blocks in place on purpose. Dropping
    // them because a fetch timed out would reopen dates that are actually
    // taken.
    await prisma.venueCalendarFeed
      .update({
        where: { id: feed.id },
        data: {
          lastSyncAt: new Date(),
          lastStatus: 'error',
          lastError: String(error?.message || error).slice(0, 400),
        },
      })
      .catch(() => {});
    return { feedId: feed.id, label: feed.label, status: 'error', error: String(error?.message || error) };
  }
}

function createVenuesRouter({ logger } = {}) {
  const router = express.Router();

  const resolveVenue = (req, res) => {
    const venue = VENUE_BY_SLUG.get(normalizeString(req.params.slug, 40));
    if (!venue) {
      res.status(404).json({ error: 'venue-not-found' });
      return null;
    }
    return venue;
  };

  // ── Public ────────────────────────────────────────────────────────────

  router.get('/', (req, res) => {
    res.json({ venues: VENUES.map(publicVenue) });
  });

  router.get('/:slug/availability', async (req, res) => {
    const venue = resolveVenue(req, res);
    if (!venue) return undefined;
    if (!ensurePrisma(res)) return undefined;

    const from = isIsoDate(req.query.from) ? req.query.from : todayIso();
    const requestedTo = isIsoDate(req.query.to) ? req.query.to : null;
    const maxTo = addDaysIso(from, MAX_HORIZON_DAYS);
    const defaultTo = addDaysIso(from, DEFAULT_HORIZON_DAYS);
    const to = requestedTo && requestedTo <= maxTo ? requestedTo : defaultTo;

    try {
      const days = await loadVenueCalendar({ slug: venue.slug, from, to });
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ venue: venue.slug, from, to, days });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'venue availability failed');
      return res.status(503).json({ error: 'availability-unavailable' });
    }
  });

  // The outbound feed. Airbnb, Google Calendar, Vrbo and Lodgify subscribe to
  // this URL to learn which nights we have taken, which is the half of
  // double-booking prevention that we own.
  router.get('/:slug/calendar.ics', async (req, res) => {
    const venue = resolveVenue(req, res);
    if (!venue) return undefined;
    if (!prisma) return res.status(503).type('text/plain').send('database-unavailable');

    const from = todayIso();
    const to = addDaysIso(from, MAX_HORIZON_DAYS);

    try {
      const days = await loadVenueCalendar({ slug: venue.slug, from, to });
      // Only genuinely unavailable days go outbound. Exporting "open" would
      // tell a subscriber the room is busy every night we manage it.
      const busy = days
        .filter((day) => day.status === 'booked' || day.status === 'held' || day.status === 'blocked')
        .map((day) => day.date);

      const events = groupIntoRanges(busy).map((range) => ({
        uid: `${venue.slug}-${range.start}-${range.end}@localeffortfood.com`,
        start: range.start,
        end: range.end,
        summary: `${venue.nickname} — unavailable`,
      }));

      const body = buildCalendar({
        name: `${venue.nickname} — Local Effort Cooperative`,
        events,
      });

      res.set('Content-Type', 'text/calendar; charset=utf-8');
      res.set('Content-Disposition', `inline; filename="${venue.slug}.ics"`);
      res.set('Cache-Control', 'public, max-age=900');
      return res.send(body);
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'venue ics export failed');
      return res.status(503).type('text/plain').send('calendar-unavailable');
    }
  });

  // ── Admin: external feeds ─────────────────────────────────────────────

  router.get('/:slug/feeds', async (req, res) => {
    const venue = resolveVenue(req, res);
    if (!venue) return undefined;
    if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
    if (!ensurePrisma(res)) return undefined;

    const feeds = await prisma.venueCalendarFeed.findMany({
      where: { venue: venue.slug },
      orderBy: { createdAt: 'asc' },
    });
    // The URL is a bearer credential; never echo it back in full.
    return res.json({
      feeds: feeds.map((feed) => ({
        id: feed.id,
        venue: feed.venue,
        label: feed.label,
        urlPreview: `${String(feed.url).slice(0, 40)}…`,
        active: feed.active,
        lastSyncAt: feed.lastSyncAt,
        lastStatus: feed.lastStatus,
        lastError: feed.lastError,
        lastBlockCount: feed.lastBlockCount,
      })),
    });
  });

  router.post('/:slug/feeds', async (req, res) => {
    const venue = resolveVenue(req, res);
    if (!venue) return undefined;
    if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
    if (!ensurePrisma(res)) return undefined;

    const label = normalizeString(req.body?.label, 60);
    const url = normalizeString(req.body?.url, 1000);
    if (!label || !url) return res.status(400).json({ error: 'missing-fields' });

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'invalid-url' });
    }
    // Server-side fetch of a user-supplied URL: require https and reject
    // anything pointing back at the host, so a feed cannot be used to probe
    // internal services.
    if (parsed.protocol !== 'https:') return res.status(400).json({ error: 'https-required' });
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[?::1)/i.test(parsed.hostname)) {
      return res.status(400).json({ error: 'host-not-allowed' });
    }

    const feed = await prisma.venueCalendarFeed.create({
      data: { venue: venue.slug, label, url },
    });
    const result = await syncFeed(feed, { logger });
    return res.json({ ok: true, feedId: feed.id, sync: result });
  });

  router.delete('/feeds/:id', async (req, res) => {
    if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
    if (!ensurePrisma(res)) return undefined;
    const id = normalizeString(req.params.id, 80);
    // Blocks cascade with the feed, which is what we want: removing a source
    // removes the dates only it was asserting.
    await prisma.venueCalendarFeed.delete({ where: { id } }).catch(() => {});
    return res.json({ ok: true });
  });

  // Vercel crons issue GET, so both verbs are accepted.
  const handleSync = async (req, res) => {
    if (!isCronOrAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
    if (!ensurePrisma(res)) return undefined;

    const feeds = await prisma.venueCalendarFeed.findMany({ where: { active: true } });
    const results = [];
    for (const feed of feeds) {
      // Sequential on purpose: a handful of feeds, and a serverless function
      // with a short budget should not open N sockets at once.
      results.push(await syncFeed(feed, { logger }));
    }
    return res.json({ ok: true, synced: results.length, results });
  };

  router.get('/sync', handleSync);
  router.post('/sync', handleSync);

  return router;
}

module.exports = { createVenuesRouter, __internals: { loadVenueCalendar, syncFeed, publicVenue } };
