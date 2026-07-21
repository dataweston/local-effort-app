// Financial calculation engine — pure functions, no UI dependencies.

/**
 * Format a dollar amount (already in dollars, not cents) for display.
 * Every raw revenue/cost/net figure must pass through this before it
 * reaches JSX — card costPerHour math produces long float tails
 * (e.g. 487.49999999999994) that read as broken UI otherwise.
 */
export function money(amount, { decimals = 0 } = {}) {
  return (Number(amount) || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Compute hours between two "HH:MM" strings. Returns 0 if either is null.
 */
export function hoursFromTimes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

// Card types that are a facility charge (kitchen/space rental) rather than a
// wage paid to a person. Kept separate from labor everywhere costs are
// totaled — a $35/hr Food Corridor rate is not the same fact as a $35/hr
// wage, and blending them overstates payroll and understates rent.
const FACILITY_OBJECT_TYPES = new Set(['facility_rental']);

export function isFacilityCard(card) {
  return FACILITY_OBJECT_TYPES.has(card.objectType);
}

/**
 * Compute the effective cost of a single card (labor OR facility rate —
 * same rate math, different meaning). If the card has costPerHour, cost =
 * costPerHour × duration. Otherwise cost is the flat `cost` field.
 * Disabled optional cards contribute 0.
 */
export function cardCost(card) {
  if (card.optional && !card.enabled) return 0;
  if (card.costPerHourCents != null && card.costPerHourCents > 0) {
    return (card.costPerHourCents / 100) * hoursFromTimes(card.startTime, card.endTime);
  }
  if (card.costPerHour != null && card.costPerHour > 0) {
    return card.costPerHour * hoursFromTimes(card.startTime, card.endTime);
  }
  if (card.costCents != null) return card.costCents / 100;
  return card.cost || 0;
}

/** Labor-only cost: cardCost() for every card except facility rentals. */
export function cardLaborCost(card) {
  return isFacilityCard(card) ? 0 : cardCost(card);
}

/** Facility-only cost: cardCost() for facility rental cards, 0 otherwise. */
export function cardFacilityCost(card) {
  return isFacilityCard(card) ? cardCost(card) : 0;
}

/**
 * Compute the effective revenue of a single card, *before* effects from
 * other cards. Disabled optional cards contribute 0.
 */
export function cardBaseRevenue(card) {
  if (card.optional && !card.enabled) return 0;
  if (card.revenueCents != null) return card.revenueCents / 100;
  return card.revenue || 0;
}

/**
 * Build a map of effectTarget → multiplier from enabled effect cards.
 */
function buildEffectsMap(cards) {
  const effects = {};
  for (const c of cards) {
    if (c.effectTarget && c.effectType === 'double_revenue' && (!c.optional || c.enabled)) {
      effects[c.effectTarget] = (effects[c.effectTarget] || 1) * 2;
    }
  }
  return effects;
}

/**
 * Compute day totals: { revenue, cost, net } for cards matching a given date.
 * Accepts ISO date string ("2026-02-09") — matches on `c.date`.
 */
export function dayTotals(cards, date) {
  const dayCards = cards.filter((c) => c.date === date);
  const effects = buildEffectsMap(dayCards);

  let revenue = 0;
  let labor = 0;
  let facility = 0;

  for (const c of dayCards) {
    const base = cardBaseRevenue(c);
    const mult = effects[c.id] || 1;
    revenue += base * mult;
    labor += cardLaborCost(c);
    facility += cardFacilityCost(c);
  }

  const cost = labor + facility;
  return { revenue, plannedRevenue: revenue, actualRevenue: null, hasActual: false, cost, labor, facility, net: revenue - cost };
}

/** Apply an owner-entered actual for a date without blending it into the plan. */
export function dayTotalsWithActual(cards, date, actualsByDate = {}) {
  const planned = dayTotals(cards, date);
  const actual = actualsByDate[date];
  if (!actual) return planned;
  const revenue = actual.revenueCents != null ? actual.revenueCents / 100 : Number(actual.revenue || 0);
  return { ...planned, revenue, actualRevenue: revenue, hasActual: true, net: revenue - planned.cost };
}

/**
 * Compute totals across all cards passed in: { revenue, cost, net }.
 * Works for any subset (week, range, etc).
 */
export function weekTotals(cards) {
  const effects = buildEffectsMap(cards);

  let revenue = 0;
  let labor = 0;
  let facility = 0;

  for (const c of cards) {
    const base = cardBaseRevenue(c);
    const mult = effects[c.id] || 1;
    revenue += base * mult;
    labor += cardLaborCost(c);
    facility += cardFacilityCost(c);
  }

  const cost = labor + facility;
  return { revenue, plannedRevenue: revenue, actualRevenue: null, hasActual: false, cost, labor, facility, net: revenue - cost };
}

export function weekTotalsWithActual(cards, actualsByDate = {}) {
  const dates = [...new Set(cards.map((card) => card.date))];
  const planned = weekTotals(cards);
  let revenue = planned.revenue;
  let actualRevenue = 0;
  let hasActual = false;
  for (const date of dates) {
    const actual = actualsByDate[date];
    if (!actual) continue;
    hasActual = true;
    const plannedDay = dayTotals(cards, date).revenue;
    const actualAmount = actual.revenueCents != null ? actual.revenueCents / 100 : Number(actual.revenue || 0);
    revenue += actualAmount - plannedDay;
    actualRevenue += actualAmount;
  }
  return { ...planned, revenue, plannedRevenue: planned.revenue, actualRevenue: hasActual ? actualRevenue : null, hasActual, net: revenue - planned.cost };
}

/**
 * Compute monthly totals factoring in overheads and COGS.
 * @param {Array} monthCards - all cards for the month's weeks
 * @param {Array} overheads - array of { monthlyCost } objects
 * @param {Array} cogsItems - array of { amount } objects (all COGS for the month)
 * @param {number} _weeksInMonth - unused, kept for API compat
 */
export function monthTotals(monthCards, overheads = [], cogsItems = [], _weeksInMonth = 4, actualsByDate = {}) {
  const cardTotals = weekTotalsWithActual(monthCards, actualsByDate);
  const revenue = cardTotals.revenue;
  const labor = cardTotals.labor;
  const facility = cardTotals.facility;
  const overhead = overheads.reduce((sum, o) => sum + (o.monthlyCost || 0), 0);
  const cogs = cogsItems.reduce((sum, c) => sum + (c.amountCents != null ? c.amountCents / 100 : (c.amount || 0)), 0);
  const net = revenue - labor - facility - overhead - cogs;

  return { ...cardTotals, revenue, labor, facility, overhead, cogs, net };
}

/**
 * Summarize Teddy's coverage for a given date.
 */
export function teddyCoverage(cards, date) {
  const dayCards = cards.filter((c) => c.date === date && c.people.includes('Teddy'));
  if (dayCards.length === 0) return [];
  return dayCards
    .filter((c) => !c.optional || c.enabled)
    .map((c) => {
      if (c.startTime && c.endTime) {
        return `${c.title} ${c.startTime}–${c.endTime}`;
      }
      return c.title;
    });
}
