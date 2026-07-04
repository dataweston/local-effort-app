import { describe, expect, it } from 'vitest';
import payloadHelpers from '../../../../api-handlers/store/_eventPayload';

const {
  sanitizeCheckoutEvent,
  sanitizeAcquisition,
  checkoutEventSourceId,
} = payloadHelpers;

describe('store event payload sanitization', () => {
  it('keeps bounded commerce fields and drops arbitrary or PII-shaped metadata', () => {
    const event = sanitizeCheckoutEvent({
      event: 'payment.failed',
      store: 'july-dinner',
      sessionId: 'checkout_123',
      meta: {
        amountCents: 4200.4,
        itemCount: 2,
        leadType: 'meal_prep_intake',
        reason: 'Card failed for guest@example.com or 612-555-1212',
        customerEmail: 'guest@example.com',
        nested: { unbounded: true },
      },
    });

    expect(event).toEqual({
      event: 'payment.failed',
      store: 'july-dinner',
      sessionId: 'checkout_123',
      meta: {
        reason: 'Card failed for [redacted] or [redacted]',
        leadType: 'meal_prep_intake',
        itemCount: 2,
        amountCents: 4200,
      },
    });
  });

  it('normalizes acquisition aliases and strips URL query strings', () => {
    const acquisition = sanitizeAcquisition({
      firstTouch: {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'Summer Sale 2026',
        gclid: 'abc_123-XYZ',
        landing_page: '/sale?email=guest@example.com&utm_source=google',
      },
      lastTouch: {
        source: 'google',
        term: 'chef guest@example.com',
        referrer: 'https://www.google.com/search?q=private+chef',
      },
    });

    expect(acquisition).toEqual({
      firstTouch: {
        source: 'google',
        medium: 'cpc',
        campaign: 'Summer Sale 2026',
        gclid: 'abc_123-XYZ',
        landingPage: '/sale',
      },
      lastTouch: {
        source: 'google',
        term: 'chef [redacted]',
        referrer: 'https://www.google.com/search',
      },
    });
  });

  it('deduplicates completed orders but gives intermediate events unique IDs', () => {
    const order = {
      event: 'order.placed',
      store: 'psyche',
      sessionId: 'checkout_123',
      meta: { paymentId: 'payment_456' },
    };
    expect(checkoutEventSourceId(order)).toBe('checkout:psyche:order:payment_456');
    expect(checkoutEventSourceId(order)).toBe(checkoutEventSourceId(order));

    const attempt = { ...order, event: 'payment.attempted' };
    expect(checkoutEventSourceId(attempt)).not.toBe(checkoutEventSourceId(attempt));
  });
});
