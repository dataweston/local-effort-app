import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import {
  DEPOSIT_BPS,
  MAX_GUESTS,
  MIN_GUESTS,
  SERVICE_STYLES,
  VENUE_FEE_CENTS,
  estimateEvent,
  usd,
} from '../src/config/eventPricing.js';

// The guard described at the top of eventPricing.js. backend/ is CJS, so the
// manifest is required rather than imported.
const require = createRequire(import.meta.url);
const estimator = require('../backend/api/pricing/smallEventEstimator.js');

describe('the shipped prices match the owner price book', () => {
  it('carries the same service styles, labels and bounds', () => {
    expect(SERVICE_STYLES).toEqual(
      estimator.SERVICE_STYLES.map((style) => ({
        key: style.key,
        label: style.label,
        minCents: style.minCents,
        maxCents: style.maxCents,
      })),
    );
  });

  it('carries the same venue fees, deposit rate and guest bounds', () => {
    expect(VENUE_FEE_CENTS).toEqual(estimator.VENUE_FEE_CENTS);
    expect(DEPOSIT_BPS).toBe(estimator.DEPOSIT_BPS);
    expect(MIN_GUESTS).toBe(estimator.MIN_GUESTS);
    expect(MAX_GUESTS).toBe(estimator.MAX_GUESTS);
  });

  it('computes the identical deposit to the server, across the grid', () => {
    for (const style of SERVICE_STYLES) {
      for (const venueSlug of Object.keys(VENUE_FEE_CENTS)) {
        for (const guestCount of [MIN_GUESTS, 12, 30, 63, MAX_GUESTS]) {
          const client = estimateEvent({ venueSlug, serviceStyle: style.key, guestCount });
          const server = estimator.estimateVenueEvent({
            venueSlug,
            serviceStyle: style.key,
            guestCount,
          });
          expect(client.estimateMinCents).toBe(server.estimateMinCents);
          expect(client.estimateMaxCents).toBe(server.estimateMaxCents);
          expect(client.depositCents).toBe(server.depositCents);
        }
      }
    }
  });
});

describe('estimateEvent', () => {
  it('returns null rather than a wrong number for unusable input', () => {
    expect(estimateEvent({ venueSlug: 'firehouse', serviceStyle: 'x', guestCount: 30 })).toBeNull();
    expect(estimateEvent({ venueSlug: 'hopkins', serviceStyle: 'buffet_passed', guestCount: 30 })).toBeNull();
    expect(estimateEvent({ venueSlug: 'firehouse', serviceStyle: 'buffet_passed', guestCount: 2 })).toBeNull();
  });

  it('formats money as whole dollars with a thousands separator', () => {
    expect(usd(210000)).toBe('$2,100');
    expect(usd(42000)).toBe('$420');
    expect(usd(null)).toBeNull();
  });
});
