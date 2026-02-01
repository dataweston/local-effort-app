// POST /api/february/checkout
// Body: { date, guestCount, preferredTime, dietaryNotes, notes, customer, address, token }
// Processes a Square payment and sends Brevo emails to customer and admin.

const { getSquareClient } = require('../_lib/squareClient');
const { createBrevoService } = require('../../backend/api/services/brevo');
const { getSupabase } = require('../../backend/api/supabaseClient');

const MIN_GUESTS = 4;
const MAX_GUESTS = 12;

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

const formatDateLabel = (dateObj) =>
  dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
  if (!locationId) return res.status(500).json({ error: 'Square location missing' });

  const {
    token,
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
  const idempotencyKey = `february-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: amountCents, currency: 'USD' },
      locationId,
      autocomplete: true,
      buyerEmailAddress: customer.email,
      note: `February in-home dinner ${date} for ${guests} guests`.slice(0, 500),
      referenceId: `february-${Date.now()}`,
      metadata: {
        booking_date: date,
        guest_count: String(guests),
        contact_name: customer.name.slice(0, 80),
        contact_phone: customer.phone.slice(0, 30),
        city: address.city.slice(0, 60),
      },
    };

    const paymentResp = await squareClient.paymentsApi.createPayment(paymentBody);
    const paymentId = paymentResp?.result?.payment?.id;

    if (!paymentId) {
      throw new Error('Payment failed');
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
    const formattedDate = formatDateLabel(parsedDate.date);
    const fullAddress = `${address.line1}${address.line2 ? `, ${address.line2}` : ''}, ${address.city}, ${address.state} ${address.postal}`;

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
        const customerBody = [
          `Thanks for booking your February in-home chef dinner.`,
          '',
          `Date: ${formattedDate}`,
          `Preferred time: ${preferredTime || 'Not specified'}`,
          `Guest count: ${guests}`,
          `Address: ${fullAddress}`,
          `Dietary notes: ${dietaryNotes || 'None'}`,
          `Additional notes: ${notes || 'None'}`,
          '',
          `Payment ID: ${paymentId}`,
          `Total: $${(amountCents / 100).toFixed(2)}`,
          '',
          'We will follow up within 24 hours to confirm menu details and logistics.',
        ].join('\n');

        await brevoService.sendEmail({
          to: [{ email: customer.email, name: customer.name }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: `February dinner confirmed - ${formattedDate}`,
          textContent: customerBody,
        });
        emailStatus.customer = true;
      } catch (err) {
        console.warn('[february.checkout] customer email failed', err?.message);
      }
    }

    if (SENDER_EMAIL && TEAM_EMAIL) {
      try {
        const adminBody = [
          'NEW FEBRUARY DINNER BOOKING',
          '',
          `Date: ${formattedDate}`,
          `Preferred time: ${preferredTime || 'Not specified'}`,
          `Guest count: ${guests}`,
          `Total: $${(amountCents / 100).toFixed(2)}`,
          '',
          `Customer: ${customer.name}`,
          `Email: ${customer.email}`,
          `Phone: ${customer.phone}`,
          `Address: ${fullAddress}`,
          `Dietary notes: ${dietaryNotes || 'None'}`,
          `Additional notes: ${notes || 'None'}`,
          '',
          `Payment ID: ${paymentId}`,
        ].join('\n');

        await brevoService.sendEmail({
          to: [{ email: TEAM_EMAIL }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: `February dinner booked - ${customer.name}`,
          textContent: adminBody,
        });
        emailStatus.admin = true;
      } catch (err) {
        console.warn('[february.checkout] admin email failed', err?.message);
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
