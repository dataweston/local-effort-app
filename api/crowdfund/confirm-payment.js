const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { sendCrowdfundReceipts } = require('./_lib/sendReceipt');

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

  const {
    items = [],
    funderName,
    email,
    phone,
    notes,
    notify,
    discountCode,
    rewardPreference,
    totalCents,
    discountLabel,
  } = req.body || {};
  const pizzasInCart = Array.isArray(items)
    ? items
        .filter((item) => item && item.type === 'pizza')
        .reduce((sum, item) => {
          const count = Number(item.pizzaCount || item.quantity || 0);
          return sum + (Number.isFinite(count) && count > 0 ? count : 0);
        }, 0)
    : 0;

  const sanitizedFunderName = sanitizeName(funderName);
  const safeEmail = typeof email === 'string' && email.trim() ? email.trim().slice(0, 120) : '';
  const safePhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 30) : '';
  const safeNotes = typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 500) : '';
  const safeNotify = typeof notify === 'string' && notify.trim() ? notify.trim().slice(0, 60) : 'none';
  const safeRewardPreference = typeof rewardPreference === 'string' && rewardPreference.trim()
    ? rewardPreference.trim().slice(0, 120)
    : '';
  const safeDiscountLabel = typeof discountLabel === 'string' && discountLabel.trim()
    ? discountLabel.trim().slice(0, 120)
    : '';
  const trimmedDiscount = typeof discountCode === 'string' ? discountCode.trim().slice(0, 60) : '';

  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => {
          if (!item) return null;
          const name = typeof item.name === 'string' && item.name.trim()
            ? item.name.trim().slice(0, 120)
            : 'Contribution';
          const rawQuantity = Number(item.quantity ?? item.pizzaCount ?? 0);
          const quantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? Math.round(rawQuantity) : 1;
          const rawPrice = Number(item.priceCents ?? item.price ?? 0);
          const priceCents = Number.isFinite(rawPrice) ? Math.max(0, Math.round(rawPrice)) : 0;
          return { name, quantity, priceCents };
        })
        .filter(Boolean)
    : [];

  const explicitTotal = Number(totalCents);
  const itemsTotal = normalizedItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const contributionTotal = Number.isFinite(explicitTotal) && explicitTotal >= 0
    ? Math.round(explicitTotal)
    : itemsTotal;

  if (!pizzasInCart) {
    return res.json({ success: true, message: 'No pizza items to update.' });
  }

  if (!db) {
    console.warn(
      'crowdfund confirm-payment requested but database unavailable; skipping persistence'
    );

    try {
      await sendCrowdfundReceipts({
        funderName: sanitizedFunderName,
        email: safeEmail,
        phone: safePhone,
        totalCents: contributionTotal,
        items: normalizedItems,
        discountCode: trimmedDiscount,
        discountLabel: safeDiscountLabel,
        rewardPreference: safeRewardPreference,
        notify: safeNotify,
        notes: safeNotes,
        isComplimentary: contributionTotal <= 0,
      });
    } catch (receiptError) {
      console.warn(
        '[crowdfund.confirm-payment] failed to send receipt without database',
        receiptError.message
      );
    }

    return res.json({
      success: true,
      fallback: true,
      message: 'Contribution recorded without database update.',
    });
  }

  try {
    const docRef = db.collection('crowdfund').doc('status');
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const current = doc.exists ? doc.data() || {} : {};
      const goal = typeof current.goal === 'number' ? current.goal : 1000;
      const pizzasSold = Number(current.pizzasSold) || 0;
      const funders = Array.isArray(current.funders) ? current.funders.slice() : [];

      funders.push({
        name: sanitizedFunderName,
        date: new Date().toISOString(),
        email: safeEmail || null,
        phone: safePhone || null,
        notes: safeNotes || null,
        notify: safeNotify || 'none',
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

    await sendCrowdfundReceipts({
      funderName: sanitizedFunderName,
      email: safeEmail,
      phone: safePhone,
      totalCents: contributionTotal,
      items: normalizedItems,
      discountCode: trimmedDiscount,
      discountLabel: safeDiscountLabel,
      rewardPreference: safeRewardPreference,
      notify: safeNotify,
      notes: safeNotes,
      isComplimentary: contributionTotal <= 0,
    });

    return res.json({ success: true, newTotal: updatedTotal });
  } catch (error) {
    console.warn('[crowdfund.confirm-payment] failed to persist pizzas', error.message);
    return res.status(500).json({ error: 'Failed to update database after payment.' });
  }
};
