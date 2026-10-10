// POST /api/winter-dinner/checkout
// Handles winter dinner ticket purchase with Square payment, Supabase storage, and Brevo notifications
const { Client, Environment } = require('square');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { createBrevoService } = require('../../backend/api/services/brevo');

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = process.env.SQUARE_ENVIRONMENT || 'Production';
const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;
const { queueSaleConfirmations, buildDirectSaleConfirmations } = require('../store/sale-confirmation-outbox');
const { buildWinterDinnerConfirmationFacts } = require('./confirmation-facts');
const { prisma } = require('../_lib/prisma');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const { markPaymentAttemptSucceeded } = require('../../backend/api/finance/paymentAttempts');

const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = (Environment && Environment[ENV_NAME]) ? Environment[ENV_NAME] : Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
  }
} catch (e) {
  // Handle at runtime
}

const brevoService = createBrevoService();

module.exports = async (req, res, { emailOutboxService } = {}) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!sq) {
      return res.status(500).json({ error: 'Square not configured' });
    }

    const { customer, dietaryRestrictions, drinkMenu, token, amount, quantity, verificationToken, checkoutAttemptId } = req.body || {};

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ error: 'Customer information incomplete' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Missing payment token' });
    }

    const idempotencyKey =
      sanitizeIdempotencyKey(checkoutAttemptId) ||
      `winter-dinner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ticketCount = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    const ticketPrice = amount || 7500; // Default $75.00 total for the order

    const totalCents = Number(ticketPrice);
    const saleConfirmationFacts = buildWinterDinnerConfirmationFacts({ customer, dietaryRestrictions, drinkMenu, ticketPrice, ticketCount });
    const checkout = await startCommercialCheckout({
      prisma,
      idempotencyKey,
      sourceSystem: 'winter-dinner',
      sourceId: `winter-dinner:${idempotencyKey}`,
      channel: 'small_events',
      businessLineKey: 'events',
      customerName: customer.name,
      customerEmail: customer.email,
      totalCents,
      orderMetadata: { saleConfirmationFacts },
      attemptMetadata: { saleConfirmationFacts },
    });
    if (checkout.replay === 'succeeded') {
      return res.status(200).json({
        ok: true,
        paymentId: checkout.attempt.externalPaymentId,
        registrationId: null,
        idempotentReplay: true,
      });
    }

    // Process Square payment
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Number(ticketPrice), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer.email,
      note: `Winter Dinner Ticket${ticketCount > 1 ? 's' : ''} x${ticketCount} - ${customer.name} (${drinkMenu === 'wine' ? 'Wine Pairing' : 'Non-Alcoholic Pairing'})`,
      referenceId: checkout.order.id,
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    const paymentResp = await sq.paymentsApi.createPayment(paymentBody);
    const payment = paymentResp?.result?.payment;
    const paymentId = payment?.id;
    if (paymentId) {
      try {
        await markPaymentAttemptSucceeded({
          prisma,
          attemptId: checkout.attempt.id,
          provider: 'square',
          payment,
          amountCents: totalCents,
        });
      } catch (stateError) {
        console.warn('[winter-dinner.checkout] payment captured; payment attempt reconciliation pending', {
          paymentId,
          error: stateError?.message || stateError,
        });
      }
    }

    // Store in Supabase
    const supabase = getSupabase();
    let registrationId = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('winter_dinner_registrations')
          .insert([
            {
              payment_id: paymentId,
              customer_name: customer.name,
              customer_email: customer.email,
              customer_phone: customer.phone,
              dietary_restrictions: dietaryRestrictions || null,
              drink_menu: drinkMenu || 'wine',
              ticket_price: ticketPrice,
              ticket_price_usd: (ticketPrice / 100).toFixed(2),
              created_at: new Date().toISOString(),
            },
          ])
          .select('id')
          .single();

        if (error) {
          console.error('❌ Supabase insert error:', error);
        } else {
          registrationId = data?.id;
          console.log(`✅ Registration saved to Supabase: ${registrationId}`);
        }
      } catch (err) {
        console.error('⚠️  Failed to save to Supabase:', err.message);
      }
    } else {
      console.warn('⚠️  Supabase not configured, skipping database storage');
    }

    // Upsert contact to Brevo
    try {
      const nameParts = customer.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await brevoService.upsertContact({
        email: customer.email,
        firstName,
        lastName,
        phone: customer.phone,
      });
    } catch (err) {
      console.error('⚠️  Brevo contact upsert failed:', err.message);
    }

    const registeredFacts = buildWinterDinnerConfirmationFacts({ customer, dietaryRestrictions, drinkMenu, ticketPrice, ticketCount, registrationId });
    if (registrationId) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.financePaymentAttempt.update({
            where: { id: checkout.attempt.id },
            data: { metadata: { ...checkout.attempt.metadata, saleConfirmationFacts: registeredFacts } },
          });
          await tx.commercialOrder.update({
            where: { id: checkout.order.id },
            data: { metadata: { ...checkout.order.metadata, saleConfirmationFacts: registeredFacts } },
          });
        });
      } catch (stateError) {
        console.warn('[winter-dinner.checkout] registration confirmation reconciliation pending', { paymentId });
      }
    }

    // Send customer confirmation email
    if (customer.email && SENDER_EMAIL) {
      try {
        const result = await queueSaleConfirmations({
          emailOutboxService,
          payment,
          paymentId,
          confirmations: buildDirectSaleConfirmations('winter-dinner', { ...registeredFacts, paymentId }).filter(({ role }) => role === 'customer'),
        });

        if (result.queued) console.log('Winter dinner customer confirmation queued');
      } catch (err) {
        console.error('[winter-dinner.checkout] payment captured; customer confirmation reconciliation pending', {
          paymentId,
          error: err?.message || err,
        });
      }
    }

    // Send admin notification email
    if (TEAM_EMAIL && SENDER_EMAIL) {
      try {
        const result = await queueSaleConfirmations({
          emailOutboxService,
          payment,
          paymentId,
          confirmations: buildDirectSaleConfirmations('winter-dinner', { ...registeredFacts, paymentId }).filter(({ role }) => role === 'owner'),
        });

        if (result.queued) console.log('Winter dinner owner confirmation queued');
      } catch (err) {
        console.error('[winter-dinner.checkout] payment captured; admin confirmation reconciliation pending', {
          paymentId,
          error: err?.message || err,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      registrationId,
    });

  } catch (e) {
    console.error('❌ Winter dinner checkout error:', e);
    const msg = (e?.errors && JSON.stringify(e.errors)) || e?.message || 'Checkout failed';
    res.status(500).json({ error: msg });
  }
};
module.exports.queueSaleConfirmations = queueSaleConfirmations;
