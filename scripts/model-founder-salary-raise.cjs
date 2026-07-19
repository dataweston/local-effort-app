const inputs = {
  period: { start: '2026-04-01', end: '2026-06-30', completeMonths: 3 },
  revenue: 29247.01,
  cogs: 10231.81,
  operatingExpenses: 13338.24,
  nonFounderLabor: 2626.00,
  founderAnnualCompensation: 160000.00,
  contingencyRate: 0.15,
};

const grossMarginRate = 1 - inputs.cogs / inputs.revenue;
const currentMonthlyRevenue = inputs.revenue / inputs.period.completeMonths;
const currentAnnualRevenueRunRate = currentMonthlyRevenue * 12;
const monthlyNonFounderCosts =
  (inputs.operatingExpenses + inputs.nonFounderLabor) / inputs.period.completeMonths;
const monthlyFounderCompensation = inputs.founderAnnualCompensation / 12;
const currentMonthlyOperatingContribution =
  (inputs.revenue - inputs.cogs - inputs.operatingExpenses - inputs.nonFounderLabor) /
  inputs.period.completeMonths;
const currentMonthlyBurnWithFounderComp =
  monthlyFounderCompensation - currentMonthlyOperatingContribution;

function revenueForMargin(targetMarginRate) {
  const monthlyRevenue =
    (monthlyNonFounderCosts + monthlyFounderCompensation) /
    (grossMarginRate - targetMarginRate);
  return { monthlyRevenue, annualRevenue: monthlyRevenue * 12 };
}

function raiseForRunway(months) {
  const beforeContingency = currentMonthlyBurnWithFounderComp * months;
  return {
    months,
    beforeContingency,
    contingency: beforeContingency * inputs.contingencyRate,
    total: beforeContingency * (1 + inputs.contingencyRate),
  };
}

const output = {
  inputs,
  derived: {
    grossMarginRate,
    currentMonthlyRevenue,
    currentAnnualRevenueRunRate,
    monthlyNonFounderCosts,
    monthlyFounderCompensation,
    currentMonthlyOperatingContribution,
    currentMonthlyBurnWithFounderComp,
  },
  revenueScenarios: [0, 0.05, 0.10, 0.15].map((margin) => ({
    targetOperatingMarginRate: margin,
    ...revenueForMargin(margin),
  })),
  raiseScenarios: [12, 15, 18].map(raiseForRunway),
  recommendation: {
    raiseTarget: 225000,
    rationale: 'Rounded above the 15-month runway result to preserve a small execution reserve.',
    annualRevenueTarget: 400000,
    targetInterpretation: 'Practical operating target; approximately 9% operating margin at the modeled cost structure.',
    exactTenPercentMarginRevenue: revenueForMargin(0.10).annualRevenue,
  },
};

console.log(JSON.stringify(output, null, 2));
