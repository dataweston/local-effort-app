// POST /api/crowdfund/checkout
// Accepts embedded card payment (Square) for crowdfunding pizzas / pledges.
// Body: { items: [{ name, price (in cents), quantity, type, pizzaCount }], funderName, token, pizzaQty }

const { Client, Environment } = require('square');
const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const ENV_NAME = ((process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase() === 'sandbox') ? 'Sandbox' : 'Production';

let sq = null;
try {
  if (ACCESS_TOKEN) {
    const env = Environment[ENV_NAME] || Environment.Production;
    sq = new Client({ accessToken: ACCESS_TOKEN, environment: env });
    /* eslint-disable no-console */
    if (process.env.NODE_ENV !== 'production') {
      console.log('[crowdfund.checkout] Square client initialized', { env: ENV_NAME, locPresent: !!LOCATION_ID, tokenTail: ACCESS_TOKEN.slice(-4) });
    }
    /* eslint-enable no-console */
  }
} catch (_) { /* ignore init errors */ }

// Firestore (for updating pizzasSold) — reuse backend server style if available
let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    // Expect credentials to already be provisioned via GOOGLE_APPLICATION_CREDENTIALS or env vars.
    admin.initializeApp();
  }
  db = admin.firestore();
} catch (_) { /* ignore Firestore errors; endpoint will still process payment */ }

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!sq) return res.status(500).json({ error: 'Square not configured' });
    if (!LOCATION_ID) return res.status(500).json({ error: 'Square location missing' });

    const {
      items,
      funderName,
      token,
      email,
      phone,
      notes,
      notify,
      rewardPreference,
      pizzaQty,
    } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing payment token' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });

    // Items have price in cents now (unlike contribute endpoint which used dollars)
    const lineTotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    if (!lineTotal) return res.status(400).json({ error: 'Invalid total' });

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const metaNoteParts = [funderName || 'Anonymous'];
    if (email) metaNoteParts.push(email);
    if (phone) metaNoteParts.push(phone);
    if (notify && notify !== 'none') metaNoteParts.push(`notify:${notify}`);
    const noteStr = metaNoteParts.join(' | ').slice(0, 500);
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Math.round(lineTotal), currency: 'USD' },
      locationId: LOCATION_ID,
      note: noteStr,
      autocomplete: true,
    };

    const resp = await sq.paymentsApi.createPayment(paymentBody);
    const paymentId = resp.result.payment?.id;

    // Update crowdfund totals (best-effort) — count pizzas from items where type === 'pizza'
    if (db) {
      try {
        const pizzasInCart = items.filter(p => p.type === 'pizza').reduce((sum, it) => sum + (it.pizzaCount || it.quantity || 1), 0);
        if (pizzasInCart > 0) {
          const docRef = db.collection('crowdfund').doc('status');
          await db.runTransaction(async (tx) => {
            const doc = await tx.get(docRef);
            if (!doc.exists) {
              tx.set(docRef, { goal: 1000, pizzasSold: pizzasInCart, funders: [{ name: funderName, date: new Date().toISOString() }] });
            } else {
              const data = doc.data() || {};
              const funders = Array.isArray(data.funders) ? data.funders : [];
              funders.push({ name: funderName, date: new Date().toISOString(), email: email || null, phone: phone || null, notes: notes || null, notify: notify || 'none', pizzas: pizzasInCart });
              tx.update(docRef, { pizzasSold: (data.pizzasSold || 0) + pizzasInCart, funders });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to update crowdfund metrics after payment', err?.message);
      }
    }

    // Notify team + supporter via Brevo (best-effort, non-blocking)
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const TEAM_EMAIL = process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || process.env.SENDER_EMAIL;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || TEAM_EMAIL || email || null;
    if (BREVO_API_KEY && SENDER_EMAIL) {
      const headers = {
        'api-key': BREVO_API_KEY,
        accept: 'application/json',
        'content-type': 'application/json',
      };
      const formatCurrency = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
      const formatLine = (item) => {
        const qty = Number(item.quantity || item.pizzaCount || 1);
        const name = item.name || 'Contribution';
        const total = (Number(item.price) || 0) * qty;
        return `- ${qty} x ${name} (${formatCurrency(total)})`;
      };
      const itemLines = items.map(formatLine).join('\n');
      const totalUsd = formatCurrency(lineTotal);
      const pizzasPurchased = items
        .filter((i) => i.type === 'pizza')
        .reduce((sum, it) => sum + (Number(it.pizzaCount) || Number(it.quantity) || 0), 0);

      if (TEAM_EMAIL) {
        const teamLines = [
          'Crowdfunding contribution received!',
          '',
          `Funder: ${funderName || 'Anonymous'}`,
          email ? `Email: ${email}` : null,
          phone ? `Phone: ${phone}` : null,
          pizzasPurchased ? `Pizzas counted: ${pizzasPurchased}` : null,
          pizzaQty ? `Requested quantity: ${pizzaQty}` : null,
          notify && notify !== 'none' ? `Notify preference: ${notify}` : null,
          rewardPreference ? `Reward preference: ${rewardPreference}` : null,
          '',
          'Items:',
          itemLines || '(no items provided)',
          '',
          `Total captured: ${totalUsd}`,
          paymentId ? `Square payment: ${paymentId}` : null,
          notes ? `Notes:\n${notes}` : null,
        ].filter(Boolean).join('\n');
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              to: [{ email: TEAM_EMAIL }],
              sender: { email: SENDER_EMAIL, name: 'Local Effort' },
              subject: 'New crowdfunding contribution',
              textContent: teamLines,
              replyTo: email ? { email, name: funderName || 'Supporter' } : undefined,
              tags: ['crowdfund', 'supporter'],
            }),
          });
        } catch (err) {
          console.warn('[crowdfund.checkout] team email failed', err?.message || err);
        }
      }

      if (email) {
        const friendlyName = (funderName || '').split(' ')[0] || 'there';
        const pizzasLine = pizzasPurchased
          ? `You just funded ${pizzasPurchased} pizza${pizzasPurchased === 1 ? '' : 's'} for our neighbors.`
          : null;
        const supporterLines = [
          `Hi ${friendlyName},`,
          '',
          "Thank you for backing Local Effort's 1,000 pizza campaign!",
          pizzasLine,
          '',
          'Your contribution:',
          itemLines || '(no items provided)',
          '',
          `Total: ${totalUsd}`,
          rewardPreference ? `Reward preference noted: ${rewardPreference}` : null,
          notes ? `Your note: ${notes}` : null,
          '',
          "We're so grateful for your support.",
          '— The Local Effort team',
        ].filter(Boolean).join('\n');
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              to: [{ email }],
              sender: { email: SENDER_EMAIL, name: 'Local Effort' },
              subject: 'Thanks for supporting Local Effort',
              textContent: supporterLines,
              tags: ['crowdfund', 'supporter'],
            }),
          });
        } catch (err) {
          console.warn('[crowdfund.checkout] supporter email failed', err?.message || err);
        }
      }
    }

    return res.status(200).json({ ok: true, paymentId });
  } catch (e) {
    const squareErrors = e?.errors ? e.errors.map(er => ({ code: er.code, detail: er.detail })).slice(0,3) : null;
    if (squareErrors) console.warn('[crowdfund.checkout] Square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : (e?.message || 'Crowdfund checkout failed');
    return res.status(500).json({ error: msg });
  }
};
