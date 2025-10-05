const MENU_ITEMS = [
  {
    sku: 'SMOKED_CHICKEN',
    baseSku: 'SMOKED_CHICKEN',
    title: 'Smoked chicken sandwich',
    summaryTitle: 'Smoked chicken sandwich',
    description: 'Roasted cabbage mostarda, apple and celery, colby cheese.',
    presalePriceCents: 1400,
    regularPriceCents: 1600,
    squareName: 'Smoked chicken sandwich on sourdough focaccia',
    variantLabel: 'Standard',
    isDairyFree: false,
  },
  {
    sku: 'SMOKED_CHICKEN_DF',
    baseSku: 'SMOKED_CHICKEN',
    title: 'Smoked chicken sandwich',
    summaryTitle: 'Smoked chicken sandwich (dairy free)',
    description: 'Roasted cabbage mostarda, apple and celery. Dairy-free option served without cheese.',
    presalePriceCents: 1400,
    regularPriceCents: 1600,
    squareName: 'Smoked chicken sandwich (dairy free) on sourdough focaccia',
    variantLabel: 'Dairy free',
    isDairyFree: true,
  },
  {
    sku: 'PUMPKIN_ROMESCO',
    baseSku: 'PUMPKIN_ROMESCO',
    title: 'Marinated squash sandwich',
    summaryTitle: 'Marinated squash sandwich',
    description: 'Romesco, spinach, gruyere.',
    presalePriceCents: 1300,
    regularPriceCents: 1500,
    squareName: 'Marinated squash sandwich on sourdough focaccia',
    variantLabel: 'Standard',
    isDairyFree: false,
  },
  {
    sku: 'PUMPKIN_ROMESCO_DF',
    baseSku: 'PUMPKIN_ROMESCO',
    title: 'Marinated squash sandwich',
    summaryTitle: 'Marinated squash sandwich (dairy free)',
    description: 'Romesco, spinach. Dairy-free option served without gruyere.',
    presalePriceCents: 1300,
    regularPriceCents: 1500,
    squareName: 'Marinated squash sandwich (dairy free) on sourdough focaccia',
    variantLabel: 'Dairy free',
    isDairyFree: true,
  },
];

const MENU_LOOKUP = new Map(MENU_ITEMS.map((item) => [item.sku, item]));

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const formatCurrency = (cents) => currency.format(cents / 100);

const groupedMenuMap = MENU_ITEMS.reduce((map, item) => {
  const key = item.baseSku || item.sku;
  if (!map.has(key)) {
    map.set(key, {
      baseSku: key,
      title: item.title,
      description: item.description,
      presalePriceCents: item.presalePriceCents,
      regularPriceCents: item.regularPriceCents,
      variants: [],
    });
  }
  map.get(key).variants.push(item);
  return map;
}, new Map());

const GROUPED_MENU = Array.from(groupedMenuMap.values()).map((entry) => ({
  ...entry,
  variants: entry.variants.sort((a, b) => {
    if (a.isDairyFree === b.isDairyFree) return 0;
    return a.isDairyFree ? 1 : -1;
  }),
}));

export { MENU_ITEMS, MENU_LOOKUP, formatCurrency, GROUPED_MENU };

if (typeof module !== 'undefined') {
  module.exports = { MENU_ITEMS, MENU_LOOKUP, formatCurrency, GROUPED_MENU };
}
