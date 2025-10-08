// POST /api/crowdfund/checkout
// Accepts embedded card payment (Square) for crowdfunding pizzas / pledges.
// Body: { items: [{ name, price (in cents), quantity, type, pizzaCount }], funderName, token, pizzaQty }

const { getSquareClient } = require('../_lib/squareClient');
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

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
    const trimmedDiscount = typeof discountCode === 'string' ? discountCode.trim().slice(0, 60) : '';
    if (trimmedDiscount) metaNoteParts.push(`discount:${trimmedDiscount}`);
    const noteStr = metaNoteParts.join(' | ').slice(0, 500);
    const paymentBody = {
      sourceId: token,
      idempotencyKey,
      amountMoney: { amount: Math.round(lineTotal), currency: 'USD' },
      locationId,
      note: noteStr,
      autocomplete: true,
    };

    const resp = await squareClient.paymentsApi.createPayment(paymentBody);
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
              tx.update(docRef, { pizzasSold: (data.pizzasSold || 0) + pizzasInCart, funders });
            }
          });
        }
      } catch (err) {
        console.warn('Failed to update crowdfund metrics after payment', err?.message);
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
