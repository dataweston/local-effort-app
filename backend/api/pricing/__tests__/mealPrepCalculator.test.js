import { describe, expect, it } from 'vitest';
import calculator from '../mealPrepCalculator';
import manifest from '../priceBookManifest';

const policy = calculator.buildMealPrepPolicy(manifest.RULES);

describe('meal-prep pricing calculator', () => {
  it('prices a weekly per-person pickup and projects paid-member credit', () => {
    const result = calculator.calculateMealPrepQuote({
      policy,
      input: {
        billingCadence: 'weekly',
        fulfillment: 'pickup',
        membership: { status: 'active_paid' },
        items: [
          { category: 'breakfast', pricingMode: 'per_person', mealsPerWeek: 3, people: 2 },
          { category: 'lunch', pricingMode: 'per_person', mealsPerWeek: 2, people: 2 },
        ],
      },
    });

    expect(result.standardSubtotalCents).toBe(14800);
    expect(result.cadenceDiscountCents).toBe(0);
    expect(result.deliveryCents).toBe(0);
    expect(result.totalCents).toBe(14800);
    expect(result.creditEarnedCents).toBe(592);
    expect(result.creditTiming).toBe('after_settlement');
  });

  it('prices four weeks of family-flat dinners with the food discount and delivery', () => {
    const result = calculator.calculateMealPrepQuote({
      policy,
      input: {
        billingCadence: 'four_week',
        fulfillment: 'delivery',
        membership: { status: 'active_paid' },
        items: [
          { category: 'dinner', pricingMode: 'family_flat', mealsPerWeek: 5, households: 1 },
        ],
      },
    });

    expect(result.standardSubtotalCents).toBe(90000);
    expect(result.cadenceDiscountCents).toBe(7200);
    expect(result.adjustedSubtotalCents).toBe(82800);
    expect(result.deliveryCents).toBe(4000);
    expect(result.totalCents).toBe(86800);
    expect(result.creditEarnedCents).toBe(3312);
  });

  it('keeps a new membership due separate from the food transaction', () => {
    const result = calculator.calculateMealPrepQuote({
      policy,
      input: {
        billingCadence: 'weekly',
        fulfillment: 'delivery',
        membership: { status: 'new_paid', billingCadence: 'annual' },
        items: [
          { category: 'dinner', pricingMode: 'per_person', mealsPerWeek: 1, people: 2 },
        ],
      },
    });

    expect(result.totalCents).toBe(5800);
    expect(result.membershipDueCents).toBe(37500);
    expect(result.customerOutlayCents).toBe(43300);
  });

  it('records negotiated changes separately from standard pricing', () => {
    const result = calculator.calculateMealPrepQuote({
      policy,
      input: {
        billingCadence: 'weekly',
        fulfillment: 'pickup',
        membership: { status: 'waived' },
        items: [
          { category: 'lunch', pricingMode: 'per_person', mealsPerWeek: 3, people: 2 },
        ],
      },
      adjustments: [
        { amountCents: -1400, reasonCode: 'customer_budget', explanation: 'Agreed weekly household rate.' },
      ],
    });

    expect(result.standardSubtotalCents).toBe(11400);
    expect(result.adjustmentCents).toBe(-1400);
    expect(result.totalCents).toBe(10000);
    expect(result.creditEarnedCents).toBe(0);
    expect(result.adjustments[0]).toMatchObject({ reasonCode: 'customer_budget', amountCents: -1400 });
  });

  it('rejects a quote without a paid membership or waiver', () => {
    expect(() => calculator.calculateMealPrepQuote({
      policy,
      input: {
        billingCadence: 'weekly',
        fulfillment: 'pickup',
        membership: { status: 'none' },
        items: [{ category: 'lunch', pricingMode: 'per_person', mealsPerWeek: 1, people: 1 }],
      },
    })).toThrow('A paid membership or waiver is required');
  });
});
