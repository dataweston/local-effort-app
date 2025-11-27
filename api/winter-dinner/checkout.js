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

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!sq) {
      return res.status(500).json({ error: 'Square not configured' });
    }

    const { customer, dietaryRestrictions, drinkMenu, token, amount } = req.body || {};

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return res.status(400).json({ error: 'Customer information incomplete' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Missing payment token' });
    }

    const idempotencyKey = `winter-dinner-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ticketPrice = amount || 7500; // Default $75.00

    // Process Square payment
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Number(ticketPrice), currency: 'USD' },
      locationId: LOCATION_ID,
      autocomplete: true,
      buyerEmailAddress: customer.email,
      note: `Winter Dinner Ticket - ${customer.name} (${drinkMenu === 'wine' ? 'Wine Pairing' : 'Non-Alcoholic Pairing'})`,
      referenceId: `winter-dinner-${Date.now()}`,
    };

    const paymentResp = await sq.paymentsApi.createPayment(paymentBody);
    const paymentId = paymentResp.result.payment?.id;

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

    // Event details
    const eventDate = 'December 21, 2025';
    const eventTime = '6:00 PM';
    const eventLocation = 'Local Effort Space';
    const eventAddress = '1024 E 38th St, Minneapolis, MN';

    // Send customer confirmation email
    if (customer.email && SENDER_EMAIL) {
      try {
        const beverageText = drinkMenu === 'wine'
          ? 'with curated wine pairings'
          : 'with artisanal non-alcoholic beverage pairings';

        const dietaryText = dietaryRestrictions
          ? `\n\nDietary Restrictions/Allergies: ${dietaryRestrictions}`
          : '';

        const customerEmailBody = `Dear ${customer.name},

Thank you for purchasing a ticket to our Winter Dinner! We're thrilled to have you join us for an unforgettable evening.

═══════════════════════════════════════
EVENT DETAILS
═══════════════════════════════════════

Date: ${eventDate}
Time: ${eventTime}
Location: ${eventLocation}
Address: ${eventAddress}

Your ticket includes a multi-course seasonal dinner ${beverageText}.${dietaryText}

═══════════════════════════════════════
YOUR CONFIRMATION
═══════════════════════════════════════

Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone}
Ticket Price: $${(ticketPrice / 100).toFixed(2)}
Payment ID: ${paymentId}

═══════════════════════════════════════

If you have any questions or need to update your dietary restrictions, please reply to this email or call us.

We look forward to seeing you!

Warmly,
The Local Effort Team`;

        await brevoService.sendEmail({
          to: [{ email: customer.email, name: customer.name }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort' },
          subject: '✨ Your Winter Dinner Ticket Confirmation',
          textContent: customerEmailBody,
        });

        console.log(`✅ Confirmation email sent to ${customer.email}`);
      } catch (err) {
        console.error('⚠️  Failed to send customer email:', err.message);
      }
    }

    // Send admin notification email
    if (TEAM_EMAIL && SENDER_EMAIL) {
      try {
        const adminEmailBody = `🎫 NEW WINTER DINNER TICKET PURCHASED

═══════════════════════════════════════
CUSTOMER INFORMATION
═══════════════════════════════════════

Name: ${customer.name}
Email: ${customer.email}
Phone: ${customer.phone}

═══════════════════════════════════════
TICKET DETAILS
═══════════════════════════════════════

Price: $${(ticketPrice / 100).toFixed(2)}
Beverage Pairing: ${drinkMenu === 'wine' ? 'Wine Pairing' : 'Non-Alcoholic Pairing'}
Dietary Restrictions: ${dietaryRestrictions || 'None specified'}

Payment ID: ${paymentId}
${registrationId ? `Registration ID: ${registrationId}` : ''}

═══════════════════════════════════════

Event: ${eventDate} at ${eventTime}
Location: ${eventLocation}`;

        await brevoService.sendEmail({
          to: [{ email: TEAM_EMAIL }],
          sender: { email: SENDER_EMAIL, name: 'Local Effort Winter Dinner' },
          subject: `🎫 New Ticket: ${customer.name} - Winter Dinner`,
          textContent: adminEmailBody,
        });

        console.log(`✅ Admin notification sent to ${TEAM_EMAIL}`);
      } catch (err) {
        console.error('⚠️  Failed to send admin email:', err.message);
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
