import { describe, it, expect } from 'vitest';

const { describePaymentError } = require('../../backend/api/finance/paymentErrors');
const { sanitizeMeta } = require('../../api-handlers/store/_eventPayload');

describe('describePaymentError', () => {
  it('turns the real Pizza on Smith decline into plain, fixable guidance without raw JSON', () => {
    const result = describePaymentError({
      errors: [
        { code: 'TRANSACTION_LIMIT', category: 'PAYMENT_METHOD_ERROR', detail: "Authorization error: 'TRANSACTION_LIMIT'" },
        { code: 'ADDRESS_VERIFICATION_FAILURE', category: 'PAYMENT_METHOD_ERROR' },
      ],
    });

    expect(result.isPaymentError).toBe(true);
    expect(result.codes).toEqual(['TRANSACTION_LIMIT', 'ADDRESS_VERIFICATION_FAILURE']);
    expect(result.message).toMatch(/ZIP code/);
    expect(result.message).toMatch(/bank/);
    expect(result.message).toMatch(/not been charged/);
    expect(result.message).not.toMatch(/[\[{"]|_FAILURE|TRANSACTION_LIMIT/);
  });

  it('falls back to a card-level message for an unknown payment-method code', () => {
    const result = describePaymentError({ errors: [{ code: 'SOMETHING_NEW', category: 'PAYMENT_METHOD_ERROR' }] });
    expect(result.message).toMatch(/card could not be processed/);
    expect(result.code).toBe('SOMETHING_NEW');
  });

  it('does not claim an ordinary exception is a card problem', () => {
    expect(describePaymentError(new Error('boom')).isPaymentError).toBe(false);
  });
});

describe('checkout failure event metadata', () => {
  it('keeps where and why a checkout failed, and still redacts contact details', () => {
    const meta = sanitizeMeta({
      stage: 'verify',
      code: 'TRANSACTION_LIMIT',
      declineCodes: 'TRANSACTION_LIMIT,ADDRESS_VERIFICATION_FAILURE',
      origin: 'client',
      httpStatus: 402,
      reason: 'Declined for buyer@example.com',
      cardNumber: '4111111111111111',
    });

    expect(meta).toMatchObject({
      stage: 'verify',
      code: 'TRANSACTION_LIMIT',
      declineCodes: 'TRANSACTION_LIMIT,ADDRESS_VERIFICATION_FAILURE',
      origin: 'client',
      httpStatus: 402,
    });
    expect(meta.reason).toBe('Declined for [redacted]');
    expect(meta).not.toHaveProperty('cardNumber');
  });
});
