const { Client, Environment } = require('square');
const crypto = require('crypto');
const { prisma } = require('../_lib/prisma');
const { resolveHappyMondayCaller, resolvePaymentTarget } = require('./_auth');
const {
  markPaymentAttemptFailed,
  markPaymentAttemptSucceeded,
} = require('../../backend/api/finance/paymentAttempts');
const { applyPaymentFifo, openInvoicesForAgreement } = require('../../backend/api/finance/receivables');
const {
  AGREEMENT_SOURCE_ID,
  SOURCE_SYSTEM,
} = require('../../backend/api/finance/happyMondayProjection');

// Square client setup
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (err) {
  console.warn('[HappyMonday] Square not available:', err.message);
}

// Supabase client
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (err) {
  console.warn('[HappyMonday] Supabase not available:', err.message);
}

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

/**
 * Apply a captured balance payment to Happy Monday's open invoices, oldest
 * first. Best effort by design: the money and its transaction row are already
 * durable, and the projection recomputes allocations on its next run, so a
 * failure here delays attribution rather than losing evidence.
 */
async function allocateToOpenInvoices({ transactionId, amountCents }) {
  const agreement = await prisma.commercialAgreement.findUnique({
    where: { sourceSystem_sourceId: { sourceSystem: SOURCE_SYSTEM, sourceId: AGREEMENT_SOURCE_ID } },
  });
  if (!agreement) return { allocated: 0, unappliedCents: amountCents, reason: 'no-agreement-projected' };

  const invoices = await openInvoicesForAgreement({ prisma, agreementId: agreement.id });
  if (!invoices.length) return { allocated: 0, unappliedCents: amountCents, reason: 'no-open-invoices' };

  return applyPaymentFifo({ prisma, transactionId, amountCents, invoices });
}

/**
 * Process a Square payment for Happy Monday
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!sq) {
    return res.status(500).json({ error: 'Square not configured' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  if (!LOCATION_ID) {
    return res.status(500).json({ error: 'Square location missing' });
  }

  // Durable payment evidence must exist before the charge.
  if (!prisma) {
    return res.status(503).json({ error: 'Payments are temporarily unavailable. No payment was taken.' });
  }

  try {
    const { userId, token, amountCents, verificationToken, checkoutAttemptId } = req.body;

    // The caller comes from the bearer token. A body `userId` may only ever
    // narrow what an admin acts on, never establish who is paying.
    const caller = await resolveHappyMondayCaller(req, supabase);
    if (caller.error) {
      return res.status(caller.status).json({ error: caller.error });
    }
    const target = resolvePaymentTarget(caller, userId);
    if (target.error) {
      return res.status(target.status).json({ error: target.error });
    }

    if (!token || !amountCents) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amountCents < 100) {
      return res.status(400).json({ error: 'Minimum payment is $1.00' });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('happymonday_users')
      .select('*')
      .eq('id', target.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const idempotencyKey = typeof checkoutAttemptId === 'string' && checkoutAttemptId.trim()
      ? checkoutAttemptId.trim().slice(0, 45)
      : createKey();
    const requestedCents = Math.round(Number(amountCents));

    // A balance payment settles existing invoices rather than booking new work,
    // so the attempt stands alone: no commercial order, allocation decided once
    // the money is real.
    let paymentAttempt = await prisma.financePaymentAttempt.findUnique({
      where: { provider_idempotencyKey: { provider: 'square', idempotencyKey } },
    });
    if (paymentAttempt && paymentAttempt.requestedCents !== requestedCents) {
      return res.status(409).json({ error: 'Payment amount changed. Please start the payment again.' });
    }
    if (paymentAttempt?.status === 'succeeded' && paymentAttempt.externalPaymentId) {
      return res.status(200).json({
        success: true,
        paymentId: paymentAttempt.externalPaymentId,
        amountCents: requestedCents,
        idempotentReplay: true,
      });
    }
    if (paymentAttempt?.status === 'failed') {
      return res.status(409).json({ error: 'This payment attempt failed. Please try again.' });
    }
    if (!paymentAttempt) {
      try {
        paymentAttempt = await prisma.financePaymentAttempt.create({
          data: {
            provider: 'square',
            idempotencyKey,
            status: 'pending',
            requestedCents,
            currency: 'USD',
            metadata: {
              channel: 'happy_monday',
              portalUserId: target.userId,
              paidByPortalUserId: String(caller.user.id),
              paymentType: 'balance_payment',
            },
          },
        });
      } catch (error) {
        if (error?.code !== 'P2002') throw error;
        paymentAttempt = await prisma.financePaymentAttempt.findUnique({
          where: { provider_idempotencyKey: { provider: 'square', idempotencyKey } },
        });
        if (!paymentAttempt) throw error;
      }
    }

    let paymentResp;
    try {
      paymentResp = await sq.paymentsApi.createPayment({
        sourceId: token,
        idempotencyKey,
        amountMoney: { amount: requestedCents, currency: 'USD' },
        locationId: LOCATION_ID,
        buyerEmailAddress: user.email,
        note: `Happy Monday payment - ${user.name || user.email}`.slice(0, 60),
        referenceId: paymentAttempt.id,
        metadata: {
          happy_monday_user_id: target.userId,
          payment_type: 'balance_payment',
        },
        verificationToken: verificationToken || undefined,
      });
    } catch (paymentError) {
      try {
        await markPaymentAttemptFailed({ prisma, attemptId: paymentAttempt.id, error: paymentError });
      } catch (stateError) {
        console.error('[HappyMonday] failed to persist payment failure:', stateError?.message || stateError);
      }
      throw paymentError;
    }

    const payment = paymentResp?.result?.payment;
    const paymentId = payment?.id;

    if (!paymentId) {
      throw new Error('Payment processing failed');
    }

    let allocation = null;
    try {
      const { transaction } = await markPaymentAttemptSucceeded({
        prisma,
        attemptId: paymentAttempt.id,
        provider: 'square',
        payment,
        amountCents: requestedCents,
      });
      allocation = await allocateToOpenInvoices({
        transactionId: transaction.id,
        amountCents: requestedCents,
      });
    } catch (stateError) {
      console.error('[HappyMonday] payment captured; finance reconciliation pending:', {
        paymentId,
        error: stateError?.message || stateError,
      });
    }

    // Portal mirror. The finance record above is the durable evidence; this row
    // is what the portal's running balance reads.
    const { error: paymentRecordError } = await supabase
      .from('happymonday_payments')
      .insert({
        user_id: target.userId,
        amount_cents: requestedCents,
        payment_type: 'square_card',
        square_payment_id: paymentId,
        notes: `Card payment via Square - ${paymentId}`,
        processed_by: String(caller.user.id),
      });

    if (paymentRecordError) {
      // The payment is captured and recorded in Finance Core. Telling a paying
      // customer it failed would be false; the portal balance just lags until
      // the projection or a retry writes this row.
      console.error('[HappyMonday] payment captured; portal ledger row failed:', paymentRecordError);
      return res.status(200).json({
        success: true,
        paymentId,
        amountCents: requestedCents,
        portalRecordPending: true,
      });
    }

    console.log(`[HappyMonday] ✅ Payment processed: ${paymentId} for $${(requestedCents / 100).toFixed(2)}`);

    return res.status(200).json({
      success: true,
      paymentId,
      amountCents: requestedCents,
      ...(allocation ? { appliedToInvoicesCents: allocation.allocated, unappliedCents: allocation.unappliedCents } : {}),
    });

  } catch (error) {
    console.error('[HappyMonday] Payment error:', error);

    // Extract error message from Square error
    let errorMessage = 'Payment failed';
    if (error.errors && Array.isArray(error.errors)) {
      errorMessage = error.errors.map(e => e.detail || e.message || e.code).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      error: errorMessage,
    });
  }
};
