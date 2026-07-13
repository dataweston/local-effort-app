import { describe, it, expect } from 'vitest';
import reconcile from '../vendorPaymentReconcile';
const { candidateScore } = reconcile;

describe('vendor payment reconciliation scoring', () => {
  it('strongly matches exact amount, vendor and invoice reference', () => {
    const invoice = { occurredAt: '2026-01-01', payload: { amountCents: 12500, currency: 'USD', vendorEntityId: 'v1', invoiceNumber: 'INV-42' } };
    const payment = { occurredAt: '2026-01-03', payload: { amountCents: 12500, currency: 'USD', vendorEntityId: 'v1', note: 'INV-42' } };
    expect(candidateScore(invoice, payment).score).toBe(1);
  });
  it('does not accept amount-only evidence as a match', () => {
    const invoice = { occurredAt: '2026-01-01', payload: { amountCents: 12500 } };
    const payment = { occurredAt: '2026-04-01', payload: { amountCents: 12500 } };
    expect(candidateScore(invoice, payment).score).toBeLessThan(0.65);
  });
});
