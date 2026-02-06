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
 * Compute the effective cost of a single card.
 * If the card has costPerHour, cost = costPerHour × duration.
 * Otherwise cost is the flat `cost` field.
 * Disabled optional cards contribute 0.
 */
export function cardCost(card) {
  if (card.optional && !card.enabled) return 0;
  if (card.costPerHour != null && card.costPerHour > 0) {
    return card.costPerHour * hoursFromTimes(card.startTime, card.endTime);
  }
  return card.cost || 0;
}

/**
 * Compute the effective revenue of a single card, *before* effects from
 * other cards. Disabled optional cards contribute 0.
 */
export function cardBaseRevenue(card) {
  if (card.optional && !card.enabled) return 0;
  return card.revenue || 0;
}

/**
 * Build a map of effectTarget → multiplier from enabled effect cards.
 * Currently the only effect is "double_revenue" (multiplier = 2).
 */
function buildEffectsMap(cards) {
  const effects = {}; // targetId → multiplier
  for (const c of cards) {
    if (c.effectTarget && c.effectType === 'double_revenue' && (!c.optional || c.enabled)) {
      effects[c.effectTarget] = (effects[c.effectTarget] || 1) * 2;
    }
  }
  return effects;
}

/**
 * Compute day totals: { revenue, cost, net } for cards in a given day.
 */
export function dayTotals(cards, day) {
  const dayCards = cards.filter((c) => c.day === day);
  const effects = buildEffectsMap(dayCards);

  let revenue = 0;
  let cost = 0;

  for (const c of dayCards) {
    const base = cardBaseRevenue(c);
    const mult = effects[c.id] || 1;
    revenue += base * mult;
    cost += cardCost(c);
  }

  return { revenue, cost, net: revenue - cost };
}

/**
 * Compute week totals: { revenue, cost, net } across all cards.
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

  return { revenue, cost, net: revenue - cost };
}

/**
 * Summarize Teddy's coverage for a given day.
 * Returns an array of strings like "Babysitter 8:00–14:00" or "With Weston".
 */
export function teddyCoverage(cards, day) {
  const dayCards = cards.filter((c) => c.day === day && c.people.includes('Teddy'));
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
