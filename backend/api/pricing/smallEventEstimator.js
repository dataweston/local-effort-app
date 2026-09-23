/**
 * The date-hold estimate for an on-site event.
 *
 * Every number here is derived from RULES in ./priceBookManifest.js rather than
 * restated, so the owner's published policy and the figure a visitor sees on
 * /firehouse cannot drift apart. Change the manifest and this follows.
 *
 * Why the manifest and not the database: quoteService.js reads the published
 * price-book version, which is correct for an operator writing a real quote.
 * This is the public booking path, and it has to produce a number for an
 * anonymous visitor on a prerendered page. A pure function over committed
 * constants cannot 503, and the deposit it computes is re-derived server-side
 * before any money is taken (see backend/api/routes/venues.js), so the client
 * never gets to name its own price.
 *
 * The estimate basis is not a choice made here. It is written into the deposit
 * rule itself — `lower_rate_times_high_guest_count_plus_fixed_costs` — and the
 * discovery that produced it argued the case: sell the date hold first at a
 * figure the final quote will almost always exceed, then let the operator set
 * the real menu price. Quoting the top of the range to hold a date would mean
 * refunding the difference on most bookings.
 */

const { RULES } = require('./priceBookManifest');

const ruleAmount = (ruleKey) => {
  const rule = RULES.find((entry) => entry.ruleKey === ruleKey);
  if (!rule || typeof rule.amountCents !== 'number') {
    throw new Error(`price-book rule missing or not an amount: ${ruleKey}`);
  }
  return rule.amountCents;
};

/**
 * Service styles, read out of the range rules.
 *
 * Ordered by lower bound so the page renders cheapest-first without the view
 * layer holding an opinion about price order.
 */
const SERVICE_STYLES = RULES.filter(
  (rule) => rule.calculator === 'small_event' && rule.ruleType === 'range_minimum',
)
  .map((rule) => ({
    key: rule.scopeKey,
    minCents: rule.amountCents,
    maxCents: ruleAmount(`small_event.${rule.scopeKey}.person.maximum`),
    // The manifest's label carries the bound ("— lower bound"); the page wants
    // the style, so the suffix is dropped rather than a second label invented.
    label: rule.displayLabel.replace(/\s*—.*$/, ''),
  }))
  .sort((a, b) => a.minCents - b.minCents);

const SERVICE_STYLE_BY_KEY = new Map(SERVICE_STYLES.map((style) => [style.key, style]));

/** Venue fees, keyed by the venues.json slug rather than the rule's scope. */
const VENUE_FEE_CENTS = {
  foodist: ruleAmount('small_event.venue.foodist'),
  firehouse: ruleAmount('small_event.venue.firehouse'),
};

const DEPOSIT_RULE = RULES.find((rule) => rule.ruleKey === 'small_event.deposit');
const DEPOSIT_BPS = DEPOSIT_RULE?.rateBps ?? 2000;

// Floors and ceilings on the guest count. The lower bound is the smallest party
// we will staff; the upper is a sanity cap so a fat-fingered or hostile request
// cannot mint a $2m payment link. Neither is a capacity claim — the real room
// capacity is a fact in venues.json and the page clamps to it when it is known.
const MIN_GUESTS = 8;
const MAX_GUESTS = 200;

const clampGuests = (value) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return null;
  if (n < MIN_GUESTS || n > MAX_GUESTS) return null;
  return n;
};

/**
 * Estimate one date at one venue.
 *
 * Returns cents throughout — no floats touch money — and reports the full
 * range as well as the hold basis, because showing someone a $420 deposit
 * without showing what it is 20% of is how a chargeback starts.
 */
function estimateVenueEvent({ venueSlug, serviceStyle, guestCount }) {
  const style = SERVICE_STYLE_BY_KEY.get(String(serviceStyle || ''));
  if (!style) return { ok: false, error: 'unknown-service-style' };

  const guests = clampGuests(guestCount);
  if (guests == null) return { ok: false, error: 'guest-count-out-of-range' };

  const venueFeeCents = VENUE_FEE_CENTS[String(venueSlug || '')];
  if (typeof venueFeeCents !== 'number') return { ok: false, error: 'unknown-venue' };

  const foodMinCents = style.minCents * guests;
  const foodMaxCents = style.maxCents * guests;

  // The hold basis: the LOW published rate, plus fixed costs. The high end is
  // shown to set expectations but is never what the deposit is taken against.
  const estimateMinCents = foodMinCents + venueFeeCents;
  const estimateMaxCents = foodMaxCents + venueFeeCents;
  const depositCents = Math.round((estimateMinCents * DEPOSIT_BPS) / 10000);

  return {
    ok: true,
    venueSlug,
    serviceStyle: style.key,
    serviceStyleLabel: style.label,
    guestCount: guests,
    perGuestMinCents: style.minCents,
    perGuestMaxCents: style.maxCents,
    foodMinCents,
    foodMaxCents,
    venueFeeCents,
    estimateMinCents,
    estimateMaxCents,
    depositPercent: DEPOSIT_BPS / 100,
    depositCents,
  };
}

module.exports = {
  DEPOSIT_BPS,
  MAX_GUESTS,
  MIN_GUESTS,
  SERVICE_STYLES,
  VENUE_FEE_CENTS,
  estimateVenueEvent,
};
