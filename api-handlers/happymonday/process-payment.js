const { Client, Environment } = require('square');
const crypto = require('crypto');

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
 * Process a Square payment for Happy Monday
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

  try {
    const { userId, token, amountCents, verificationToken, checkoutAttemptId } = req.body;

    if (!userId || !token || !amountCents) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amountCents < 100) {
      return res.status(400).json({ error: 'Minimum payment is $1.00' });
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('happymonday_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Process Square payment
    const idempotencyKey = typeof checkoutAttemptId === 'string' && checkoutAttemptId.trim()
      ? checkoutAttemptId.trim().slice(0, 45)
      : createKey();
    const paymentResp = await sq.paymentsApi.createPayment({
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: amountCents, currency: 'USD' },
      locationId: LOCATION_ID,
      buyerEmailAddress: user.email,
      note: `Happy Monday payment - ${user.name || user.email}`.slice(0, 60),
      metadata: {
        happy_monday_user_id: userId,
        payment_type: 'balance_payment',
      },
      verificationToken: verificationToken || undefined,
    });

    const payment = paymentResp?.result?.payment;
    const paymentId = payment?.id;

    if (!paymentId) {
      throw new Error('Payment processing failed');
    }

    // Record payment in Supabase
    const { error: paymentRecordError } = await supabase
      .from('happymonday_payments')
      .insert({
        user_id: userId,
        amount_cents: amountCents,
        payment_type: 'square_card',
        square_payment_id: paymentId,
        notes: `Card payment via Square - ${paymentId}`,
        processed_by: userId,
      });

    if (paymentRecordError) {
      console.error('[HappyMonday] Error recording payment:', paymentRecordError);
      // Payment went through but we failed to record it - this needs manual attention
      return res.status(500).json({
        error: 'Payment succeeded but failed to record. Please contact support.',
        paymentId,
      });
    }

    console.log(`[HappyMonday] ✅ Payment processed: ${paymentId} for $${(amountCents / 100).toFixed(2)}`);

    return res.status(200).json({
      success: true,
      paymentId,
      amountCents,
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
