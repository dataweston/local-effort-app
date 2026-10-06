import { describe, expect, it } from 'vitest';

const { parseQuote } = require('../menuQuoteExtractor');

describe('event quote normalization', () => {
  it('accepts a formatted per-guest amount', () => {
    expect(parseQuote({ payload: { bodyPreview: 'For 24 guests, the menu is $1,000 per person.' } })).toEqual(expect.objectContaining({
      perGuestLow: 1000,
      perGuestHigh: null,
      guestCount: 24,
    }));
  });

  it('does not treat an arbitrary dollar amount as a quote', () => {
    expect(parseQuote({ payload: { bodyPreview: 'Your refund of $25 is complete.' } })).toBeNull();
  });
});
