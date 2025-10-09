const DEFAULT_COMP_LABEL = 'Complimentary contribution';

const parseCompEntries = () => {
  const raw = process.env.CROWDFUND_COMP_CODES || '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [codePart, ...labelParts] = entry.split(':');
      const code = (codePart || '').trim();
      if (!code) {
        return null;
      }
      const label = labelParts.join(':').trim();
      return {
        code,
        codeLower: code.toLowerCase(),
        label: label || DEFAULT_COMP_LABEL,
      };
    })
    .filter(Boolean);
};

const COMP_ENTRIES = parseCompEntries();

const applyPercentDiscount = (amountCents, percent) => {
  if (!Number.isFinite(percent) || percent <= 0) {
    return amountCents;
  }
  if (percent >= 100) {
    return 0;
  }
  const multiplier = 1 - percent / 100;
  return Math.max(0, Math.round(amountCents * multiplier));
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
    return applyPercentDiscount(baseAmount, Number(reduction.value));
  }
  if (reduction.type === 'fixed') {
    return applyFixedDiscount(baseAmount, reduction.value);
  }
  return baseAmount;
};

const resolveManualDiscount = (rawCode) => {
  const trimmed = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!trimmed) {
    return null;
  }
  const match = COMP_ENTRIES.find((entry) => entry.codeLower === trimmed.toLowerCase());
  if (!match) {
    return null;
  }
  return {
    code: match.code,
    label: match.label,
    type: 'full',
    reduction: { type: 'percent', value: 100 },
    source: 'manual',
  };
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
    const percentValue = data.percentage
      ?? data.percentage_value
      ?? data.percentageValue
      ?? data.percent
      ?? null;
    const percent = Number.parseFloat(percentValue);
    if (!Number.isFinite(percent) || percent <= 0) {
      return null;
    }
    if (percent >= 100) {
      return {
        codeLower: code.toLowerCase(),
        discount: {
          code,
          label,
          type: 'full',
          reduction: { type: 'percent', value: 100 },
          source: 'square',
          squareDiscountId: object.id || null,
        },
      };
    }
    return {
      codeLower: code.toLowerCase(),
      discount: {
        code,
        label,
        type: 'percent',
        reduction: { type: 'percent', value: percent },
        source: 'square',
        squareDiscountId: object.id || null,
      },
    };
  }

  if (discountType === 'FIXED_AMOUNT') {
    const amount = Number(data.amountMoney?.amount ?? data.amount_money?.amount ?? 0);
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
        const response = await client.catalogApi.listCatalog(cursor, 'DISCOUNT');
        const objects = Array.isArray(response?.result?.objects)
          ? response.result.objects
          : Array.isArray(response?.objects)
            ? response.objects
            : [];
        objects.forEach((object) => {
          const normalized = normalizeSquareDiscount(object);
          if (normalized) {
            entries.push(normalized);
          }
        });
        cursor = response?.result?.cursor || response?.cursor || null;
      } while (cursor);

      squareCache.entries = entries;
      squareCache.expiresAt = Date.now() + SQUARE_CACHE_MS;
      return entries;
    } catch (error) {
      squareCache.entries = [];
      squareCache.expiresAt = Date.now() + Math.min(SQUARE_CACHE_MS, 60 * 1000);
      if (options.logger && typeof options.logger.warn === 'function') {
        options.logger.warn({ err: error }, 'square discount load failed');
      } else {
        // eslint-disable-next-line no-console
        console.warn('[crowdfund.discount] failed to load square discounts', error && error.message);
      }
      return [];
    } finally {
      squareCache.loading = null;
    }
  })();

  return squareCache.loading;
};

const resolveCrowdfundDiscount = async (rawCode, options = {}) => {
  const manual = resolveManualDiscount(rawCode);
  if (manual) {
    return manual;
  }

  const trimmed = typeof rawCode === 'string' ? rawCode.trim() : '';
  if (!trimmed) {
    return null;
  }

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
