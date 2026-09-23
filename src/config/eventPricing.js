// Customer-facing pricing for an event in one of our rooms.
//
// WHY THIS FILE EXISTS, given that backend/api/pricing/priceBookManifest.js is
// the owner's source of truth: these pages are prerendered and sold against
// Google Ads. A price that arrives by fetch is a price the crawler and the
// no-JS visitor never see, and a landing page scored on a blank figure is the
// problem the whole prerender exists to avoid. So the numbers ship in the HTML.
//
// The duplication is guarded, not tolerated: src/config/__tests__/eventPricing
// .test.js requires the CJS manifest and asserts every value here still matches
// it. Change the manifest and that test fails until this file follows.
//
// The backend never trusts anything computed here. /api/venues/:slug/book
// re-derives the deposit from the manifest before a payment link is created,
// so a tampered client can only ever pay the correct amount.

/** Per-guest service rates, cheapest first. Cents. */
export const SERVICE_STYLES = [
  {
    key: 'buffet_passed',
    label: 'Buffet or passed service',
    minCents: 4500,
    maxCents: 7500,
  },
  {
    key: 'family_style_coursed',
    label: 'Family-style or coursed service',
    minCents: 6500,
    maxCents: 9500,
  },
  {
    key: 'plated_coursed',
    label: 'Individually plated and coursed service',
    minCents: 10500,
    maxCents: 25000,
  },
];

/** Room fee per event day, by venues.json slug. Cents. */
export const VENUE_FEE_CENTS = {
  foodist: 15000,
  firehouse: 75000,
};

/** Date-hold deposit, in basis points of the low estimate. */
export const DEPOSIT_BPS = 2000;

export const MIN_GUESTS = 8;
export const MAX_GUESTS = 200;

/**
 * The same arithmetic the server does, for the figure that recomputes under
 * the visitor's hands.
 *
 * The hold is taken against the LOW end of the range plus fixed costs, because
 * the final menu price is set later by an operator. Holding at the top of the
 * range would mean refunding the difference on most bookings.
 */
export function estimateEvent({ venueSlug, serviceStyle, guestCount }) {
  const style = SERVICE_STYLES.find((entry) => entry.key === serviceStyle);
  const venueFeeCents = VENUE_FEE_CENTS[venueSlug];
  const guests = Math.floor(Number(guestCount));

  if (!style || typeof venueFeeCents !== 'number') return null;
  if (!Number.isFinite(guests) || guests < MIN_GUESTS || guests > MAX_GUESTS) return null;

  const estimateMinCents = style.minCents * guests + venueFeeCents;
  const estimateMaxCents = style.maxCents * guests + venueFeeCents;

  return {
    serviceStyle: style.key,
    serviceStyleLabel: style.label,
    guestCount: guests,
    perGuestMinCents: style.minCents,
    perGuestMaxCents: style.maxCents,
    venueFeeCents,
    estimateMinCents,
    estimateMaxCents,
    depositPercent: DEPOSIT_BPS / 100,
    depositCents: Math.round((estimateMinCents * DEPOSIT_BPS) / 10000),
  };
}

/** $2,100 — whole dollars, because every rate in the book is a whole dollar. */
export const usd = (cents) =>
  typeof cents === 'number' ? `$${Math.round(cents / 100).toLocaleString('en-US')}` : null;
