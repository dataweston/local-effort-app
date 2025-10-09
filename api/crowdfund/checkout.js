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
      const raw = Number(item?.pizzaCount ?? item?.quantity ?? 0);
      const normalized = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
      return sum + normalized;
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

  const safeName = typeof funderName === 'string' && funderName.trim()
    ? funderName.trim().slice(0, 120)
    : 'Anonymous';
  const safeEmail = typeof email === 'string' && email.trim() ? email.trim().slice(0, 120) : null;
  const safePhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 30) : null;
  const safeNotes = typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 500) : null;
  const safeNotify = typeof notify === 'string' && notify.trim() ? notify.trim().slice(0, 60) : 'none';
  const discountValue = trimmedDiscount || null;

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
              name: safeName,
              date: new Date().toISOString(),
              email: safeEmail,
              phone: safePhone,
              notes: safeNotes,
              notify: safeNotify,
              pizzas: pizzasInCart,
              discountCode: discountValue,
            },
          ],
        });
        return;
      }

      const data = doc.data() || {};
      const funders = Array.isArray(data.funders) ? data.funders.slice() : [];
      funders.push({
        name: safeName,
        date: new Date().toISOString(),
        email: safeEmail,
        phone: safePhone,
        notes: safeNotes,
        notify: safeNotify,
        pizzas: pizzasInCart,
        discountCode: discountValue,
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

    let lineTotal = items.reduce((sum, item) => {
      const rawPrice = Number(item?.price);
      const price = Number.isFinite(rawPrice) ? Math.max(0, Math.round(rawPrice)) : 0;
      const rawQuantity = Number(item?.quantity);
      const quantity = Number.isFinite(rawQuantity) ? Math.max(0, Math.round(rawQuantity)) : 1;
      return sum + price * quantity;
    }, 0);
    lineTotal = Math.max(0, Math.round(lineTotal));

    const trimmedDiscount = typeof discountCode === 'string' ? discountCode.trim().slice(0, 60) : '';
    const discountDetails = resolveCrowdfundDiscount(trimmedDiscount);
    if (lineTotal <= 0 && !discountDetails) {
      return res.status(400).json({ error: 'Invalid total' });
    }

    const discountedTotal = applyCrowdfundDiscount(lineTotal, discountDetails);
    const requiresPayment = discountedTotal > 0;
    const sourceToken = typeof token === 'string' ? token.trim() : token;
    if (requiresPayment && !sourceToken) {
      return res.status(400).json({ error: 'Missing payment token' });
    }

    const safeFunderName = typeof funderName === 'string' && funderName.trim()
      ? funderName.trim().slice(0, 120)
      : 'Anonymous';
    const safeEmail = typeof email === 'string' && email.trim() ? email.trim().slice(0, 120) : '';
    const safePhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 30) : '';
    const safeNotify = typeof notify === 'string' && notify.trim() ? notify.trim().slice(0, 60) : 'none';

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const metaNoteParts = [safeFunderName];
    if (safeEmail) metaNoteParts.push(safeEmail);
    if (safePhone) metaNoteParts.push(safePhone);
    if (safeNotify && safeNotify !== 'none') metaNoteParts.push(`notify:${safeNotify}`);
    if (trimmedDiscount) {
      metaNoteParts.push(`discount:${trimmedDiscount}${discountDetails ? ':applied' : ''}`);
    }
    const noteStr = metaNoteParts.join(' | ').slice(0, 500);
    const pizzasInCart = countPizzasInItems(items);

    if (!requiresPayment) {
      await recordCrowdfundContribution({
        db,
        pizzasInCart,
        funderName: safeFunderName,
        email: safeEmail,
        phone: safePhone,
        notes,
        notify: safeNotify,
        trimmedDiscount,
      });
      return res.status(200).json({ ok: true, paymentId: null, comped: true, discount: discountDetails || null });
    }

    const paymentBody = {
      sourceId: sourceToken,
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
      funderName: safeFunderName,
      email: safeEmail,
      phone: safePhone,
      notes,
      notify: safeNotify,
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
