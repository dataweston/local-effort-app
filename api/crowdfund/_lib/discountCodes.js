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

const resolveCrowdfundDiscount = (rawCode) => {
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
  };
};

module.exports = {
  DEFAULT_COMP_LABEL,
  resolveCrowdfundDiscount,
  applyCrowdfundDiscount,
};
