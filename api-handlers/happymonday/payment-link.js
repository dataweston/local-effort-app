const crypto = require('crypto');
const { Client, Environment } = require('square');
const { prisma } = require('../_lib/prisma');
const { resolveHappyMondayCaller, resolvePaymentTarget } = require('./_auth');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (_) {
  sq = null;
}

let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (_) {
  supabase = null;
}

const createKey = () => (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

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

  const { userId, amountCents } = req.body || {};
  if (!amountCents) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const cents = Number(amountCents);
  if (!Number.isFinite(cents) || cents < 100) {
    return res.status(400).json({ error: 'Minimum payment is $1.00' });
  }

  // Same rule as the card path: a hosted link is still an instruction to
  // collect money against a named account, so the caller must be authenticated.
  const caller = await resolveHappyMondayCaller(req, supabase);
  if (caller.error) {
    return res.status(caller.status).json({ error: caller.error });
  }
  const target = resolvePaymentTarget(caller, userId);
  if (target.error) {
    return res.status(target.status).json({ error: target.error });
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('happymonday_users')
      .select('*')
      .eq('id', target.userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const note = `Happy Monday payment - ${user.name || user.email}`.slice(0, 60);

    // Raise the pending attempt first and stamp it on the order, so a payment
    // made through the hosted link comes back linkable instead of orphaned.
    let attempt = null;
    if (prisma) {
      try {
        attempt = await prisma.financePaymentAttempt.create({
          data: {
            provider: 'square',
            idempotencyKey: `hm-link-${createKey()}`,
            status: 'pending',
            requestedCents: Math.round(cents),
            currency: 'USD',
            metadata: {
              channel: 'happy_monday',
              method: 'hosted_checkout_link',
              portalUserId: target.userId,
              requestedByPortalUserId: String(caller.user.id),
            },
          },
        });
      } catch (attemptError) {
        console.error('[HappyMonday] payment-link attempt not recorded:', attemptError?.message || attemptError);
      }
    }

    const response = await sq.checkoutApi.createPaymentLink({
      idempotencyKey: createKey(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: 'Happy Monday balance payment',
            quantity: '1',
            basePriceMoney: { amount: Math.round(cents), currency: 'USD' },
          },
        ],
        note,
        ...(attempt ? { referenceId: attempt.id } : {}),
      },
      checkoutOptions: {
        redirectUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/partners/happymonday` : undefined,
      },
    });

    const url = response?.result?.paymentLink?.url;
    if (!url) return res.status(500).json({ error: 'Failed to create payment link' });
    return res.status(200).json({ url });
  } catch (error) {
    const message = error?.errors ? JSON.stringify(error.errors) : error?.message || 'Payment link failed';
    return res.status(500).json({ error: message });
  }
};
