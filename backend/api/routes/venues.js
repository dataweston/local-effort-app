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
const { parseCalendar, addDaysIso } = require('../utils/ical');
const crypto = require('crypto');
const { estimateVenueEvent } = require('../pricing/smallEventEstimator');
const { getSquareClient } = require('../../../api-handlers/_lib/squareClient');
const { claimDate, loadResourceCalendar, buildOutboundIcs } = require('../calendar/service');
const { todayChicago } = require('../calendar/dates');
const { CLIENT_RESOURCE } = require('../calendar/graph');
const { retryFailedMirrors } = require('../calendar/mirror');
const { readBusyEvents } = require('../calendar/google');

// A feed whose "url" is `google-calendar:<calendarId>` is read through the
// service account instead of fetched, so a calendar shared with us (Steve
// Ray's) needs no secret address. Stored in the same column, synced the same way.
const GOOGLE_FEED_PREFIX = 'google-calendar:';

// Small Events is not a room, but it is sold through the same booking engine.
// Its facts live here only because there is nowhere else for a pseudo-venue.
const CLIENT_VENUE = {
  slug: CLIENT_RESOURCE,
  nickname: 'Small Events',
  capacity: null,
};

// Where the buyer lands after Square. The Local Kitchen's public page is
// /localkitchen (its slug, `foodist`, predates the rename).
const PAGE_PATH = { client: '/small-events', firehouse: '/firehouse', foodist: '/localkitchen' };

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

// Business days are America/Chicago days, never UTC: after 7pm Central a UTC
// "today" is already tomorrow and would close the date the owner is still
// selling.
const todayIso = () => todayChicago();

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

const resolveSiteUrl = () => {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
};

const newToken = () =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

// How long a deposit link keeps the date off the market. Matches the small
// events flow (smallEvents.js:8) so a visitor who books a room and a visitor
// who books a dinner get the same promise.
const HOLD_WINDOW_HOURS = 24;

const isEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || ''));

// In-memory submit limiter, same shape as the one messages.js keeps for every
// other public form (messages.js:172-215). It is per-instance and therefore
// best-effort on a serverless platform; it exists to blunt a script, not to be
// an authorization boundary. The real guard is that the amount is server-derived
// and the date must already be open.
const bookRateBuckets = new Map();

const clientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const bumpBucket = ({ key, windowMs, max }) => {
  const now = Date.now();
  const current = bookRateBuckets.get(key);
  if (!current || current.expiresAt <= now) {
    bookRateBuckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }
  if (current.count >= max) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)) };
  }
  current.count += 1;
  if (bookRateBuckets.size > 4000) {
    for (const [bucketKey, bucket] of bookRateBuckets.entries()) {
      if (!bucket || bucket.expiresAt <= now) bookRateBuckets.delete(bucketKey);
    }
  }
  return { limited: false, retryAfter: 0 };
};

const checkBookRateLimit = (req, email) => {
  const checks = [
    { key: `venue-book:ip:${clientIp(req)}`, windowMs: 10 * 60 * 1000, max: 8 },
  ];
  if (email) checks.push({ key: `venue-book:email:${email}`, windowMs: 10 * 60 * 1000, max: 5 });

  let retryAfter = 0;
  for (const check of checks) {
    const result = bumpBucket(check);
    if (result.limited) retryAfter = Math.max(retryAfter, result.retryAfter);
  }
  return { limited: retryAfter > 0, retryAfter };
};

/**
 * Give a held date back.
 *
 * Called when a hold was written but the payment link could not be created.
 * Deleting rather than expiring: nobody was ever shown a price, so there is no
 * abandoned checkout to reconcile, and leaving the row would block a night for
 * 24 hours over an outage that lasted a second. Failures are swallowed on
 * purpose — the caller is already returning an error, and a failed cleanup
 * degrades to a date that frees itself when the hold window lapses.
 */
const releaseHold = async (estimateId, logger) => {
  try {
    await prisma.smallEventHold.deleteMany({ where: { estimateId } });
    await prisma.smallEventEstimate.delete({ where: { id: estimateId } });
  } catch (error) {
    if (logger?.error) logger.error({ err: error, estimateId }, 'venue hold release failed');
  }
};

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

// The calendar itself lives in ../calendar. `loadResourceCalendar` is the one
// reader: it applies the routing graph, so what a visitor sees, what a booking
// is allowed to claim, and what the outbound .ics publishes cannot disagree.

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
    const events = String(feed.url).startsWith(GOOGLE_FEED_PREFIX)
      ? await readBusyEvents({ calendarId: String(feed.url).slice(GOOGLE_FEED_PREFIX.length), from: todayIso(), to: addDaysIso(todayIso(), MAX_HORIZON_DAYS) })
      : parseCalendar(await fetchFeed(feed.url));
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

  // Rooms plus Small Events (slug `client`), for the endpoints both can use.
  const resolveResource = (req, res) =>
    normalizeString(req.params.slug, 40) === CLIENT_RESOURCE ? CLIENT_VENUE : resolveVenue(req, res);

  // ── Public ────────────────────────────────────────────────────────────

  router.get('/', (req, res) => {
    res.json({ venues: VENUES.map(publicVenue) });
  });

  router.get('/:slug/availability', async (req, res) => {
    const venue = resolveResource(req, res);
    if (!venue) return undefined;
    if (!ensurePrisma(res)) return undefined;

    const from = isIsoDate(req.query.from) ? req.query.from : todayIso();
    const requestedTo = isIsoDate(req.query.to) ? req.query.to : null;
    const maxTo = addDaysIso(from, MAX_HORIZON_DAYS);
    const defaultTo = addDaysIso(from, DEFAULT_HORIZON_DAYS);
    const to = requestedTo && requestedTo <= maxTo ? requestedTo : defaultTo;

    try {
      const days = await loadResourceCalendar({ resource: venue.slug, from, to, db: prisma });
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ venue: venue.slug, from, to, days });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'venue availability failed');
      return res.status(503).json({ error: 'availability-unavailable' });
    }
  });

  // ── The deposit ───────────────────────────────────────────────────────
  //
  // One call does the whole ask: validate, price, hold the date, and hand back
  // a Square link. Making someone submit an enquiry, wait for a reply and then
  // follow a second link is the flow this page was built to replace.
  //
  // Deliberate:
  //
  //   1. The price is re-derived here from the owner price book. The client
  //      ships the same numbers (src/config/eventPricing.js) so the figure can
  //      render in prerendered HTML, but nothing the browser sends is trusted.
  //   2. The date is claimed atomically (calendar/service.js claimDate): the
  //      rules are re-read under a per-date lock, so two buyers cannot both
  //      pass a check and then both write a hold.
  //   3. The hold, the estimate and the FinancePaymentAttempt are written in
  //      that one transaction, BEFORE any Square call. A payment that lands
  //      after a crash still finds its sale. If Square then fails, the hold is
  //      released so a night nobody can buy is not held for a day.
  //   4. A date is payable only if the routing graph says it is sellable:
  //      FIREHOUSE and the Local Kitchen need an operator-opened night; Small
  //      Events is open unless something closes it.
  router.post('/:slug/book', async (req, res) => {
    const venue = resolveResource(req, res);
    if (!venue) return undefined;
    if (!ensurePrisma(res)) return undefined;

    // The two defences every public form here carries: a honeypot the browser
    // never fills, and an in-memory limiter. This endpoint mints payment links,
    // so it sits on the strict side of the house numbers.
    if (normalizeString(req.body?.website, 100)) {
      return res.status(400).json({ error: 'rejected' });
    }

    const contactEmail = normalizeString(req.body?.contactEmail, 200).toLowerCase();
    const limit = checkBookRateLimit(req, contactEmail);
    if (limit.limited) {
      res.setHeader('Retry-After', String(limit.retryAfter));
      return res.status(429).json({ error: 'rate-limit-exceeded', retryAfter: limit.retryAfter });
    }

    const date = normalizeString(req.body?.date, 10);
    const eventTime = normalizeString(req.body?.eventTime, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(eventTime)) return res.status(400).json({ error: 'invalid-event-time' });
    const contactName = normalizeString(req.body?.contactName, 120);
    const contactPhone = normalizeString(req.body?.contactPhone, 40);
    const notes = normalizeString(req.body?.notes, 1000);

    // A Small Event happens at the customer's address, so the address is part
    // of the sale. It is stored where a room stores its slug. A venue slug typed
    // there would make the booking look like a room booking, so it is refused.
    const isClient = venue.slug === CLIENT_RESOURCE;
    const eventAddress = isClient ? normalizeString(req.body?.eventAddress, 200) : '';
    if (isClient && (eventAddress.length < 6 || VENUE_BY_SLUG.has(eventAddress.toLowerCase()))) {
      return res.status(400).json({ error: 'missing-event-address' });
    }

    if (!isIsoDate(date)) return res.status(400).json({ error: 'invalid-date' });
    if (date < todayIso()) return res.status(400).json({ error: 'date-in-past' });
    if (date > addDaysIso(todayIso(), MAX_HORIZON_DAYS)) {
      return res.status(400).json({ error: 'date-beyond-horizon' });
    }
    if (!contactName) return res.status(400).json({ error: 'missing-name' });
    if (!isEmail(contactEmail)) return res.status(400).json({ error: 'invalid-email' });

    const quote = estimateVenueEvent({
      venueSlug: venue.slug,
      serviceStyle: req.body?.serviceStyle,
      guestCount: req.body?.guestCount,
    });
    if (!quote.ok) return res.status(400).json({ error: quote.error });

    // A room cannot seat more people than it holds. Enforced only once capacity
    // is a real fact: venues.json ships it null until verified, and inventing a
    // ceiling would reject real bookings.
    const seats = Math.max(venue.capacity?.seated || 0, venue.capacity?.standing || 0);
    if (seats && quote.guestCount > seats) {
      return res.status(400).json({ error: 'over-capacity', capacity: seats });
    }

    const { client: squareClient, locationId } = getSquareClient();
    if (!squareClient || !locationId) {
      if (logger?.error) logger.error({}, 'venue checkout: square not configured');
      return res.status(503).json({ error: 'square-not-configured' });
    }

    let estimate;
    try {
      estimate = await claimDate({
        db: prisma,
        resource: venue.slug,
        date,
        build: async (tx, slot) => {
          const created = await tx.smallEventEstimate.create({
            data: {
              type: 'holiday',
              status: 'hold-pending',
              location: isClient ? eventAddress : venue.slug,
              serviceStyle: quote.serviceStyle,
              guestCount: quote.guestCount,
              eventDate: date,
              eventTime,
              contactName,
              contactEmail,
              contactPhone: contactPhone || null,
              notes: notes || null,
              estimateMinCents: quote.estimateMinCents,
              estimateMaxCents: quote.estimateMaxCents,
              subtotalCents: quote.estimateMinCents,
              depositPercent: quote.depositPercent,
              depositAmountCents: quote.depositCents,
              depositStatus: 'pending',
              claimToken: newToken(),
              lastEditedAt: new Date(),
              hold: {
                create: {
                  slotId: slot.id,
                  status: 'held',
                  holdUntil: new Date(Date.now() + HOLD_WINDOW_HOURS * 3600 * 1000),
                },
              },
            },
            include: { hold: true },
          });
          await tx.financePaymentAttempt.create({
            data: {
              provider: 'square',
              idempotencyKey: `venue-deposit:${created.id}`,
              status: 'pending',
              requestedCents: quote.depositCents,
              currency: 'USD',
              metadata: { channel: 'venue_booking', estimateId: created.id, resource: venue.slug, date },
            },
          });
          return created;
        },
      });
    } catch (error) {
      if (error?.message === 'date-not-open' || error?.message === 'date-taken') {
        return res.status(409).json({ error: error.message });
      }
      if (logger?.error) logger.error({ err: error }, 'venue hold failed');
      return res.status(503).json({ error: 'hold-failed' });
    }

    const attemptKey = `venue-deposit:${estimate.id}`;
    try {
      const referenceId = `venue:${venue.slug}:${estimate.id}`;
      const dollars = Math.round(quote.estimateMinCents / 100).toLocaleString('en-US');
      const orderResponse = await squareClient.ordersApi.createOrder({
        idempotencyKey: `${attemptKey}:order`,
        order: {
          locationId,
          referenceId,
          lineItems: [
            {
              name: `${venue.nickname} - ${date} date hold`,
              quantity: '1',
              basePriceMoney: { amount: quote.depositCents, currency: 'USD' },
              note: `${quote.depositPercent}% deposit against an estimated $${dollars} for ${quote.guestCount} guests`.slice(0, 500),
            },
          ],
        },
      });
      const squareOrderId = orderResponse?.result?.order?.id;
      if (!squareOrderId) throw new Error('no-square-order');

      // The order id is what a completed-payment webhook reconciles against.
      await prisma.financePaymentAttempt.update({
        where: { provider_idempotencyKey: { provider: 'square', idempotencyKey: attemptKey } },
        data: {
          metadata: { channel: 'venue_booking', estimateId: estimate.id, resource: venue.slug, date, squareOrderId },
        },
      });

      const response = await squareClient.checkoutApi.createPaymentLink({
        idempotencyKey: `${attemptKey}:link`,
        orderId: squareOrderId,
        checkoutOptions: {
          redirectUrl: `${resolveSiteUrl()}${PAGE_PATH[venue.slug] || `/${venue.slug}`}?deposit=success&hold=${estimate.id}&token=${encodeURIComponent(estimate.claimToken)}`,
        },
        prePopulatedData: { buyerEmail: contactEmail },
      });

      const paymentLink = response?.result?.paymentLink;
      if (!paymentLink?.url) throw new Error('no-payment-link');

      await prisma.smallEventPayment.create({
        data: {
          estimateId: estimate.id,
          amountCents: quote.depositCents,
          status: 'pending',
          squarePaymentLinkId: paymentLink.id || null,
          squareOrderId,
        },
      });

      return res.json({
        url: paymentLink.url,
        holdId: estimate.id,
        holdUntil: estimate.hold?.holdUntil,
        depositCents: quote.depositCents,
        estimateMinCents: quote.estimateMinCents,
        estimateMaxCents: quote.estimateMaxCents,
      });
    } catch (error) {
      await releaseHold(estimate.id, logger);
      await prisma.financePaymentAttempt
        .update({
          where: { provider_idempotencyKey: { provider: 'square', idempotencyKey: attemptKey } },
          data: { status: 'failed', failureCode: 'checkout-link-failed', failureMessage: String(error?.message || error).slice(0, 300) },
        })
        .catch(() => {});
      if (logger?.error) logger.error({ err: error }, 'venue checkout failed');
      return res.status(502).json({ error: 'checkout-failed' });
    }
  });

  // Whether a deposit actually landed. The success page asks this instead of
  // believing `?deposit=success`, which anyone can type. The claim token is the
  // bearer secret; without it the answer is the same as for an unknown id.
  router.get('/:slug/book/:id/status', async (req, res) => {
    const venue = resolveResource(req, res);
    if (!venue) return undefined;
    if (!ensurePrisma(res)) return undefined;
    const token = normalizeString(String(req.query.token || ''), 80);
    const id = normalizeString(req.params.id, 80);
    res.set('Cache-Control', 'no-store');
    try {
      const estimate = id && token ? await prisma.smallEventEstimate.findUnique({ where: { id }, include: { hold: true } }) : null;
      const a = Buffer.from(String(estimate?.claimToken || ''));
      const b = Buffer.from(token);
      if (!estimate || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(404).json({ error: 'not-found' });
      }
      let state = 'processing';
      if (estimate.status === 'confirmed') state = 'confirmed';
      else if (estimate.status === 'payment-review') state = 'review';
      else if (estimate.hold && estimate.hold.status === 'held' && estimate.hold.holdUntil <= new Date()) state = 'expired';
      return res.json({ state, date: estimate.eventDate, venue: venue.slug });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'venue booking status failed');
      return res.status(503).json({ error: 'status-unavailable' });
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
      // What the routing graph says this venue publishes: our own bookings,
      // holds and closed days. Never the Airbnb import (it would echo back to
      // Airbnb) and never anything a customer could be identified from.
      const body = await buildOutboundIcs({
        nodeId: `ics:${venue.slug}`,
        name: `${venue.nickname} — Local Effort Cooperative`,
        from,
        to,
        db: prisma,
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

    // A calendar shared with our service account (the Local Kitchen's shared
    // calendar with Steve Ray) is read through the Google API, not fetched, so
    // it takes a calendar id instead of a secret address.
    const googleCalendarId = normalizeString(req.body?.googleCalendarId, 200);
    let url = normalizeString(req.body?.url, 1000);
    if (googleCalendarId) {
      if (!/^[A-Za-z0-9._%+@#-]+$/.test(googleCalendarId)) return res.status(400).json({ error: 'invalid-calendar-id' });
      url = `${GOOGLE_FEED_PREFIX}${googleCalendarId}`;
    }
    if (!label || !url) return res.status(400).json({ error: 'missing-fields' });

    if (!googleCalendarId) {
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
    // Bookings whose Google Calendar write failed are retried on the same
    // pass, so the daily sync is also what heals a missed calendar event.
    const mirrors = await retryFailedMirrors({ db: prisma, logger }).catch((error) => {
      if (logger?.error) logger.error({ err: error }, 'calendar mirror retry failed');
      return { error: 'mirror-retry-failed' };
    });
    return res.json({ ok: true, synced: results.length, results, mirrors });
  };

  router.get('/sync', handleSync);
  router.post('/sync', handleSync);

  return router;
}

module.exports = { createVenuesRouter, __internals: { syncFeed, publicVenue, isAdmin } };
