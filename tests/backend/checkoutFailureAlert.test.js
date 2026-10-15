import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildCheckoutFailureAlert, shouldAlertOwner } = require('../../backend/api/finance/checkoutFailureAdvice');
const { queueCheckoutFailureAlert } = require('../../api-handlers/store/_failureAlert');

const base = {
  store: 'pizza-on-smith',
  sessionId: 'sess-1',
  stage: 'square',
  status: 402,
  code: 'TRANSACTION_LIMIT',
  declineCodes: 'TRANSACTION_LIMIT,ADDRESS_VERIFICATION_FAILURE',
  reason: 'Your card issuer declined this amount. You have not been charged.',
  amountCents: 9100,
  occurredAt: new Date('2026-10-15T15:16:00Z'),
  ownerEmail: 'owner@example.test',
  senderEmail: 'sender@example.test',
};

describe('checkout failure owner alert', () => {
  it('pages for real customer blocks but not bot/validation rejects', () => {
    expect(shouldAlertOwner({ stage: 'square', status: 402 })).toBe(true);
    expect(shouldAlertOwner({ stage: 'config', status: 503 })).toBe(true);
    expect(shouldAlertOwner({ stage: 'server', status: 500 })).toBe(true);
    expect(shouldAlertOwner({ stage: 'validation', status: 409, code: 'catalog-price-changed' })).toBe(true);
    expect(shouldAlertOwner({ stage: 'validation', status: 400 })).toBe(false);
    expect(shouldAlertOwner({ stage: 'server', status: 422 })).toBe(false);
  });

  it('tells the owner what failed, in Central time, with no buyer contact details', () => {
    const { payload, idempotencyKey } = buildCheckoutFailureAlert({ ...base, reason: 'Bad <b>card</b>' });
    expect(payload.to).toEqual([{ email: 'owner@example.test' }]);
    expect(payload.subject).toBe('Checkout failed: pizza-on-smith $91.00 (TRANSACTION_LIMIT,ADDRESS_VERIFICATION_FAILURE)');
    expect(payload.textContent).toContain('Oct 15, 2026');
    expect(payload.textContent).toContain('Central');
    expect(payload.textContent).toContain('Payment limits');
    expect(payload.htmlContent).toContain('Bad &lt;b&gt;card&lt;/b&gt;');
    expect(payload.htmlContent).not.toContain('<b>card</b>');
    expect(idempotencyKey).toBe('checkout-failure-alert:sess-1');
  });

  it('collapses repeated non-decline failures into one alert per hour', () => {
    const outage = { ...base, stage: 'config', code: undefined, declineCodes: undefined };
    const a = buildCheckoutFailureAlert(outage).idempotencyKey;
    const b = buildCheckoutFailureAlert({ ...outage, sessionId: 'other', occurredAt: new Date('2026-10-15T15:50:00Z') }).idempotencyKey;
    const c = buildCheckoutFailureAlert({ ...outage, occurredAt: new Date('2026-10-15T16:01:00Z') }).idempotencyKey;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('queues durably, attempts one send, and never throws into checkout', async () => {
    process.env.SUPPORT_INBOX_EMAIL = 'owner@example.test';
    process.env.SENDER_EMAIL = 'sender@example.test';
    const enqueue = vi.fn().mockResolvedValue({ id: 'out-1', deduped: false });
    const processBatch = vi.fn().mockResolvedValue({});
    const result = await queueCheckoutFailureAlert({ emailOutboxService: { enqueue, processBatch }, ...base });
    expect(result).toEqual({ queued: true, deduped: false });
    expect(enqueue.mock.calls[0][0]).toMatchObject({ source: 'checkout-failure-alert', category: 'transactional' });
    expect(processBatch).toHaveBeenCalledWith({ ids: ['out-1'], limit: 1 });

    enqueue.mockClear();
    processBatch.mockClear();
    enqueue.mockResolvedValue({ id: 'out-1', deduped: true });
    await queueCheckoutFailureAlert({ emailOutboxService: { enqueue, processBatch }, ...base });
    expect(processBatch).not.toHaveBeenCalled();

    const failing = { enqueue: vi.fn().mockRejectedValue(new Error('sanity down')) };
    await expect(queueCheckoutFailureAlert({ emailOutboxService: failing, ...base }))
      .resolves.toEqual({ queued: false, reason: 'error' });
  });
});
