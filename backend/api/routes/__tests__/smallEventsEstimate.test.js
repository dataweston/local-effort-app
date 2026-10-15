import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Required rather than imported for the same reason as venues.test.js: backend/ is CJS.
const require = createRequire(import.meta.url);
const { computeEstimate, resolveServiceStyle } = require('../smallEvents.js');

describe('small events estimate uses the shared price book', () => {
  it('prices family-style service per guest with a 20% deposit on the low end', () => {
    const result = computeEstimate('dinner', { guestCount: 20, serviceStyle: 'family_style_coursed' });
    expect(result).toMatchObject({
      ok: true,
      guestCount: 20,
      serviceStyle: 'family_style_coursed',
      estimateMinCents: 6500 * 20,
      estimateMaxCents: 9500 * 20,
      subtotalCents: 6500 * 20,
      depositPercent: 20,
      depositAmountCents: 6500 * 20 * 0.2,
    });
  });

  it('has no party minimum, staffing line or taper for small parties', () => {
    const small = computeEstimate('pizza', { guestCount: 8, serviceStyle: 'buffet_passed' });
    expect(small.estimateMinCents).toBe(4500 * 8);
    const large = computeEstimate('holiday', { guestCount: 200, serviceStyle: 'buffet_passed' });
    expect(large.estimateMinCents).toBe(4500 * 200);
  });

  it('accepts guest counts sent as form strings', () => {
    const result = computeEstimate('dinner', { guestCount: '12', serviceStyle: 'plated_coursed' });
    expect(result.estimateMinCents).toBe(10500 * 12);
    expect(result.estimateMaxCents).toBe(25000 * 12);
  });

  it('keeps admin deposit overrides, with a flat amount winning over a percent', () => {
    const base = { guestCount: 10, serviceStyle: 'buffet_passed' };
    const percent = computeEstimate('dinner', { ...base, depositOverridePercent: 30 });
    expect(percent.depositPercent).toBe(30);
    expect(percent.depositAmountCents).toBe(Math.round(4500 * 10 * 0.3));
    const flat = computeEstimate('dinner', { ...base, depositOverridePercent: 30, depositOverrideAmount: 125 });
    expect(flat.depositAmountCents).toBe(12500);
  });

  it('rejects guest counts outside the price book range', () => {
    expect(computeEstimate('dinner', { guestCount: 7, serviceStyle: 'buffet_passed' }))
      .toEqual({ ok: false, error: 'guest-count-out-of-range' });
    expect(computeEstimate('dinner', { guestCount: 201, serviceStyle: 'buffet_passed' }))
      .toEqual({ ok: false, error: 'guest-count-out-of-range' });
  });

  it('rejects unknown service styles and event types', () => {
    expect(computeEstimate('dinner', { guestCount: 12, serviceStyle: 'tasting_menu' }))
      .toEqual({ ok: false, error: 'unknown-service-style' });
    expect(computeEstimate('wedding', { guestCount: 12, serviceStyle: 'buffet_passed' }))
      .toEqual({ ok: false, error: 'invalid-type' });
  });

  it('maps retired meal-size values from saved estimates onto the default style', () => {
    for (const retired of ['full', 'between', 'light', '']) {
      expect(resolveServiceStyle(retired)).toBe('buffet_passed');
    }
    expect(resolveServiceStyle('tasting_menu')).toBeNull();
  });
});
