/**
 * Unit system for Food Ops.
 *
 * Three dimensions, one base unit each: mass -> gram, volume -> millilitre,
 * count -> each. Converting across dimensions (cups of flour -> grams) is only
 * possible with an explicit density on the stock product; nothing guesses it.
 *
 * Quantities are plain numbers here. Costs per base unit are fractional cents
 * (salt is ~0.02 cents per gram), so they are NEVER rounded to integer cents
 * until a final per-serving or per-batch figure is reported.
 */

const BASE_UNIT = { mass: 'g', volume: 'ml', count: 'each' };

// unit -> [dimension, factor to the dimension's base unit]
const UNITS = {
  g: ['mass', 1],
  kg: ['mass', 1000],
  oz: ['mass', 28.349523125],
  lb: ['mass', 453.59237],
  ml: ['volume', 1],
  l: ['volume', 1000],
  tsp: ['volume', 4.92892159375],
  tbsp: ['volume', 14.78676478125],
  floz: ['volume', 29.5735295625],
  cup: ['volume', 236.5882365],
  pt: ['volume', 473.176473],
  qt: ['volume', 946.352946],
  gal: ['volume', 3785.411784],
  each: ['count', 1],
  dozen: ['count', 12],
};

const ALIASES = {
  gram: 'g', grams: 'g', gm: 'g',
  kilogram: 'kg', kilograms: 'kg', kgs: 'kg',
  ounce: 'oz', ounces: 'oz',
  pound: 'lb', pounds: 'lb', lbs: 'lb', '#': 'lb',
  milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  liter: 'l', liters: 'l', litre: 'l', litres: 'l', ltr: 'l',
  teaspoon: 'tsp', teaspoons: 'tsp',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp',
  'fl oz': 'floz', 'fl.oz': 'floz', 'fl.oz.': 'floz', floz: 'floz',
  cups: 'cup',
  pint: 'pt', pints: 'pt',
  quart: 'qt', quarts: 'qt',
  gallon: 'gal', gallons: 'gal',
  ea: 'each', ct: 'each', count: 'each', pc: 'each', pcs: 'each', piece: 'each', pieces: 'each', unit: 'each', units: 'each',
  dz: 'dozen', doz: 'dozen', dozens: 'dozen',
};

const DIMENSIONS = Object.keys(BASE_UNIT);

function normalizeUnit(raw) {
  if (raw === null || raw === undefined) return null;
  const key = String(raw).trim().toLowerCase().replace(/\.+$/, '');
  if (!key) return null;
  if (UNITS[key]) return key;
  if (ALIASES[key]) return ALIASES[key];
  const squashed = key.replace(/\s+/g, '');
  if (UNITS[squashed]) return squashed;
  if (ALIASES[squashed]) return ALIASES[squashed];
  return null;
}

function unitInfo(unit) {
  const normalized = normalizeUnit(unit);
  if (!normalized) return null;
  const [dimension, factor] = UNITS[normalized];
  return { unit: normalized, dimension, factor, baseUnit: BASE_UNIT[dimension] };
}

function assertFinitePositive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${label} must be a positive number`);
  }
  return number;
}

/**
 * Convert a quantity to its dimension's base unit.
 * Returns { quantity, dimension } in g / ml / each.
 */
function toBase(quantity, unit) {
  const info = unitInfo(unit);
  if (!info) throw new RangeError(`Unknown unit "${unit}"`);
  const number = Number(quantity);
  if (!Number.isFinite(number) || number < 0) throw new RangeError('quantity must be a non-negative number');
  return { quantity: number * info.factor, dimension: info.dimension };
}

/**
 * Convert a quantity to the base quantity of `targetDimension`. Crossing
 * mass <-> volume requires densityGPerMl; count never crosses.
 */
function toBaseInDimension(quantity, unit, targetDimension, { densityGPerMl = null } = {}) {
  if (!DIMENSIONS.includes(targetDimension)) throw new RangeError(`Unknown dimension "${targetDimension}"`);
  const base = toBase(quantity, unit);
  if (base.dimension === targetDimension) return base.quantity;
  const density = Number(densityGPerMl);
  const hasDensity = Number.isFinite(density) && density > 0;
  if (base.dimension === 'volume' && targetDimension === 'mass' && hasDensity) return base.quantity * density;
  if (base.dimension === 'mass' && targetDimension === 'volume' && hasDensity) return base.quantity / density;
  if (base.dimension === 'count' || targetDimension === 'count') {
    throw new RangeError(`Cannot convert ${base.dimension} to ${targetDimension}`);
  }
  throw new RangeError(`Cannot convert ${base.dimension} to ${targetDimension} without a density`);
}

// "4/5LB" -> 4 packs x 5 lb; "50 LB"; "12 CT"; "24/12 oz"; "5 gal"; "50#".
const PACK_PATTERN = /(?:^|[^a-z0-9.])(?:(\d+(?:\.\d+)?)\s*[/x]\s*)?(\d+(?:\.\d+)?)\s*(fl\.?\s?oz\.?|[a-z]+\.?|#)(?![a-z])/gi;

/**
 * Pull a pack size out of free text (a vendor description or pack column).
 * Returns { count, size, unit, dimension, baseQuantity, baseUnit, text } or
 * null. When several candidates exist the LAST one wins, because vendors put
 * the pack at the end ("FLOUR AP 50LB", "BUTTER UNSALTED 36/1LB").
 */
function parsePackText(text) {
  if (text === null || text === undefined) return null;
  const input = String(text);
  let match;
  let found = null;
  PACK_PATTERN.lastIndex = 0;
  while ((match = PACK_PATTERN.exec(input)) !== null) {
    const unit = normalizeUnit(match[3]);
    if (!unit) continue;
    const count = match[1] === undefined ? 1 : Number(match[1]);
    const size = Number(match[2]);
    if (!(count > 0) || !(size > 0)) continue;
    const [dimension, factor] = UNITS[unit];
    found = {
      count,
      size,
      unit,
      dimension,
      baseUnit: BASE_UNIT[dimension],
      baseQuantity: count * size * factor,
      text: match[0].replace(/^[^0-9]/, '').trim(),
    };
  }
  return found;
}

/** Cost per base unit in (fractional) cents. */
function costPerBaseUnit(packCostCents, packBaseQuantity) {
  const cost = Number(packCostCents);
  const base = assertFinitePositive(packBaseQuantity, 'packBaseQuantity');
  if (!Number.isFinite(cost) || cost < 0) throw new RangeError('packCostCents must be a non-negative number');
  return cost / base;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

module.exports = {
  BASE_UNIT,
  DIMENSIONS,
  UNITS,
  costPerBaseUnit,
  normalizeText,
  normalizeUnit,
  parsePackText,
  toBase,
  toBaseInDimension,
  unitInfo,
};
