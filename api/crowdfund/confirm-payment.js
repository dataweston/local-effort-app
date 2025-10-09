require('dotenv').config({ path: './.env' });

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

const sanitizeName = (value) => {
  const str = String(value || '').trim();
  if (!str) return 'Anonymous';
  return str.slice(0, 120);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firestore: db } = getFirebaseAdmin();
  if (!db) {
    return res.status(503).json({ error: 'Database not configured on this server.' });
  }

  const { items = [], funderName, email, phone, notes, notify, discountCode } = req.body || {};
  const pizzasInCart = Array.isArray(items)
    ? items
        .filter((item) => item && item.type === 'pizza')
        .reduce((sum, item) => {
          const count = Number(item.pizzaCount || item.quantity || 0);
          return sum + (Number.isFinite(count) && count > 0 ? count : 0);
        }, 0)
    : 0;

  if (!pizzasInCart) {
    return res.json({ success: true, message: 'No pizza items to update.' });
  }

  try {
    const docRef = db.collection('crowdfund').doc('status');
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const current = doc.exists ? doc.data() || {} : {};
      const goal = typeof current.goal === 'number' ? current.goal : 1000;
      const pizzasSold = Number(current.pizzasSold) || 0;
      const funders = Array.isArray(current.funders) ? current.funders.slice() : [];

      const trimmedDiscount = typeof discountCode === 'string' ? discountCode.trim().slice(0, 60) : '';

      funders.push({
        name: sanitizeName(funderName),
        date: new Date().toISOString(),
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        notify: notify || 'none',
        pizzas: pizzasInCart,
        discountCode: trimmedDiscount || null,
      });

      const payload = {
        goal,
        pizzasSold: pizzasSold + pizzasInCart,
        funders,
      };

      if (doc.exists) {
        transaction.update(docRef, payload);
      } else {
        transaction.set(docRef, payload);
      }
    });

    const updatedDoc = await docRef.get();
    const updatedTotal = updatedDoc.exists ? updatedDoc.data()?.pizzasSold || 0 : 0;
    return res.json({ success: true, newTotal: updatedTotal });
  } catch (error) {
    console.warn('[crowdfund.confirm-payment] failed to persist pizzas', error.message);
    return res.status(500).json({ error: 'Failed to update database after payment.' });
  }
};
