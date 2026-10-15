#!/usr/bin/env node
'use strict';

// Planning inputs, not observed costs or adopted dues. Keep this model separate
// from checkout, membership entitlements, payroll, and the capitalization ledger.
const assumptions = Object.freeze({
  coordinationHoursPerMonth: 6,
  coordinationHourlyCost: 35,
  softwarePerMonth: 40,
  insuranceAllocationPerMonth: 75,
  educationAndPromotionPerMonth: 100,
  reserveContributionPerMonth: 75,
  variableCostPerMember: 5,
  collectionRate: 0.9,
  processingRate: 0.03,
  processingFixedPerCollection: 0.3,
});

function duesScenario({ members, monthlyDues, inputs = assumptions }) {
  if (!Number.isInteger(members) || members < 0 || !Number.isFinite(monthlyDues) || monthlyDues < 0) {
    throw new RangeError('Members must be a nonnegative integer and dues a nonnegative amount.');
  }
  const fixedBudget = inputs.coordinationHoursPerMonth * inputs.coordinationHourlyCost
    + inputs.softwarePerMonth + inputs.insuranceAllocationPerMonth
    + inputs.educationAndPromotionPerMonth + inputs.reserveContributionPerMonth;
  const collections = members * inputs.collectionRate;
  const grossCollected = collections * monthlyDues;
  const processing = monthlyDues > 0
    ? grossCollected * inputs.processingRate + collections * inputs.processingFixedPerCollection : 0;
  const costs = fixedBudget + members * inputs.variableCostPerMember;
  const netAvailable = grossCollected - processing;
  const contributionPerMember = inputs.collectionRate * (monthlyDues * (1 - inputs.processingRate)
    - (monthlyDues > 0 ? inputs.processingFixedPerCollection : 0)) - inputs.variableCostPerMember;
  return {
    members, monthlyDues, fixedBudget, grossCollected, processing, costs,
    monthlyBalance: netAvailable - costs,
    breakEvenMembers: contributionPerMember > 0 ? Math.ceil(fixedBudget / contributionPerMember) : null,
  };
}

function patronageExample({ allocableSurplus, memberHours, totalHours, retainedFraction }) {
  if (![allocableSurplus, memberHours, totalHours, retainedFraction].every(Number.isFinite)
    || allocableSurplus < 0 || memberHours < 0 || totalHours <= 0
    || memberHours > totalHours || retainedFraction < 0 || retainedFraction > 1) {
    throw new RangeError('Use nonnegative allocable surplus, reconciled hours, and a retained fraction from zero to one.');
  }
  const allocation = allocableSurplus * memberHours / totalHours;
  return { allocation, retainedCapital: allocation * retainedFraction, cash: allocation * (1 - retainedFraction) };
}

module.exports = { assumptions, duesScenario, patronageExample };

if (require.main === module) {
  console.log('CHEF COOPERATIVE — DESIGN SCENARIOS ONLY; NOT ADOPTED POLICY OR OBSERVED COSTS');
  console.log(JSON.stringify({ assumptions, scenarios: [25, 50, 75].flatMap((monthlyDues) =>
    [6, 12, 18].map((members) => duesScenario({ members, monthlyDues }))),
  patronageExample: patronageExample({ allocableSurplus: 10000, memberHours: 120, totalHours: 2400, retainedFraction: 0.5 }) }, null, 2));
}
