// POST /api/crowdfund/checkout
// Accepts embedded card payment (Square) for crowdfunding pizzas / pledges.
// Body: { items: [{ name, price (in cents), quantity, type, pizzaCount }], funderName, token, pizzaQty }

const { getSquareClient } = require('../_lib/squareClient');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { resolveCrowdfundDiscount, applyCrowdfundDiscount } = require('./_lib/discountCodes');

const countPizzasInItems = (items) => {
  if (!Array.isArray(items)) {
    return 0;
  }
  return items
    .filter((item) => item && item.type === 'pizza')
    .reduce((sum, item) => {
      const count = Number(item.pizzaCount || item.quantity || 0);
      return sum + (Number.isFinite(count) && count > 0 ? count : 0);
    }, 0);
};

async function recordCrowdfundContribution({
  db,
  pizzasInCart,
  funderName,
  email,
  phone,
  notes,
  notify,
  trimmedDiscount,
}) {
  if (!db || !pizzasInCart) {
    return;
  }

  try {
    const docRef = db.collection('crowdfund').doc('status');
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) {
        tx.set(docRef, {
          goal: 1000,
          pizzasSold: pizzasInCart,
          funders: [
            {
              name: funderName,
              date: new Date().toISOString(),
              email: email || null,
              phone: phone || null,
              notes: notes || null,
              notify: notify || 'none',
              pizzas: pizzasInCart,
              discountCode: trimmedDiscount || null,
            },
          ],
        });
        return;
      }

      const data = doc.data() || {};
      const funders = Array.isArray(data.funders) ? data.funders.slice() : [];
      funders.push({
        name: funderName,
        date: new Date().toISOString(),
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        notify: notify || 'none',
        pizzas: pizzasInCart,
        discountCode: trimmedDiscount || null,
      });

      tx.update(docRef, {
        pizzasSold: (data.pizzasSold || 0) + pizzasInCart,
        funders,
      });
    });
  } catch (err) {
    console.warn('Failed to update crowdfund metrics after payment', err?.message);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  const { firestore: db } = getFirebaseAdmin();

  try {
    if (!squareClient) return res.status(500).json({ error: 'Square not configured' });
    if (!locationId) return res.status(500).json({ error: 'Square location missing' });

    const { items, funderName, token, email, phone, notes, notify, discountCode } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items' });

    let lineTotal = items.reduce(
      (sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1),
      0,
    );
    lineTotal = Math.max(0, Math.round(lineTotal));

    const trimmedDiscount = typeof discountCode === 'string' ? discountCode.trim().slice(0, 60) : '';
    const discountDetails = resolveCrowdfundDiscount(trimmedDiscount);
    if (lineTotal <= 0 && !discountDetails) {
      return res.status(400).json({ error: 'Invalid total' });
    }

    const discountedTotal = applyCrowdfundDiscount(lineTotal, discountDetails);
    const requiresPayment = discountedTotal > 0;
    if (requiresPayment && !token) {
      return res.status(400).json({ error: 'Missing payment token' });
    }

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const metaNoteParts = [funderName || 'Anonymous'];
    if (email) metaNoteParts.push(email);
    if (phone) metaNoteParts.push(phone);
    if (notify && notify !== 'none') metaNoteParts.push(`notify:${notify}`);
    if (trimmedDiscount) {
      metaNoteParts.push(`discount:${trimmedDiscount}${discountDetails ? ':applied' : ''}`);
    }
    const noteStr = metaNoteParts.join(' | ').slice(0, 500);
    const pizzasInCart = countPizzasInItems(items);

    if (!requiresPayment) {
      await recordCrowdfundContribution({
        db,
        pizzasInCart,
        funderName,
        email,
        phone,
        notes,
        notify,
        trimmedDiscount,
      });
      return res.status(200).json({ ok: true, paymentId: null, comped: true, discount: discountDetails || null });
    }

    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Math.round(discountedTotal), currency: 'USD' },
      locationId,
      note: noteStr,
      autocomplete: true,
    };

    const resp = await squareClient.paymentsApi.createPayment(paymentBody);
    const paymentId = resp.result.payment?.id;

    await recordCrowdfundContribution({
      db,
      pizzasInCart,
      funderName,
      email,
      phone,
      notes,
      notify,
      trimmedDiscount,
    });

    return res.status(200).json({ ok: true, paymentId, discount: discountDetails || null });
  } catch (e) {
    const squareErrors = e?.errors ? e.errors.map(er => ({ code: er.code, detail: er.detail })).slice(0,3) : null;
    if (squareErrors) console.warn('[crowdfund.checkout] Square errors', squareErrors);
    const msg = squareErrors ? JSON.stringify(squareErrors) : (e?.message || 'Crowdfund checkout failed');
    return res.status(500).json({ error: msg });
  }
};
