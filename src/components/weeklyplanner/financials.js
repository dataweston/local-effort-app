// Financial calculation engine — pure functions, no UI dependencies.

/**
 * Compute hours between two "HH:MM" strings. Returns 0 if either is null.
 */
export function hoursFromTimes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

/**
 * Compute the effective cost (labor) of a single card.
 * If the card has costPerHour, cost = costPerHour × duration.
 * Otherwise cost is the flat `cost` field.
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
  let cost = 0;

  for (const c of dayCards) {
    const base = cardBaseRevenue(c);
    const mult = effects[c.id] || 1;
    revenue += base * mult;
    cost += cardCost(c);
  }

  return { revenue, plannedRevenue: revenue, actualRevenue: null, hasActual: false, cost, net: revenue - cost };
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
  let cost = 0;

  for (const c of cards) {
    const base = cardBaseRevenue(c);
    const mult = effects[c.id] || 1;
    revenue += base * mult;
    cost += cardCost(c);
  }

  return { revenue, plannedRevenue: revenue, actualRevenue: null, hasActual: false, cost, net: revenue - cost };
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
  const labor = cardTotals.cost;
  const overhead = overheads.reduce((sum, o) => sum + (o.monthlyCost || 0), 0);
  const cogs = cogsItems.reduce((sum, c) => sum + (c.amountCents != null ? c.amountCents / 100 : (c.amount || 0)), 0);
  const net = revenue - labor - overhead - cogs;

  return { ...cardTotals, revenue, labor, overhead, cogs, net };
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
