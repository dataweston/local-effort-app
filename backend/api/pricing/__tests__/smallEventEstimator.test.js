import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Required rather than imported: backend/ is CJS. Same reasoning as
// routes/__tests__/venues.test.js.
const require = createRequire(import.meta.url);
const {
  DEPOSIT_BPS,
  MAX_GUESTS,
  MIN_GUESTS,
  SERVICE_STYLES,
  VENUE_FEE_CENTS,
  estimateVenueEvent,
} = require('../smallEventEstimator.js');

const firehouse = (overrides = {}) =>
  estimateVenueEvent({
    venueSlug: 'firehouse',
    serviceStyle: 'buffet_passed',
    guestCount: 30,
    ...overrides,
  });

describe('price-book derivation', () => {
  it('reads all three service styles out of the manifest, cheapest first', () => {
    expect(SERVICE_STYLES.map((style) => style.key)).toEqual([
      'buffet_passed',
      'family_style_coursed',
      'plated_coursed',
    ]);
  });

  it('strips the bound suffix off the manifest label', () => {
    expect(SERVICE_STYLES[0].label).toBe('Buffet or passed service');
  });

  it('carries the owner-defined venue fees and deposit rate', () => {
    expect(VENUE_FEE_CENTS.firehouse).toBe(75000);
    expect(VENUE_FEE_CENTS.foodist).toBe(15000);
    expect(DEPOSIT_BPS).toBe(2000);
  });
});

describe('estimateVenueEvent', () => {
  // The worked example the pricing discovery signed off on:
  // artifacts/product-pricing-discovery-2026-09-17 — "$45 x 30 + $750".
  it('reproduces the discovery artifact’s Firehouse buffet example', () => {
    const result = firehouse();
    expect(result.ok).toBe(true);
    expect(result.estimateMinCents).toBe(210000); // $2,100
    expect(result.depositCents).toBe(42000); //     $420
    expect(result.depositPercent).toBe(20);
  });

  it('holds against the LOW rate, never the high one', () => {
    const result = firehouse();
    expect(result.estimateMaxCents).toBe(300000);
    // The deposit is 20% of the low estimate, not of the high one.
    expect(result.depositCents).toBe(Math.round(result.estimateMinCents * 0.2));
    expect(result.depositCents).toBeLessThan(Math.round(result.estimateMaxCents * 0.2));
  });

  it('adds the venue fee once, not per guest', () => {
    const small = firehouse({ guestCount: 10 });
    const large = firehouse({ guestCount: 20 });
    expect(large.estimateMinCents - small.estimateMinCents).toBe(10 * 4500);
  });

  it('prices the same party differently per service style', () => {
    expect(firehouse({ serviceStyle: 'family_style_coursed' }).estimateMinCents).toBe(
      65 * 100 * 30 + 75000,
    );
    expect(firehouse({ serviceStyle: 'plated_coursed' }).estimateMinCents).toBe(
      105 * 100 * 30 + 75000,
    );
  });

  it('charges the Foodist fee at Foodist', () => {
    const result = firehouse({ venueSlug: 'foodist' });
    expect(result.venueFeeCents).toBe(15000);
    expect(result.estimateMinCents).toBe(135000 + 15000);
  });

  it('keeps money in integer cents', () => {
    for (const style of SERVICE_STYLES) {
      for (const guestCount of [MIN_GUESTS, 13, 47, MAX_GUESTS]) {
        const result = firehouse({ serviceStyle: style.key, guestCount });
        expect(Number.isInteger(result.estimateMinCents)).toBe(true);
        expect(Number.isInteger(result.depositCents)).toBe(true);
      }
    }
  });
});

describe('rejects input it cannot price', () => {
  it('refuses an unknown service style', () => {
    expect(firehouse({ serviceStyle: 'chefs_table' })).toEqual({
      ok: false,
      error: 'unknown-service-style',
    });
  });

  it('refuses a venue with no fee rule — Hopkins is not bookable', () => {
    expect(firehouse({ venueSlug: 'hopkins' }).error).toBe('unknown-venue');
  });

  it.each([
    ['below the staffing floor', MIN_GUESTS - 1],
    ['above the sanity cap', MAX_GUESTS + 1],
    ['zero', 0],
    ['negative', -30],
    ['not a number', 'thirty'],
    ['missing', undefined],
  ])('refuses a guest count %s', (_label, guestCount) => {
    expect(firehouse({ guestCount }).error).toBe('guest-count-out-of-range');
  });

  it('floors a fractional guest count rather than pricing half a person', () => {
    expect(firehouse({ guestCount: 30.9 }).guestCount).toBe(30);
  });
});
