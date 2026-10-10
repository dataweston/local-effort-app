// POST /api/february/checkout
// Body: { date, guestCount, preferredTime, dietaryNotes, notes, customer, address, token }
// Processes a Square payment and sends Brevo emails to customer and admin.

const { getSquareClient } = require('../_lib/squareClient');
const { createBrevoService } = require('../../backend/api/services/brevo');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { queueSaleConfirmations, buildDirectSaleConfirmations } = require('../store/sale-confirmation-outbox');
const { buildFebruaryConfirmationFacts } = require('./confirmation-facts');
const { prisma } = require('../_lib/prisma');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const { markPaymentAttemptSucceeded } = require('../../backend/api/finance/paymentAttempts');

const MIN_GUESTS = 4;
const MAX_GUESTS = 12;
const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

// Tiered pricing: party of 4 = $300, 6 = $420, 8+ = $65/person
const PARTY_PRICES_CENTS = {
  4: 30000,
  5: 36000,
  6: 42000,
  7: 49000,
  8: 52000,
  9: 58500,
  10: 65000,
  11: 71500,
  12: 78000,
};

const getPartyPrice = (guests) => {
  const clamped = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, guests));
  return PARTY_PRICES_CENTS[clamped] || PARTY_PRICES_CENTS[MIN_GUESTS];
};

const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;

const brevoService = createBrevoService();

const clampGuests = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return MIN_GUESTS;
  return Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, parsed));
};

const parseFebruaryDate = (isoDate) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || '')) return null;
  const [year, month, day] = isoDate.split('-').map((part) => parseInt(part, 10));
  if (month !== 2) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getMonth() !== 1 || date.getDate() !== day) return null;
  const weekday = date.getDay();
  const isAvailable = weekday === 4 || weekday === 6;
  return { date, isAvailable };
};


module.exports = async (req, res, { emailOutboxService } = {}) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
  if (!locationId) return res.status(500).json({ error: 'Square location missing' });

  const {
    token,
    verificationToken,
    checkoutAttemptId,
    date,
    guestCount,
    preferredTime,
    dietaryNotes,
    notes,
    customer,
    address,
  } = req.body || {};

  if (!token) return res.status(400).json({ error: 'Missing payment token' });
  if (!customer?.name || !customer?.email || !customer?.phone) {
    return res.status(400).json({ error: 'Missing customer information' });
  }
  if (!address?.line1 || !address?.city || !address?.state || !address?.postal) {
    return res.status(400).json({ error: 'Missing address information' });
  }

  const parsedDate = parseFebruaryDate(date);
  if (!parsedDate || !parsedDate.isAvailable) {
    return res.status(400).json({ error: 'Selected date is unavailable' });
  }

  // Check if date is already booked
  const supabase = getSupabase();
  if (supabase) {
    const { data: existingBooking } = await supabase
      .from('february_bookings')
      .select('id')
      .eq('booking_date', date)
      .eq('status', 'confirmed')
      .single();

    if (existingBooking) {
      return res.status(409).json({ error: 'This date is already booked. Please select another date.' });
    }
  }

  const guests = clampGuests(guestCount);
  const amountCents = getPartyPrice(guests);
  const idempotencyKey =
    sanitizeIdempotencyKey(checkoutAttemptId) ||
    `february-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const saleConfirmationFacts = buildFebruaryConfirmationFacts({ date, guests, amountCents, preferredTime, dietaryNotes, notes, customer, address });


  try {
    const checkout = await startCommercialCheckout({
      prisma,
      idempotencyKey,
      sourceSystem: 'february',
      sourceId: `february:${idempotencyKey}`,
      channel: 'small_events',
      businessLineKey: 'events',
      customerName: customer.name,
      customerEmail: customer.email,
      totalCents: amountCents,
      orderMetadata: { saleConfirmationFacts },
      attemptMetadata: { saleConfirmationFacts },
    });
    if (checkout.replay === 'succeeded') {
      return res.status(200).json({
        ok: true,
        paymentId: checkout.attempt.externalPaymentId,
        amountCents,
        emailStatus: { customer: false, admin: false, contact: false },
        idempotentReplay: true,
      });
    }
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: amountCents, currency: 'USD' },
      locationId,
      autocomplete: true,
      buyerEmailAddress: customer.email,
      note: `February in-home dinner ${date} for ${guests} guests`.slice(0, 500),
      referenceId: checkout.order.id,
      metadata: {
        booking_date: date,
        guest_count: String(guests),
        contact_name: customer.name.slice(0, 80),
        contact_phone: customer.phone.slice(0, 30),
        city: address.city.slice(0, 60),
      },
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    const paymentResp = await squareClient.paymentsApi.createPayment(paymentBody);
    const payment = paymentResp?.result?.payment;
    const paymentId = payment?.id;

    if (!paymentId) {
      throw new Error('Payment failed');
    }
    try {
      await markPaymentAttemptSucceeded({
        prisma,
        attemptId: checkout.attempt.id,
        provider: 'square',
        payment,
        amountCents,
      });
    } catch (stateError) {
      console.warn('[february.checkout] payment captured; payment attempt reconciliation pending', {
        paymentId,
        error: stateError?.message || stateError,
      });
    }


    // Save booking to Supabase
    if (supabase) {
      try {
        const { error: insertError } = await supabase.from('february_bookings').insert({
          booking_date: date,
          guest_count: guests,
          amount_cents: amountCents,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          address_line1: address.line1,
          address_line2: address.line2 || null,
          address_city: address.city,
          address_state: address.state,
          address_postal: address.postal,
          preferred_time: preferredTime || null,
          dietary_notes: dietaryNotes || null,
          notes: notes || null,
          square_payment_id: paymentId,
          status: 'confirmed',
        });
        if (insertError) {
          console.warn('[february.checkout] booking insert failed', insertError);
        }
      } catch (dbErr) {
        console.warn('[february.checkout] booking insert error', dbErr?.message);
      }
    }

    const emailStatus = { customer: false, admin: false, contact: false };

    try {
      const nameParts = customer.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');
      await brevoService.upsertContact({
        email: customer.email,
        firstName,
        lastName,
        phone: customer.phone,
      });
      emailStatus.contact = true;
    } catch (err) {
      console.warn('[february.checkout] brevo contact upsert failed', err?.message);
    }

    if (SENDER_EMAIL && customer.email) {
      try {
        await queueSaleConfirmations({
          emailOutboxService,
          payment,
          paymentId,
          confirmations: buildDirectSaleConfirmations('february', { ...saleConfirmationFacts, paymentId }).filter(({ role }) => role === 'customer'),
        });
        emailStatus.customer = payment?.status === 'COMPLETED';
      } catch (err) {
        console.warn('[february.checkout] payment captured; customer confirmation reconciliation pending', {
          paymentId,
          error: err?.message || err,
        });
      }
    }

    if (SENDER_EMAIL && TEAM_EMAIL) {
      try {
        await queueSaleConfirmations({
          emailOutboxService,
          payment,
          paymentId,
          confirmations: buildDirectSaleConfirmations('february', { ...saleConfirmationFacts, paymentId }).filter(({ role }) => role === 'owner'),
        });
        emailStatus.admin = payment?.status === 'COMPLETED';
      } catch (err) {
        console.warn('[february.checkout] payment captured; admin confirmation reconciliation pending', {
          paymentId,
          error: err?.message || err,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      amountCents,
      emailStatus,
    });
  } catch (err) {
    const squareErrors = err?.errors
      ? err.errors.map((er) => ({ code: er.code, detail: er.detail })).slice(0, 3)
      : null;
    if (squareErrors) console.warn('[february.checkout] square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : err?.message || 'Checkout failed';
    return res.status(500).json({ error: msg });
  }
};
module.exports.queueSaleConfirmations = queueSaleConfirmations;
