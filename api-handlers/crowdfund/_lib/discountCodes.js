const DEFAULT_COMP_LABEL = 'Complimentary contribution';

// Helpers to normalize numeric and money fields across SDK versions
const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const getMoneyAmountCents = (money) => {
  if (!money || typeof money !== 'object') return 0;
  const amount =
    money.amount ??
    money.amountMoney?.amount ??
    money.amount_money?.amount ??
    null;
  return Math.max(0, Math.round(toNumber(amount, 0)));
};

// Supported entry formats (comma separated):
// - legacy: CODE:Label            -> full complimentary (100% off)
// - new:    CODE:Label|percent=50 -> percent off
// - new:    CODE:Label|fixed_cents=500 -> fixed cents off
// - new:    CODE|full             -> full complimentary (no label)
// Spec fields come after a '|' and are key=value or the keyword 'full'.
const parseCompEntries = () => {
  const raw = process.env.CROWDFUND_COMP_CODES || '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      // Split off any spec fields after a '|' token
      const [base, ...specParts] = entry.split('|').map((s) => s.trim()).filter(Boolean);
      const [codePart, ...labelParts] = (base || '').split(':');
      const code = (codePart || '').trim();
      if (!code) return null;

      const labelCandidate = labelParts.join(':').trim();
      let label = labelCandidate || DEFAULT_COMP_LABEL;

      // Default discount: full comp (100%) for legacy entries that only provided label
      let discountSpec = { type: 'full' };

      // Parse specParts (if any) which are like 'percent=50' or 'fixed_cents=500' or 'full'
      if (specParts && specParts.length) {
        // merge all spec parts (allow multiple separated by '|')
        const specs = {};
        specParts.forEach((part) => {
          if (!part) return;
          // keyword 'full'
          if (part.toLowerCase() === 'full') {
            specs.full = true;
            return;
          }
          const [k, v] = part.split('=').map((s) => (s || '').trim());
          if (!k) return;
          specs[k] = v === undefined ? '' : v;
        });

        if (specs.full) {
          discountSpec = { type: 'full' };
        } else if (specs.percent) {
          const p = Number.parseFloat(specs.percent);
          if (Number.isFinite(p) && p > 0) {
            const capCents = Number.isFinite(Number(specs.cap_cents)) ? Math.max(0, Math.round(Number(specs.cap_cents))) : 0;
            discountSpec = { type: 'percent', percent: p, capCents: capCents || 0 };
          }
        } else if (specs.fixed_cents) {
          const c = Number(specs.fixed_cents);
          if (Number.isFinite(c) && c > 0) {
            discountSpec = { type: 'fixed', fixedCents: Math.max(0, Math.round(c)) };
          }
        }
      } else {
        // No spec parts: legacy behavior -> full comp
        discountSpec = { type: 'full' };
      }

      return {
        code,
        codeLower: code.toLowerCase(),
        label,
        spec: discountSpec,
      };
    })
    .filter(Boolean);
};

const COMP_ENTRIES = parseCompEntries();

const applyPercentDiscount = (amountCents, percent, capCents) => {
  if (!Number.isFinite(percent) || percent <= 0) {
    return amountCents;
  }
  if (percent >= 100) {
    const deduction = Number.isFinite(capCents) && capCents > 0 ? Math.min(amountCents, capCents) : amountCents;
    return Math.max(0, amountCents - deduction);
  }
  const deduction = Math.floor((amountCents * percent) / 100);
  const capped = Number.isFinite(capCents) && capCents > 0 ? Math.min(deduction, capCents) : deduction;
  return Math.max(0, amountCents - capped);
};

const applyFixedDiscount = (amountCents, deduction) => {
  const value = Math.max(0, Math.round(Number(deduction) || 0));
  if (!value) {
    return amountCents;
  }
  return Math.max(0, amountCents - value);
};

const applyCrowdfundDiscount = (amountCents, discount) => {
  const baseAmount = Math.max(0, Math.round(Number(amountCents) || 0));
  if (!discount || typeof discount !== 'object') {
    return baseAmount;
  }
  if (discount.type === 'full') {
    return 0;
  }
  const reduction = discount.reduction;
  if (!reduction || typeof reduction !== 'object') {
    return baseAmount;
  }
  if (reduction.type === 'percent') {
    return applyPercentDiscount(baseAmount, Number(reduction.value), Number(reduction.capCents || 0));
  }
  if (reduction.type === 'fixed') {
    return applyFixedDiscount(baseAmount, reduction.value);
  }
  return baseAmount;
};

const resolveManualDiscount = (rawCode) => {
  const trimmed = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!trimmed) return null;
  const match = COMP_ENTRIES.find((entry) => entry.codeLower === trimmed.toLowerCase());
  if (!match) return null;

  const spec = match.spec || { type: 'full' };
  if (spec.type === 'full') {
    return {
      code: match.code,
      label: match.label,
      type: 'full',
      reduction: { type: 'percent', value: 100 },
      source: 'manual',
    };
  }
  if (spec.type === 'percent') {
    return {
      code: match.code,
      label: match.label,
      type: 'percent',
      reduction: { type: 'percent', value: Number(spec.percent), ...(spec.capCents > 0 ? { capCents: spec.capCents } : {}) },
      source: 'manual',
    };
  }
  if (spec.type === 'fixed') {
    return {
      code: match.code,
      label: match.label,
      type: 'fixed',
      reduction: { type: 'fixed', value: Number(spec.fixedCents) },
      source: 'manual',
    };
  }

  return null;
};

const SQUARE_CACHE_MS = Math.max(Number(process.env.CROWDFUND_SQUARE_DISCOUNT_CACHE_MS) || 5 * 60 * 1000, 1000);

const squareCache = {
  entries: null,
  expiresAt: 0,
  loading: null,
};

const normalizeSquareDiscount = (object) => {
  if (!object || (object.type && object.type !== 'DISCOUNT')) {
    return null;
  }
  const data = object.discountData || object.discount_data || null;
  if (!data) {
    return null;
  }

  const code = (data.name || data.label || object.id || '').trim();
  if (!code) {
    return null;
  }

  const label = data.name?.trim() || data.label?.trim() || DEFAULT_COMP_LABEL;
  const discountType = data.discountType || data.discount_type || '';

  if (discountType === 'FIXED_PERCENTAGE' || discountType === 'VARIABLE_PERCENTAGE') {
    const percentValue =
      data.percentage ??
      data.percentage_value ??
      data.percentageValue ??
      data.percent ??
      null;
    const percent = Number.parseFloat(percentValue);
    const maximumMoney =
      data.maximumAmountMoney ||
      data.maximum_amount_money ||
      data.maximum_money ||
      null;
    const capCents = getMoneyAmountCents(maximumMoney);
    if (!Number.isFinite(percent) || percent <= 0) {
      return null;
    }
    return {
      codeLower: code.toLowerCase(),
      discount: {
        code,
        label,
        type: 'percent',
        reduction: { type: 'percent', value: percent, ...(capCents > 0 ? { capCents } : {}) },
        source: 'square',
        squareDiscountId: object.id || null,
      },
    };
  }

  if (discountType === 'FIXED_AMOUNT') {
    const amount = getMoneyAmountCents(data.amountMoney || data.amount_money || data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return {
      codeLower: code.toLowerCase(),
      discount: {
        code,
        label,
        type: 'fixed',
        reduction: { type: 'fixed', value: Math.round(amount) },
        source: 'square',
        squareDiscountId: object.id || null,
      },
    };
  }

  if (discountType === 'VARIABLE_AMOUNT') {
    // Variable discounts require operator input at checkout; treat as unresolved.
    return null;
  }

  return null;
};

const loadSquareDiscountEntries = async (options = {}) => {
  const now = Date.now();
  if (squareCache.entries && now < squareCache.expiresAt) {
    return squareCache.entries;
  }
  if (squareCache.loading) {
    return squareCache.loading;
  }

  const { squareClient } = options;
  const client = squareClient && squareClient.catalogApi && typeof squareClient.catalogApi.listCatalog === 'function'
    ? squareClient
    : null;

  if (!client) {
    squareCache.entries = null;
    squareCache.expiresAt = 0;
    return [];
  }

  squareCache.loading = (async () => {
    try {
      const entries = [];
      let cursor = undefined;
      do {
        const response = await client.catalogApi.listCatalog(cursor || undefined, 'DISCOUNT');

        // Handle Square API response structure
        const result = response?.result || response;
        const objects = Array.isArray(result?.objects) ? result.objects : [];
        
        objects.forEach((object) => {
          const normalized = normalizeSquareDiscount(object);
          if (normalized) {
            entries.push(normalized);
          }
        });
        
        cursor = result?.cursor || null;
      } while (cursor);

      squareCache.entries = entries;
      squareCache.expiresAt = Date.now() + SQUARE_CACHE_MS;
      return entries;
    } catch (error) {
      squareCache.entries = [];
      squareCache.expiresAt = Date.now() + Math.min(SQUARE_CACHE_MS, 60 * 1000);
      
      // Enhanced error logging for Square API issues
      const errorDetails = {
        message: error?.message || 'Unknown error',
        statusCode: error?.statusCode || error?.status,
        body: error?.body,
        errors: error?.errors
      };
      
      if (options.logger && typeof options.logger.warn === 'function') {
        options.logger.warn({ err: errorDetails }, 'square discount load failed');
      } else {
        // eslint-disable-next-line no-console
        console.warn('[crowdfund.discount] failed to load square discounts', errorDetails);
      }
      return [];
    } finally {
      squareCache.loading = null;
    }
  })();

  return squareCache.loading;
};

const resolveCrowdfundDiscount = async (rawCode, options = {}) => {
  const trimmed = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!trimmed) {
    return null;
  }

  // First check for manual discount codes (from environment variables)
  const manual = resolveManualDiscount(rawCode);
  if (manual) {
    return manual;
  }

  // Then try Square discount codes
  try {
    const squareEntries = await loadSquareDiscountEntries(options);
    if (!Array.isArray(squareEntries) || !squareEntries.length) {
      return null;
    }
    const match = squareEntries.find((entry) => entry.codeLower === trimmed.toLowerCase());
    return match ? match.discount : null;
  } catch (error) {
    if (options.logger && typeof options.logger.warn === 'function') {
      options.logger.warn({ err: error }, 'crowdfund discount resolution failed');
    } else {
      // eslint-disable-next-line no-console
      console.warn('[crowdfund.discount] failed to resolve discount', error && error.message);
    }
    // Return null rather than throwing, so the user gets "invalid code" rather than "unable to validate"
    return null;
  }
};

const __dangerous__clearSquareDiscountCache = () => {
  squareCache.entries = null;
  squareCache.expiresAt = 0;
  squareCache.loading = null;
};

module.exports = {
  DEFAULT_COMP_LABEL,
  applyCrowdfundDiscount,
  resolveCrowdfundDiscount,
  __dangerous__clearSquareDiscountCache,
};
