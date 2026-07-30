import {describe, expect, it} from 'vitest';
import checkoutHandler from '../../../../api-handlers/store/chez-garage-at-home-checkout';
import dateSelection from '../../../../api-handlers/store/_dateSelection';

const {
  DEPOSIT_CENTS,
  isFutureOrToday,
  isValidDate,
  isValidEmail,
  sanitizeIdempotencyKey,
} = checkoutHandler.__internals;

describe('Chez Garage at-home checkout policy', () => {
  it('fixes the deposit at $200 on the server', () => {
    expect(DEPOSIT_CENTS).toBe(20000);
  });

  it('accepts valid calendar dates without an availability blocklist', () => {
    expect(isValidDate('2030-08-15')).toBe(true);
    expect(isFutureOrToday('2030-08-15')).toBe(true);
    expect(isValidDate('2030-02-30')).toBe(false);
  });

  it('uses the Minnesota business date at the UTC day boundary', () => {
    expect(dateSelection.businessTodayIso(new Date('2026-07-31T01:00:00Z'))).toBe('2026-07-30');
    expect(dateSelection.isSelectableDate('2026-07-30', new Date('2026-07-31T01:00:00Z'))).toBe(true);
  });

  it('validates customer email and sanitizes Square idempotency keys', () => {
    expect(isValidEmail('guest@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(sanitizeIdempotencyKey('chez home / attempt')).toBe('chez-home---attempt');
  });
});
