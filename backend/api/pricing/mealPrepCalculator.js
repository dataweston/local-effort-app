const REQUIRED_RULES = [
  'meal_prep.breakfast.per_person',
  'meal_prep.lunch.per_person',
  'meal_prep.dinner.per_person',
  'meal_prep.dinner.family_flat',
  'meal_prep.delivery.weekly',
  'meal_prep.billing.four_week_discount',
  'meal_prep.reward.paid_member',
  'meal_prep.membership.annual',
  'meal_prep.membership.monthly',
  'meal_prep.membership.waiver',
];

function requirePositiveInt(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

function readNumber(ruleMap, key, field) {
  const value = ruleMap.get(key)?.[field];
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Published price book is missing ${key}.${field}`);
  }
  return value;
}

function buildMealPrepPolicy(rules) {
  const ruleMap = new Map((rules || []).map((rule) => [rule.ruleKey, rule]));
  for (const key of REQUIRED_RULES) {
    if (!ruleMap.has(key)) throw new Error(`Published price book is missing ${key}`);
  }
  return {
    perPersonCents: {
      breakfast: readNumber(ruleMap, 'meal_prep.breakfast.per_person', 'amountCents'),
      lunch: readNumber(ruleMap, 'meal_prep.lunch.per_person', 'amountCents'),
      dinner: readNumber(ruleMap, 'meal_prep.dinner.per_person', 'amountCents'),
    },
    familyDinnerCents: readNumber(ruleMap, 'meal_prep.dinner.family_flat', 'amountCents'),
    weeklyDeliveryCents: readNumber(ruleMap, 'meal_prep.delivery.weekly', 'amountCents'),
    fourWeekDiscountBps: readNumber(ruleMap, 'meal_prep.billing.four_week_discount', 'rateBps'),
    paidMemberCreditBps: readNumber(ruleMap, 'meal_prep.reward.paid_member', 'rateBps'),
    membershipCents: {
      annual: readNumber(ruleMap, 'meal_prep.membership.annual', 'amountCents'),
      monthly: readNumber(ruleMap, 'meal_prep.membership.monthly', 'amountCents'),
      waiver: readNumber(ruleMap, 'meal_prep.membership.waiver', 'amountCents'),
    },
  };
}

function calculateMealPrepQuote({ policy, input, adjustments = [] }) {
  if (!policy || !input) throw new Error('policy and input are required');
  const weeks = input.billingCadence === 'four_week' ? 4 : input.billingCadence === 'weekly' ? 1 : 0;
  if (!weeks) throw new Error('billingCadence must be weekly or four_week');
  if (!['pickup', 'delivery'].includes(input.fulfillment)) {
    throw new Error('fulfillment must be pickup or delivery');
  }
  if (!['active_paid', 'new_paid', 'waived'].includes(input.membership?.status)) {
    throw new Error('A paid membership or waiver is required');
  }
  if (input.membership.status === 'new_paid' && !['annual', 'monthly'].includes(input.membership.billingCadence)) {
    throw new Error('New paid memberships require annual or monthly billing');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('At least one meal-prep item is required');
  }

  const lines = input.items.map((item, index) => {
    const mealsPerWeek = requirePositiveInt(item.mealsPerWeek, `items[${index}].mealsPerWeek`);
    if (item.pricingMode === 'family_flat') {
      if (item.category !== 'dinner') throw new Error('Family-flat pricing is available for dinner only');
      const households = requirePositiveInt(item.households || 1, `items[${index}].households`);
      const quantity = mealsPerWeek * households * weeks;
      return {
        category: 'dinner',
        pricingMode: 'family_flat',
        quantity,
        unitPriceCents: policy.familyDinnerCents,
        totalCents: quantity * policy.familyDinnerCents,
      };
    }

    if (item.pricingMode !== 'per_person' || !Object.hasOwn(policy.perPersonCents, item.category)) {
      throw new Error(`Unsupported meal-prep pricing mode at items[${index}]`);
    }
    const people = requirePositiveInt(item.people, `items[${index}].people`);
    const quantity = mealsPerWeek * people * weeks;
    return {
      category: item.category,
      pricingMode: 'per_person',
      quantity,
      unitPriceCents: policy.perPersonCents[item.category],
      totalCents: quantity * policy.perPersonCents[item.category],
    };
  });

  const standardSubtotalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  const cadenceDiscountCents = input.billingCadence === 'four_week'
    ? Math.round((standardSubtotalCents * policy.fourWeekDiscountBps) / 10000)
    : 0;
  const standardAfterDiscountCents = standardSubtotalCents - cadenceDiscountCents;

  const normalizedAdjustments = (adjustments || []).map((adjustment, index) => {
    if (!Number.isInteger(adjustment.amountCents) || adjustment.amountCents === 0) {
      throw new Error(`adjustments[${index}].amountCents must be a non-zero integer`);
    }
    if (!String(adjustment.reasonCode || '').trim() || !String(adjustment.explanation || '').trim()) {
      throw new Error(`adjustments[${index}] requires a reasonCode and explanation`);
    }
    return {
      scope: 'subtotal',
      amountCents: adjustment.amountCents,
      reasonCode: String(adjustment.reasonCode).trim(),
      explanation: String(adjustment.explanation).trim(),
    };
  });
  const adjustmentCents = normalizedAdjustments.reduce((sum, item) => sum + item.amountCents, 0);
  const adjustedSubtotalCents = standardAfterDiscountCents + adjustmentCents;
  if (adjustedSubtotalCents < 0) throw new Error('Adjustments cannot reduce the food subtotal below zero');

  const deliveryCents = input.fulfillment === 'delivery' ? policy.weeklyDeliveryCents * weeks : 0;
  const totalCents = adjustedSubtotalCents + deliveryCents;
  const paidMembership = input.membership.status !== 'waived';
  const creditEarnedCents = paidMembership
    ? Math.round((adjustedSubtotalCents * policy.paidMemberCreditBps) / 10000)
    : 0;
  const membershipDueCents = input.membership.status === 'new_paid'
    ? policy.membershipCents[input.membership.billingCadence]
    : 0;

  return {
    currency: 'USD',
    weeks,
    lines,
    standardSubtotalCents,
    cadenceDiscountCents,
    standardAfterDiscountCents,
    adjustments: normalizedAdjustments,
    adjustmentCents,
    adjustedSubtotalCents,
    deliveryCents,
    totalCents,
    membershipDueCents,
    customerOutlayCents: totalCents + membershipDueCents,
    creditEarnedCents,
    creditTiming: paidMembership ? 'after_settlement' : 'not_eligible',
  };
}

module.exports = { buildMealPrepPolicy, calculateMealPrepQuote };
