// POST /api/july-dinner/checkout
// Body: { token, verificationToken, checkoutAttemptId, bookingType, quantity,
//         partySize, customer, beverageInterests, dietaryRestrictions, musicPreferences }
// Server resolves price + capacity (Sanity-backed), verifies seats remain,
// charges via Square, records the registration in Supabase, and sends Brevo emails.
// bookingType "buyout" charges the flat buy-out price and consumes the full
// seat inventory; it is only available while zero seats have been sold.

const { getSquareClient } = require('../_lib/squareClient');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { createBrevoService } = require('../../backend/api/services/brevo');
const { getEventConfig, getSeatsSold, REGISTRATIONS_TABLE, BEVERAGE_OPTIONS } = require('./_event');
const { buildDirectSaleConfirmations, queueSaleConfirmations } = require('../store/sale-confirmation-outbox');
const { prisma } = require('../_lib/prisma');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const { markPaymentAttemptSucceeded } = require('../../backend/api/finance/paymentAttempts');

const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL;

const brevoService = createBrevoService();

const sanitizeIdempotencyKey = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 45);
};

const parseIntStrict = (value) => {
  const parsed = Number.isInteger(value) ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : 0;
};

const money = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    bookingType: rawBookingType,
    quantity: rawQuantity,
    partySize: rawPartySize,
    customer,
    beverageInterests: rawBeverages,
    dietaryRestrictions,
    musicPreferences,
  } = req.body || {};

  if (!token) return res.status(400).json({ error: 'Missing payment token' });
  if (!customer?.name || !customer?.email || !customer?.phone) {
    return res.status(400).json({ error: 'Missing customer information' });
  }

  const bookingType = rawBookingType === 'buyout' ? 'buyout' : 'seats';

  // Beverage interests are required — the answer shapes what we stock.
  const beverageInterests = Array.isArray(rawBeverages)
    ? rawBeverages.filter((b) => BEVERAGE_OPTIONS.includes(b))
    : [];
  if (beverageInterests.length === 0) {
    return res.status(400).json({ error: 'Pick at least one beverage interest.' });
  }

  const event = await getEventConfig();
  if (event.status === 'cancelled') {
    return res.status(409).json({ error: 'This event has been cancelled.' });
  }
  if (event.status === 'soldOut') {
    return res.status(409).json({ error: 'This dinner is sold out.' });
  }

  let quantity = parseIntStrict(rawQuantity);
  let partySize = null;
  if (bookingType === 'seats') {
    if (quantity < 1 || quantity > event.maxSeatsPerOrder) {
      return res.status(400).json({ error: `Seats per booking must be between 1 and ${event.maxSeatsPerOrder}.` });
    }
  } else {
    partySize = parseIntStrict(rawPartySize) || event.buyoutCapacity;
    if (partySize < 1 || partySize > event.buyoutCapacity) {
      return res.status(400).json({ error: `A buy-out covers 1 to ${event.buyoutCapacity} people.` });
    }
  }

  // Availability check. Fail closed if we can't count seats — never oversell blind.
  const seatsSold = await getSeatsSold();
  if (seatsSold === null) {
    return res.status(500).json({ error: 'Unable to verify seat availability. Please try again.' });
  }
  const seatsRemaining = Math.max(0, event.capacity - seatsSold);

  if (bookingType === 'buyout') {
    if (seatsSold > 0) {
      return res.status(409).json({
        error: 'Some seats are already spoken for, so the whole night is no longer available.',
        seatsRemaining,
      });
    }
    quantity = event.capacity; // a buy-out consumes the room
  } else if (quantity > seatsRemaining) {
    return res.status(409).json({
      error: seatsRemaining === 0
        ? 'This dinner just sold out.'
        : `Only ${seatsRemaining} seat${seatsRemaining === 1 ? '' : 's'} left.`,
      seatsRemaining,
    });
  }

  const amountCents = bookingType === 'buyout' ? event.buyoutPriceCents : event.priceCents * quantity;
  const idempotencyKey =
    sanitizeIdempotencyKey(checkoutAttemptId) ||
    `july-dinner-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const beverageLine = beverageInterests.join(', ');
  const saleConfirmationFacts = {
    flow: 'july-dinner',
    title: event.title,
    amountCents,
    customer: { name: customer.name, email: customer.email, phone: customer.phone },
    details: {
      Date: event.dateLabel,
      Time: event.timeLabel,
      Location: event.location,
      Booking: bookingType === 'buyout' ? `Buy-out for up to ${partySize}` : `${quantity} ${quantity === 1 ? 'seat' : 'seats'}`,
      'Beverage interests': beverageLine,
      Dietary: dietaryRestrictions || 'None specified',
      Music: musicPreferences || 'None specified',
      Total: money(amountCents),
    },
    confirmationTemplates: [
      {
        role: 'customer',
        payload: {
          to: [{ email: customer.email, name: customer.name }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: bookingType === 'buyout'
            ? `The whole night is yours — ${event.dateLabel} at ${event.location}`
            : `Your ${quantity === 1 ? 'seat' : 'seats'} at ${event.title} — confirmed`,
          textContent: [
            `Hi ${customer.name},`,
            '',
            bookingType === 'buyout'
              ? `The whole night is yours — ${event.title} at ${event.location}, for up to ${partySize} people.`
              : `You're in — ${quantity} ${quantity === 1 ? 'seat' : 'seats'} at ${event.title}.`,
            '',
            'THE PLAN',
            `Date: ${event.dateLabel}`,
            `Time: ${event.timeLabel} — come a few minutes early, we start together`,
            `Place: ${event.location}, North Minneapolis`,
            'The exact address, parking notes, and anything else you need to find us arrive in a reminder email a few days before the dinner.',
            '',
            'FOOD & DRINK',
            event.included,
            `To drink, you told us: ${beverageLine}. We'll plan around that — the included non-alcoholic pour is on us, and the rest is available the night of.`,
            dietaryRestrictions
              ? `Dietary notes we have on file: ${dietaryRestrictions}. The menu will work around these.`
              : "You didn't list any dietary notes — if that changes, just reply to this email.",
            musicPreferences ? `Music request noted: ${musicPreferences}.` : null,
            '',
            'THE RECEIPT',
            bookingType === 'buyout'
              ? `Buy-out (food and service for up to ${partySize}): ${money(amountCents)}`
              : `Seats: ${quantity} × ${money(event.priceCents)}`,
            `Total paid: ${money(amountCents)}`,
            'Payment ID: {{paymentId}}',
            bookingType === 'buyout'
              ? "Beverages for a buy-out are arranged separately — we'll reach out to plan them with you."
              : null,
            '',
            'NEED ANYTHING?',
            'Reply to this email for anything at all — seat changes, dietary updates, running late the night of. A human reads it.',
            '',
            'See you at the lake,',
            'Local Effort',
          ].filter((line) => line !== null && line !== undefined).join('\n'),
        },
      },
      {
        role: 'owner',
        payload: {
          to: [{ email: TEAM_EMAIL }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: bookingType === 'buyout'
            ? `July Dinner BUY-OUT: ${customer.name} (${money(amountCents)})`
            : `July Dinner: ${customer.name} × ${quantity} (${seatsRemaining - quantity} left)`,
          textContent: [
            `NEW ${event.title.toUpperCase()} ${bookingType === 'buyout' ? 'BUY-OUT' : 'BOOKING'}`,
            '',
            `Customer: ${customer.name}`,
            `Email: ${customer.email}`,
            `Phone: ${customer.phone}`,
            bookingType === 'buyout' ? `Party size: up to ${partySize}` : `Seats: ${quantity}`,
            `Beverage interests: ${beverageLine}`,
            `Dietary: ${dietaryRestrictions || 'None specified'}`,
            `Music: ${musicPreferences || 'None specified'}`,
            '',
            `Total: ${money(amountCents)}`,
            'Payment ID: {{paymentId}}',
            '',
            '',
            bookingType === 'buyout'
              ? 'FULL BUY-OUT — the night is closed to other bookings. Beverages not included; follow up to plan them.'
              : `Seats remaining: ${seatsRemaining - quantity} of ${event.capacity}`,
          ].filter(Boolean).join('\n'),
        },
      },
    ].filter(({ payload }) => payload?.to?.[0]?.email && payload.sender?.email),
  };
  try {
  const checkout = await startCommercialCheckout({
    prisma,
    idempotencyKey,
    sourceSystem: 'july-dinner',
    sourceId: `july-dinner:${idempotencyKey}`,
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
      registrationId: null,
      bookingType,
      amountCents,
      seatsRemaining,
      emailStatus: { customer: false, admin: false },
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
      note: `${event.title} ${bookingType === 'buyout' ? 'BUYOUT' : `x${quantity}`} - ${customer.name}`.slice(0, 500),
      referenceId: checkout.order.id,
      metadata: {
        event: 'july-dinner',
        booking_type: bookingType,
        quantity: String(quantity),
        customer_name: customer.name.slice(0, 80),
        customer_phone: customer.phone.slice(0, 30),
      },
    };
    if (verificationToken) {
      paymentBody.verificationToken = verificationToken;
    }

    const paymentResp = await squareClient.paymentsApi.createPayment(paymentBody);
    const payment = paymentResp?.result?.payment;
    const paymentId = payment?.id;
    if (!paymentId) throw new Error('Payment failed');
    try {
      await markPaymentAttemptSucceeded({
        prisma,
        attemptId: checkout.attempt.id,
        provider: 'square',
        payment,
        amountCents,
      });
    } catch (stateError) {
      console.warn('[july-dinner.checkout] payment captured; payment attempt reconciliation pending', {
        paymentId,
        error: stateError?.message || stateError,
      });
    }

    // Record the registration
    let registrationId = null;
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from(REGISTRATIONS_TABLE)
        .insert([
          {
            payment_id: paymentId,
            customer_name: customer.name,
            customer_email: customer.email,
            customer_phone: customer.phone,
            booking_type: bookingType,
            party_size: partySize,
            beverage_interests: beverageLine,
            dietary_restrictions: dietaryRestrictions || null,
            music_preferences: musicPreferences || null,
            quantity,
            price_per_seat_cents: bookingType === 'buyout' ? null : event.priceCents,
            total_cents: amountCents,
          },
        ])
        .select('id')
        .single();
      if (error) {
        console.error('[july-dinner.checkout] supabase insert failed:', error.message);
      } else {
        registrationId = data?.id || null;
      }
    }
    if (registrationId) {
      saleConfirmationFacts.registrationId = registrationId;
      saleConfirmationFacts.confirmationTemplates = saleConfirmationFacts.confirmationTemplates.map((confirmation) =>
        confirmation.role === 'owner' ? {
          ...confirmation,
          payload: {
            ...confirmation.payload,
            textContent: confirmation.payload.textContent.replace(
              'Payment ID: {{paymentId}}\n',
              `Payment ID: {{paymentId}}\nRegistration ID: ${registrationId}\n`,
            ),
          },
        } : confirmation,
      );
      try {
        await prisma.$transaction(async (tx) => {
          await tx.financePaymentAttempt.update({
            where: { id: checkout.attempt.id },
            data: { metadata: { ...checkout.attempt.metadata, saleConfirmationFacts } },
          });
          await tx.commercialOrder.update({
            where: { id: checkout.order.id },
            data: { metadata: { ...checkout.order.metadata, saleConfirmationFacts } },
          });
        });
      } catch (stateError) {
        console.warn('[july-dinner.checkout] registration confirmation facts reconciliation pending', {
          paymentId, registrationId, error: stateError?.message || stateError,
        });
      }
    }

    // Brevo contact upsert (non-fatal)
    try {
      const nameParts = customer.name.trim().split(' ');
      await brevoService.upsertContact({
        email: customer.email,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: customer.phone,
      });
    } catch (err) {
      console.warn('[july-dinner.checkout] brevo upsert failed:', err?.message);
    }

    const emailStatus = { customer: false, admin: false };
    const confirmations = buildDirectSaleConfirmations('july-dinner', { ...saleConfirmationFacts, paymentId });

    if (SENDER_EMAIL && customer.email) {
      try {
        await queueSaleConfirmations({
          emailOutboxService,
          payment,
          paymentId,
          confirmations: confirmations.filter(({ role }) => role === 'customer'),
        });
        emailStatus.customer = payment?.status === 'COMPLETED';
      } catch (err) {
        console.warn('[july-dinner.checkout] payment captured; customer confirmation reconciliation pending', {
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
          confirmations: confirmations.filter(({ role }) => role === 'owner'),
        });
        emailStatus.admin = payment?.status === 'COMPLETED';
      } catch (err) {
        console.warn('[july-dinner.checkout] payment captured; admin confirmation reconciliation pending', {
          paymentId,
          error: err?.message || err,
        });
      }
    }

    return res.status(200).json({
      ok: true,
      paymentId,
      registrationId,
      bookingType,
      amountCents,
      seatsRemaining: seatsRemaining - quantity,
      emailStatus,
    });
  } catch (err) {
    const squareErrors = err?.errors
      ? err.errors.map((er) => ({ code: er.code, detail: er.detail })).slice(0, 3)
      : null;
    if (squareErrors) console.warn('[july-dinner.checkout] square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : err?.message || 'Checkout failed';
    return res.status(500).json({ error: msg });
  }
};
module.exports.queueSaleConfirmations = queueSaleConfirmations;
