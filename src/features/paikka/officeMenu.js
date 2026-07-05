// Office catering menu for Local Effort Cooperative.
// Shape mirrors ./menu.js (flat item list + lookup + grouped view) so items
// can flow through the same order plumbing.
//
// NOTE: unlike menu.js this file is pure ESM — no `module.exports` tail.
// This page is prerendered through src/ssr/StaticApp.jsx, and esbuild's CJS
// bundle treats a bare `module` reference in an ESM file as the bundle's own
// module object, clobbering the whole bundle's exports (verified). Node
// handlers that need this data should import it through a bundler step.
//
// All prices are integer cents. "feeds" counts drive the ezCater-style
// per-person math on the page.

const OFFICE_POLICIES = {
  orderMinimumCents: 15000, // $150 order minimum
  leadTimeHours: 48, // orders must be placed at least 48 hours ahead
  deliveryFeeCents: 4000, // $40 flat delivery
  freeDeliveryThresholdCents: 75000, // free delivery at $750+
  deliveryArea: 'Minneapolis–St. Paul metro',
  deliveryWindows: ['8:00–9:00 am', '10:30–11:30 am', '11:30 am–12:30 pm'],
  paymentNote:
    'Pay by corporate card or request an invoice (Net 15). We confirm every order by email within one business day.',
};

const OFFICE_MENU_ITEMS = [
  // --- Sandwiches (trays by the half dozen, on our sourdough focaccia) ---
  {
    sku: 'OFC_SANDO_CHICKEN',
    category: 'sandwiches',
    title: 'Smoked chicken sandwich tray',
    description:
      'Smoked Wild Acres chicken dressed in herbes de Provence, basil, and olive oil, with roasted cabbage mostarda, apple, celery, and colby, on sourdough focaccia. Half dozen, halved and arranged.',
    priceCents: 8400,
    unitLabel: 'tray of 6',
    feedsMin: 6,
    feedsMax: 6,
    dietary: [],
  },
  {
    sku: 'OFC_SANDO_BEEF',
    category: 'sandwiches',
    title: 'Peppered roast beef & cheddar tray',
    description:
      'Slow-roasted peppered beef, aged Wisconsin cheddar, horseradish crème fraîche, pickled red onion, and arugula on sourdough focaccia. Half dozen, halved and arranged.',
    priceCents: 9000,
    unitLabel: 'tray of 6',
    feedsMin: 6,
    feedsMax: 6,
    dietary: [],
  },
  {
    sku: 'OFC_SANDO_SQUASH',
    category: 'sandwiches',
    title: 'Marinated squash & romesco tray',
    description:
      'Roasted squash marinated overnight in sage, olive oil, vinegar, and cured sweet pepper, with romesco, greens, and gruyère on sourdough focaccia. Vegetarian. Half dozen, halved and arranged.',
    priceCents: 7800,
    unitLabel: 'tray of 6',
    feedsMin: 6,
    feedsMax: 6,
    dietary: ['vegetarian'],
  },
  {
    sku: 'OFC_SANDO_BEAN',
    category: 'sandwiches',
    title: 'Herbed white bean & pickled vegetable tray',
    description:
      'Whipped herbed white beans, quick-pickled seasonal vegetables, sunflower crunch, and greens on sourdough focaccia. Vegan and dairy-free. Half dozen, halved and arranged.',
    priceCents: 7800,
    unitLabel: 'tray of 6',
    feedsMin: 6,
    feedsMax: 6,
    dietary: ['vegan', 'dairy-free'],
  },
  {
    sku: 'OFC_SANDO_MIX',
    category: 'sandwiches',
    title: 'Mixed sandwich tray (dozen)',
    description:
      "Chef's split of all four sandwiches — smoked chicken, roast beef, marinated squash, and white bean — labeled on the tray. The easy button for a mixed office. Feeds 12.",
    priceCents: 16000,
    unitLabel: 'tray of 12',
    feedsMin: 12,
    feedsMax: 12,
    dietary: [],
  },

  // --- Salads (big bowls that feed 8–10) ---
  {
    sku: 'OFC_SALAD_WILDRICE',
    category: 'salads',
    title: 'Wild rice & roasted squash salad',
    description:
      'Minnesota wild rice, roasted squash, dried cranberries, toasted sunflower seeds, maple-cider vinaigrette. Vegan and gluten-free. Big bowl, serving utensils included.',
    priceCents: 5800,
    unitLabel: 'big bowl',
    feedsMin: 8,
    feedsMax: 10,
    dietary: ['vegan', 'gluten-free', 'dairy-free'],
  },
  {
    sku: 'OFC_SALAD_CAESAR',
    category: 'salads',
    title: 'Little gem Caesar',
    description:
      'Little gem lettuces, sourdough crumb, grana padano, house Caesar dressing on the side. Big bowl, serving utensils included.',
    priceCents: 5200,
    unitLabel: 'big bowl',
    feedsMin: 8,
    feedsMax: 10,
    dietary: ['vegetarian'],
  },
  {
    sku: 'OFC_SALAD_MARKET',
    category: 'salads',
    title: 'Chopped market salad',
    description:
      'Whatever is best from our growers this week — chopped seasonal vegetables, herbs, and seeds with buttermilk-dill dressing on the side. Gluten-free. Big bowl, serving utensils included.',
    priceCents: 4800,
    unitLabel: 'big bowl',
    feedsMin: 8,
    feedsMax: 10,
    dietary: ['vegetarian', 'gluten-free'],
  },
  {
    sku: 'OFC_SALAD_POTATO',
    category: 'salads',
    title: 'Red potato salad',
    description:
      'Red potatoes, grainy mustard, fresh herbs, olive oil — no mayo, holds beautifully at room temperature. Vegan and gluten-free. Big bowl, serving utensils included.',
    priceCents: 4500,
    unitLabel: 'big bowl',
    feedsMin: 8,
    feedsMax: 10,
    dietary: ['vegan', 'gluten-free', 'dairy-free'],
  },
  {
    sku: 'OFC_SALAD_ADDCHICKEN',
    category: 'salads',
    title: 'Add smoked chicken to any salad',
    description: 'Two pounds of pulled smoked Wild Acres chicken, served alongside so every diet is covered.',
    priceCents: 1800,
    unitLabel: 'per salad',
    feedsMin: null,
    feedsMax: null,
    dietary: ['gluten-free', 'dairy-free'],
  },

  // --- Bread & baked goods (by the dozen) ---
  {
    sku: 'OFC_BAKED_FOCACCIA',
    category: 'baked',
    title: 'Sourdough focaccia squares',
    description:
      'Our sourdough focaccia — red fife and rye milled at Baker’s Field, 100% hydration — cut into squares with cultured butter. One dozen.',
    priceCents: 2400,
    unitLabel: 'dozen',
    feedsMin: 12,
    feedsMax: 12,
    dietary: ['vegetarian'],
  },
  {
    sku: 'OFC_BAKED_PASTRY',
    category: 'baked',
    title: 'Morning pastry box',
    description:
      'A dozen mixed pastries: cardamom knots and seasonal fruit danish. The right move for an 8 am meeting.',
    priceCents: 5400,
    unitLabel: 'dozen',
    feedsMin: 12,
    feedsMax: 12,
    dietary: ['vegetarian'],
  },
  {
    sku: 'OFC_BAKED_COOKIE',
    category: 'baked',
    title: 'Chocolate chip rye cookies',
    description: 'Chewy chocolate chip cookies with a little rye flour and flaky salt. One dozen.',
    priceCents: 3000,
    unitLabel: 'dozen',
    feedsMin: 12,
    feedsMax: 12,
    dietary: ['vegetarian'],
  },
  {
    sku: 'OFC_BAKED_BARS',
    category: 'baked',
    title: 'Seasonal fruit crumble bars',
    description: 'Oat crumble bars with whatever fruit is peaking — rhubarb in spring, berries in summer, apple in fall. One dozen.',
    priceCents: 3600,
    unitLabel: 'dozen',
    feedsMin: 12,
    feedsMax: 12,
    dietary: ['vegetarian'],
  },

  // --- Specials (rotating) ---
  {
    sku: 'OFC_SPECIAL_SPREAD',
    category: 'specials',
    title: 'This week: summer grill-out box',
    description:
      'Grilled Wild Acres chicken, sweet corn and tomato salad, red potato salad, and a dozen focaccia squares. A complete hot-weather lunch for 10.',
    priceCents: 18000,
    unitLabel: 'feeds 10',
    feedsMin: 10,
    feedsMax: 10,
    dietary: [],
  },
  {
    sku: 'OFC_SPECIAL_SOUP',
    category: 'specials',
    title: 'Soup + focaccia for the office',
    description:
      'One gallon of the seasonal soup (chilled cucumber-buttermilk or garden tomato in summer; wild rice–mushroom in the cold months) with a dozen focaccia squares. Feeds 10.',
    priceCents: 7500,
    unitLabel: 'feeds 10',
    feedsMin: 10,
    feedsMax: 10,
    dietary: ['vegetarian'],
  },
];

const OFFICE_MENU_LOOKUP = new Map(OFFICE_MENU_ITEMS.map((item) => [item.sku, item]));

const OFFICE_SECTION_META = [
  {
    id: 'sandwiches',
    title: 'Sandwiches',
    note: 'Trays by the half dozen on our sourdough focaccia, halved, arranged, and labeled.',
  },
  {
    id: 'salads',
    title: 'Salads',
    note: 'Big bowls that feed 8–10, dressings on the side, serving utensils included.',
  },
  {
    id: 'baked',
    title: 'Bread & baked goods',
    note: 'By the dozen, baked the morning of your delivery.',
  },
  {
    id: 'specials',
    title: 'Specials',
    note: 'Rotating with the season — ask us what is coming next week.',
  },
];

const OFFICE_MENU_SECTIONS = OFFICE_SECTION_META.map((section) => ({
  ...section,
  items: OFFICE_MENU_ITEMS.filter((item) => item.category === section.id),
}));

const officeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatOfficeCurrency = (cents) => officeCurrency.format(cents / 100);

// Human "about $X.XX/person" label; null when the item has no headcount.
const perPersonLabel = (item) => {
  if (!item.feedsMax || !item.priceCents) return null;
  const low = item.priceCents / item.feedsMax;
  return `about ${officeCurrency.format(low / 100)}/person`;
};

// Totals + policy state for a { [sku]: qty } map.
const computeOfficeOrderTotals = (quantities = {}) => {
  const subtotalCents = OFFICE_MENU_ITEMS.reduce((sum, item) => {
    const qty = Number(quantities[item.sku]) || 0;
    return sum + (qty > 0 ? qty * item.priceCents : 0);
  }, 0);
  const minimumMet = subtotalCents >= OFFICE_POLICIES.orderMinimumCents;
  const freeDelivery = subtotalCents >= OFFICE_POLICIES.freeDeliveryThresholdCents;
  const deliveryFeeCents = subtotalCents > 0 && !freeDelivery ? OFFICE_POLICIES.deliveryFeeCents : 0;
  return {
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
    minimumMet,
    freeDelivery,
    remainingToMinimumCents: Math.max(0, OFFICE_POLICIES.orderMinimumCents - subtotalCents),
    remainingToFreeDeliveryCents: Math.max(0, OFFICE_POLICIES.freeDeliveryThresholdCents - subtotalCents),
  };
};

// Earliest allowed delivery date (48-hour lead time), as a local YYYY-MM-DD
// string suitable for <input type="date" min=...> and lexical comparison.
const earliestOfficeDeliveryDate = (now = new Date()) => {
  const earliest = new Date(now.getTime() + OFFICE_POLICIES.leadTimeHours * 60 * 60 * 1000);
  const y = earliest.getFullYear();
  const m = String(earliest.getMonth() + 1).padStart(2, '0');
  const d = String(earliest.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// A headcount-first starter order: enough sandwiches for everyone, a salad
// per ~10 people, cookies for the table. Returns a { sku: qty } map.
const suggestedSpreadForHeadcount = (headcountRaw) => {
  const headcount = Math.max(1, Math.floor(Number(headcountRaw) || 0));
  const quantities = {};
  const dozens = Math.floor(headcount / 12);
  const remainder = headcount - dozens * 12;
  if (dozens > 0) quantities.OFC_SANDO_MIX = dozens;
  if (remainder > 0) {
    const halfTrays = Math.ceil(remainder / 6);
    quantities.OFC_SANDO_CHICKEN = Math.ceil(halfTrays / 2);
    const veg = Math.floor(halfTrays / 2);
    if (veg > 0) quantities.OFC_SANDO_SQUASH = veg;
  }
  quantities.OFC_SALAD_WILDRICE = Math.max(1, Math.ceil(headcount / 10));
  quantities.OFC_BAKED_COOKIE = Math.max(1, Math.ceil(headcount / 12));
  return quantities;
};

// Plain-text render of the full menu + ordering policies. Used for the
// always-rendered machine-readable block on the page so it can never drift
// from the structured data above.
const buildOfficeMenuPlainText = () => {
  const lines = [];
  lines.push('LOCAL EFFORT COOPERATIVE — OFFICE CATERING MENU (Minneapolis–St. Paul)');
  lines.push('');
  lines.push('ORDERING POLICIES');
  lines.push(`- Order minimum: ${formatOfficeCurrency(OFFICE_POLICIES.orderMinimumCents)}`);
  lines.push(`- Lead time: order at least ${OFFICE_POLICIES.leadTimeHours} hours before delivery`);
  lines.push(
    `- Delivery: ${formatOfficeCurrency(OFFICE_POLICIES.deliveryFeeCents)} flat fee; FREE on orders of ${formatOfficeCurrency(OFFICE_POLICIES.freeDeliveryThresholdCents)} or more`
  );
  lines.push(`- Delivery area: ${OFFICE_POLICIES.deliveryArea}`);
  lines.push(`- Delivery windows: ${OFFICE_POLICIES.deliveryWindows.join(', ')}`);
  lines.push(`- Payment: ${OFFICE_POLICIES.paymentNote}`);
  lines.push('');
  OFFICE_MENU_SECTIONS.forEach((section) => {
    lines.push(section.title.toUpperCase());
    if (section.note) lines.push(`(${section.note})`);
    section.items.forEach((item) => {
      const feeds =
        item.feedsMin && item.feedsMax
          ? item.feedsMin === item.feedsMax
            ? `feeds ${item.feedsMax}`
            : `feeds ${item.feedsMin}-${item.feedsMax}`
          : null;
      const per = perPersonLabel(item);
      const facts = [item.unitLabel, feeds, per].filter(Boolean).join(', ');
      lines.push(`- ${item.title} [${item.sku}] — ${formatOfficeCurrency(item.priceCents)} (${facts})`);
      lines.push(`  ${item.description}`);
      if (item.dietary.length) lines.push(`  Dietary: ${item.dietary.join(', ')}`);
    });
    lines.push('');
  });
  lines.push('HOW TO ORDER');
  lines.push('- Use the order form on this page (https://www.localeffortfood.com/office-catering), or');
  lines.push('- Email yum@localeffortfood.com with: company, contact name, phone, delivery address,');
  lines.push('  headcount, delivery date (48+ hours out) and window, and line items by SKU with quantities.');
  lines.push('We confirm every order by email within one business day. Invoice (Net 15) or card accepted.');
  return lines.join('\n');
};

export {
  OFFICE_POLICIES,
  OFFICE_MENU_ITEMS,
  OFFICE_MENU_LOOKUP,
  OFFICE_MENU_SECTIONS,
  formatOfficeCurrency,
  perPersonLabel,
  computeOfficeOrderTotals,
  earliestOfficeDeliveryDate,
  suggestedSpreadForHeadcount,
  buildOfficeMenuPlainText,
};
