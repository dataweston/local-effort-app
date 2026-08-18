/**
 * Canonical business-line keys for Finance Core.
 *
 * `businessLineKey` is the join key the Local Budget margin contract consumes
 * (docs/architecture/finance-core-staged-plan.md §"Local Budget margin
 * integration contract"). It is a stable slug, never a display string — the
 * brain's BusinessLine entity names are seeded by
 * brain-sidecar/jobs/seed_ontology.py and are free to be renamed for humans
 * without invalidating commercial rows written years earlier.
 *
 * `brainBusinessLine` / `brainOffer` name the graph entity this key belongs to
 * so a later projector can attach commercial evidence to the right node. They
 * are match targets only: nothing here mints a brain entity (founder decision
 * 2026-06-27, same rule the order projector follows).
 *
 * Membership dues carry no brain line on purpose. The staged plan requires dues
 * to stay separate from food orders, and no seeded BusinessLine represents them.
 */
const BUSINESS_LINES = {
  weekly_meals: {
    label: 'Weekly meal subscription',
    brainBusinessLine: 'Weekly Meal Subscription',
    brainOffer: 'Weekly Meal Prep',
  },
  events: {
    label: 'Private dinners & events',
    brainBusinessLine: 'Private Dinners & Events',
    brainOffer: null,
  },
  pizza: {
    label: 'Local Effort Pizza',
    brainBusinessLine: 'Local Effort Pizza',
    brainOffer: 'Pizza Pop-Up',
  },
  wholesale: {
    label: 'Wholesale & bread',
    brainBusinessLine: 'Wholesale & Bread',
    brainOffer: null,
  },
  store: {
    label: 'Store & preorders',
    brainBusinessLine: null,
    brainOffer: 'Seasonal Food Drops & Preorders',
  },
  membership: {
    label: 'Localist membership dues',
    brainBusinessLine: null,
    brainOffer: null,
  },
};

/** Channel → business line for channels that only ever sell one line. */
const CHANNEL_BUSINESS_LINE = {
  weekly_order: 'weekly_meals',
  store: 'store',
  happy_monday: 'wholesale',
  localist_membership: 'membership',
  small_events: 'events',
};

/**
 * Storefront slug → business line. The general store hosts more than retail
 * preorders: pizza-party and event-style drops belong to their own lines so the
 * margin join does not blend a $12 pizza with a $2,400 private dinner.
 */
const STORE_BUSINESS_LINE = {
  'pizza-party': 'pizza',
  'chez-garage': 'store',
  'chez-garage-at-home': 'store',
  sale: 'store',
};

function isBusinessLineKey(value) {
  return typeof value === 'string' && Object.hasOwn(BUSINESS_LINES, value);
}

function businessLineForChannel(channel) {
  return CHANNEL_BUSINESS_LINE[channel] || null;
}

function businessLineForStore(store) {
  const slug = String(store || '').trim().toLowerCase();
  return STORE_BUSINESS_LINE[slug] || 'store';
}

module.exports = {
  BUSINESS_LINES,
  CHANNEL_BUSINESS_LINE,
  STORE_BUSINESS_LINE,
  businessLineForChannel,
  businessLineForStore,
  isBusinessLineKey,
};
