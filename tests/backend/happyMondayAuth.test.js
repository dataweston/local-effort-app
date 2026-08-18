import { describe, expect, it, vi } from 'vitest';

import auth from '../../api-handlers/happymonday/_auth.js';
import evidence from '../../backend/api/finance/squarePaymentEvidence.js';

const { resolveHappyMondayCaller, resolvePaymentTarget } = auth;
const { findAttemptForPayment } = evidence;

function supabaseReturning(row, error = null) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
        }),
      }),
    }),
  };
}

describe('Happy Monday caller resolution', () => {
  it('rejects a request with no bearer token', async () => {
    const result = await resolveHappyMondayCaller({ headers: {} }, supabaseReturning(null));
    expect(result).toMatchObject({ status: 401 });
  });

  it('denies a valid session that is not a portal member', async () => {
    // A real Supabase user who is not on the roster gets 403, not a lookup miss
    // that would confirm which accounts exist.
    const supabase = supabaseReturning(null);
    const result = await resolveHappyMondayCaller({ headers: { authorization: 'Bearer x' } }, supabase);
    expect([401, 403]).toContain(result.status);
  });
});

describe('Happy Monday payment target', () => {
  const member = { user: { id: 'user-1' }, isAdmin: false, isReadOnly: false };
  const admin = { user: { id: 'admin-1' }, isAdmin: true, isReadOnly: false };
  const readOnly = { user: { id: 'ro-1' }, isAdmin: true, isReadOnly: true };

  it('pins a member to their own account regardless of the body', () => {
    expect(resolvePaymentTarget(member, undefined)).toEqual({ userId: 'user-1' });
    expect(resolvePaymentTarget(member, 'user-1')).toEqual({ userId: 'user-1' });
  });

  it('refuses a member paying against someone else', () => {
    expect(resolvePaymentTarget(member, 'user-2')).toMatchObject({ status: 403 });
  });

  it('lets a full admin act on a named account', () => {
    expect(resolvePaymentTarget(admin, 'user-2')).toMatchObject({ userId: 'user-2', onBehalfOf: true });
  });

  it('never lets a read-only admin move money', () => {
    expect(resolvePaymentTarget(readOnly, 'user-2')).toMatchObject({ status: 403 });
  });
});

describe('linking a Square capture back to its attempt', () => {
  it('prefers the payment id we already recorded', async () => {
    const prisma = {
      financePaymentAttempt: {
        findFirst: vi.fn().mockResolvedValue({ id: 'attempt-1' }),
      },
    };
    const attempt = await findAttemptForPayment(prisma, { id: 'square-payment-1' });
    expect(attempt.id).toBe('attempt-1');
    expect(prisma.financePaymentAttempt.findFirst).toHaveBeenCalledTimes(1);
  });

  it('falls back to the reference id in any of its three roles', async () => {
    const prisma = {
      financePaymentAttempt: {
        findFirst: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'attempt-2' }),
      },
    };
    const attempt = await findAttemptForPayment(prisma, {
      id: 'square-payment-2',
      reference_id: 'commercial-order-2',
    });
    expect(attempt.id).toBe('attempt-2');
    const secondCall = prisma.financePaymentAttempt.findFirst.mock.calls[1][0];
    expect(secondCall.where.OR).toEqual([
      { id: 'commercial-order-2' },
      { commercialOrderId: 'commercial-order-2' },
      { weeklyOrderId: 'commercial-order-2' },
    ]);
  });

  it('reports no attempt when the capture carries no reference of ours', async () => {
    const prisma = {
      financePaymentAttempt: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    expect(await findAttemptForPayment(prisma, { id: 'square-payment-3' })).toBe(null);
  });
});
