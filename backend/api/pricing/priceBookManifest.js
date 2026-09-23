/**
 * Owner-defined product and pricing policy, effective 2026-09-18.
 *
 * This manifest is the reproducible source used to seed the first versioned
 * price book. Runtime quotes read the published database version, so changing
 * this file never rewrites a quote or agreement that already exists.
 */

const PRODUCTS = [
  {
    key: 'small_event',
    name: 'Small Event',
    description: 'Hosted and offsite staffed meals for small groups.',
  },
  {
    key: 'meal_prep',
    name: 'Meal Prep',
    description: 'Membership-based recurring household meal preparation.',
  },
  {
    key: 'other',
    name: 'Other',
    description: 'Drop-off catering, pizza, retail, and offers awaiting a dedicated product family.',
  },
];

const OFFERS = [
  {
    key: 'small_event_catered',
    productKey: 'small_event',
    name: 'Catered Small Event',
    status: 'active',
    composition: {
      locations: ['offsite', 'onsite_foodist', 'onsite_firehouse'],
      serviceStyles: ['buffet_passed', 'family_style_coursed', 'plated_coursed'],
    },
  },
  {
    key: 'meal_prep_standard',
    productKey: 'meal_prep',
    name: 'Membership Meal Prep',
    status: 'active',
    composition: {
      pricingModes: ['per_person', 'family_flat'],
      billingCadences: ['weekly', 'four_week'],
    },
  },
  {
    key: 'other_custom',
    productKey: 'other',
    name: 'Custom Food Order',
    status: 'draft',
    composition: { requiresOperatorQuote: true },
  },
];

const PRICE_BOOK = {
  key: 'local-effort-standard',
  version: 1,
  name: 'Local Effort standard pricing',
  status: 'published',
  currency: 'USD',
  effectiveAt: '2026-09-18T00:00:00.000-05:00',
  metadata: {
    evidence: 'owner_defined',
    capturedAt: '2026-09-18',
    notes: 'Customer agreements and quote revisions may override these standard rules without changing them.',
  },
};

const RULES = [
  { ruleKey: 'meal_prep.breakfast.per_person', calculator: 'meal_prep', scopeKey: 'breakfast', ruleType: 'unit_amount', amountCents: 1200, displayLabel: 'Breakfast per person', sortOrder: 10 },
  { ruleKey: 'meal_prep.lunch.per_person', calculator: 'meal_prep', scopeKey: 'lunch', ruleType: 'unit_amount', amountCents: 1900, displayLabel: 'Lunch per person', sortOrder: 20 },
  { ruleKey: 'meal_prep.dinner.per_person', calculator: 'meal_prep', scopeKey: 'dinner', ruleType: 'unit_amount', amountCents: 2400, displayLabel: 'Dinner per person', sortOrder: 30 },
  { ruleKey: 'meal_prep.dinner.family_flat', calculator: 'meal_prep', scopeKey: 'dinner', ruleType: 'unit_amount', amountCents: 4500, displayLabel: 'Family dinner flat rate', sortOrder: 40 },
  { ruleKey: 'meal_prep.delivery.weekly', calculator: 'meal_prep', scopeKey: 'delivery', ruleType: 'unit_amount', amountCents: 1000, displayLabel: 'Weekly delivery', sortOrder: 50 },
  { ruleKey: 'meal_prep.billing.four_week_discount', calculator: 'meal_prep', scopeKey: 'food_subtotal', ruleType: 'percentage', rateBps: 800, displayLabel: 'Four-week billing discount', parameters: { appliesTo: 'food_before_adjustments' }, sortOrder: 60 },
  { ruleKey: 'meal_prep.reward.paid_member', calculator: 'meal_prep', scopeKey: 'adjusted_food_subtotal', ruleType: 'percentage', rateBps: 400, displayLabel: 'Paid-member store credit', parameters: { earnedOnSettlement: true, excludes: ['membership_dues', 'delivery', 'tax', 'credit_funded_spend'] }, sortOrder: 70 },
  { ruleKey: 'meal_prep.membership.annual', calculator: 'meal_prep', scopeKey: 'membership', ruleType: 'unit_amount', amountCents: 37500, displayLabel: 'Annual membership', sortOrder: 80 },
  { ruleKey: 'meal_prep.membership.monthly', calculator: 'meal_prep', scopeKey: 'membership', ruleType: 'unit_amount', amountCents: 4500, displayLabel: 'Monthly membership', sortOrder: 90 },
  { ruleKey: 'meal_prep.membership.waiver', calculator: 'meal_prep', scopeKey: 'membership', ruleType: 'unit_amount', amountCents: 0, displayLabel: 'Income-based membership waiver', sortOrder: 100 },

  { ruleKey: 'small_event.buffet_passed.person.minimum', calculator: 'small_event', scopeKey: 'buffet_passed', ruleType: 'range_minimum', amountCents: 4500, displayLabel: 'Buffet or passed service — lower bound', sortOrder: 200 },
  { ruleKey: 'small_event.buffet_passed.person.maximum', calculator: 'small_event', scopeKey: 'buffet_passed', ruleType: 'range_maximum', amountCents: 7500, displayLabel: 'Buffet or passed service — upper bound', sortOrder: 210 },
  { ruleKey: 'small_event.family_style_coursed.person.minimum', calculator: 'small_event', scopeKey: 'family_style_coursed', ruleType: 'range_minimum', amountCents: 6500, displayLabel: 'Family-style or coursed service — lower bound', sortOrder: 220 },
  { ruleKey: 'small_event.family_style_coursed.person.maximum', calculator: 'small_event', scopeKey: 'family_style_coursed', ruleType: 'range_maximum', amountCents: 9500, displayLabel: 'Family-style or coursed service — upper bound', sortOrder: 230 },
  { ruleKey: 'small_event.plated_coursed.person.minimum', calculator: 'small_event', scopeKey: 'plated_coursed', ruleType: 'range_minimum', amountCents: 10500, displayLabel: 'Individually plated and coursed service — lower bound', sortOrder: 240 },
  { ruleKey: 'small_event.plated_coursed.person.maximum', calculator: 'small_event', scopeKey: 'plated_coursed', ruleType: 'range_maximum', amountCents: 25000, displayLabel: 'Individually plated and coursed service — upper bound', sortOrder: 250 },
  { ruleKey: 'small_event.venue.foodist', calculator: 'small_event', scopeKey: 'onsite_foodist', ruleType: 'fixed_amount', amountCents: 15000, displayLabel: 'Foodist venue', sortOrder: 260 },
  { ruleKey: 'small_event.venue.firehouse', calculator: 'small_event', scopeKey: 'onsite_firehouse', ruleType: 'fixed_amount', amountCents: 75000, displayLabel: 'Firehouse venue', sortOrder: 270 },
  { ruleKey: 'small_event.deposit', calculator: 'small_event', scopeKey: 'estimated_total', ruleType: 'percentage', rateBps: 2000, displayLabel: 'Date-hold deposit', parameters: { estimateBasis: 'lower_rate_times_high_guest_count_plus_fixed_costs' }, sortOrder: 280 },
];

const INVENTORY_RESOURCES = [
  { key: 'venue.foodist.day', productKey: 'small_event', name: 'Foodist event day', resourceType: 'venue_day', unit: 'day', capacity: 1, status: 'draft' },
  { key: 'venue.firehouse.day', productKey: 'small_event', name: 'Firehouse event day', resourceType: 'venue_day', unit: 'day', capacity: 1, status: 'draft' },
];

module.exports = {
  INVENTORY_RESOURCES,
  OFFERS,
  PRICE_BOOK,
  PRODUCTS,
  RULES,
};
