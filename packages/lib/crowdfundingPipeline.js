const crypto = require('node:crypto');

let getDefaultDb = () => null;
try {
  // eslint-disable-next-line global-require
  let firebaseAdmin = null;
  try {
    firebaseAdmin = require('./firebaseAdmin');
  } catch (innerError) {
    firebaseAdmin = require('./firebaseAdmin.ts');
  }
  if (firebaseAdmin && Object.prototype.hasOwnProperty.call(firebaseAdmin, 'db')) {
    getDefaultDb = () => firebaseAdmin.db;
  }
} catch (error) {
  // Module may be unavailable in some runtimes (e.g., backend initializes its own Firestore instance).
  getDefaultDb = () => null;
}

function resolveDb(options = {}) {
  if (options.db) {
    return options.db;
  }
  try {
    const db = getDefaultDb ? getDefaultDb() : null;
    return db || null;
  } catch (error) {
    return null;
  }
}

function ensureDb(options = {}) {
  const firestore = resolveDb(options);
  if (!firestore) {
    throw Object.assign(new Error('Firestore unavailable'), { code: 'firestore-unavailable' });
  }
  return firestore;
}

function parsePizzaQuantity(payment) {
  const items = (payment?.order?.line_items && Array.isArray(payment.order.line_items)) ? payment.order.line_items : [];
  return items
    .filter((item) => {
      const name = (item && item.name) || '';
      const catalogId = (item && item.catalog_object_id) || '';
      return /pizza/i.test(String(name)) || /pizza/i.test(String(catalogId));
    })
    .reduce((sum, item) => {
      const quantityRaw = item?.quantity;
      const quantity = typeof quantityRaw === 'string' ? Number(quantityRaw) : Number(quantityRaw ?? 0);
      return sum + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);
}

async function applyCompletedPayment(payment, options = {}) {
  const firestore = ensureDb(options);

  if (!payment?.id) {
    throw Object.assign(new Error('payment-id-missing'), { code: 'invalid-payment' });
  }

  const paymentId = payment.id;
  const customerId = payment.customer_id ?? null;
  const qty = parsePizzaQuantity(payment);
  const amount = Number(payment?.amount_money?.amount ?? 0);

  await firestore.runTransaction(async (tx) => {
    const ordersRef = firestore.collection('orders').doc(paymentId);
    const existingOrder = await tx.get(ordersRef);
    if (existingOrder.exists) {
      return;
    }

    tx.set(ordersRef, {
      createdAt: new Date(),
      squarePaymentId: paymentId,
      customerId,
      item: 'pizza',
      qty,
      amount,
      status: 'PAID',
      source: 'square',
    });

    let backerIncrement = 0;
    if (customerId) {
      const backerRef = firestore.collection('backers').doc(customerId);
      const backerSnap = await tx.get(backerRef);
      if (!backerSnap.exists) {
        backerIncrement = 1;
        tx.set(backerRef, {
          firstSeenAt: new Date(),
          ordersCount: 1,
          amountTotal: amount,
        });
      } else {
        const data = backerSnap.data() || {};
        tx.update(backerRef, {
          ordersCount: Number(data.ordersCount ?? 0) + 1,
          amountTotal: Number(data.amountTotal ?? 0) + amount,
        });
      }
    }

    const aggRef = firestore.collection('aggregates').doc('crowdfunding');
    const aggSnap = await tx.get(aggRef);
    const base = aggSnap.exists ? aggSnap.data() || {} : {};
    const nextPizzas = Number(base.pizzas ?? 0) + qty;
    const nextBackers = Number(base.backers ?? 0) + backerIncrement;

    tx.set(
      aggRef,
      {
        pizzas: Number.isFinite(nextPizzas) ? nextPizzas : qty,
        backers: Number.isFinite(nextBackers) ? nextBackers : backerIncrement,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  });

  console.info('[crowdfunding.pipeline] processed payment', {
    id: paymentId,
    customerId,
    qty,
    amount,
  });
}

function normalizeFeedbackInput(input) {
  const rating = Number(input?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error('invalid-rating'), { code: 'invalid-rating' });
  }

  const rawComment = typeof input?.comment === 'string' ? input.comment : '';
  const trimmedComment = rawComment.replace(/\r/g, '').trim();
  if (!trimmedComment) {
    throw Object.assign(new Error('missing-comment'), { code: 'missing-comment' });
  }
  const comment = trimmedComment.slice(0, 2000);

  const customerId = typeof input?.customerId === 'string' && input.customerId.trim()
    ? input.customerId.trim()
    : null;
  const orderId = typeof input?.orderId === 'string' && input.orderId.trim()
    ? input.orderId.trim()
    : null;

  return { rating, comment, customerId, orderId };
}

async function createFeedback(input, options = {}) {
  const firestore = ensureDb(options);
  const { rating, comment, customerId, orderId } = normalizeFeedbackInput(input);

  const ref = firestore.collection('feedback').doc();
  await ref.set({
    rating,
    comment,
    customerId,
    orderId,
    createdAt: new Date(),
  });
  return { id: ref.id };
}

async function listFeedback(options = {}) {
  const firestore = ensureDb(options);
  const sinceOption = options.since;
  const limitOption = options.limit;

  const since = sinceOption instanceof Date && !Number.isNaN(sinceOption.getTime())
    ? sinceOption
    : (() => {
        if (typeof sinceOption === 'string' || typeof sinceOption === 'number') {
          const parsed = new Date(sinceOption);
          if (!Number.isNaN(parsed.getTime())) return parsed;
        }
        return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      })();

  let limit = Number(limitOption ?? 200);
  if (!Number.isFinite(limit) || limit <= 0) limit = 200;
  limit = Math.min(Math.max(Math.floor(limit), 1), 500);

  const snapshot = await firestore
    .collection('feedback')
    .where('createdAt', '>=', since)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

function coerceNumber(value, defaultValue = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeUpdatedAt(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function readAggregateTotals(firestore) {
  try {
    const snapshot = await firestore.collection('aggregates').doc('crowdfunding').get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    const pizzas = coerceNumber(data.pizzas, 0);
    const backers = coerceNumber(data.backers, 0);
    const goal = coerceNumber(data.goal, 0) || null;
    const updatedAt = normalizeUpdatedAt(data.updatedAt);
    return { pizzas, backers, goal, updatedAt };
  } catch (error) {
    console.warn('[crowdfunding.pipeline] failed to read aggregates/crowdfunding', error && error.message);
    return null;
  }
}

async function readLegacyStatus(firestore) {
  try {
    const snapshot = await firestore.collection('crowdfund').doc('status').get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    const pizzas = coerceNumber(data.pizzasSold, 0);
    const backersArray = Array.isArray(data.funders) ? data.funders.filter(Boolean) : [];
    const backers = backersArray.length || coerceNumber(data.backers, 0);
    const goal = (() => {
      const coerced = coerceNumber(data.goal, 0);
      return coerced > 0 ? coerced : null;
    })();

    let updatedAt = normalizeUpdatedAt(data.updatedAt);
    if (!updatedAt && backersArray.length) {
      const lastEntry = backersArray[backersArray.length - 1];
      updatedAt = normalizeUpdatedAt(lastEntry?.date);
    }

    return { pizzas, backers, goal, updatedAt };
  } catch (error) {
    console.warn('[crowdfunding.pipeline] failed to read crowdfund/status', error && error.message);
    return null;
  }
}

async function getCrowdfundingSummary(options = {}) {
  const firestore = ensureDb(options);

  const aggregate = await readAggregateTotals(firestore);
  if (aggregate && (aggregate.pizzas || aggregate.backers || aggregate.goal || aggregate.updatedAt)) {
    return aggregate;
  }

  const legacy = await readLegacyStatus(firestore);
  if (legacy) {
    return legacy;
  }

  return { pizzas: 0, backers: 0, goal: null, updatedAt: null };
}

function verifySquareSignature(rawBody, signature, options = {}) {
  if (!signature) return false;
  const sigKey = options.signatureKey || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = options.notificationUrl || process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  if (!sigKey || !notificationUrl) {
    console.error('[crowdfunding.pipeline] missing Square signature configuration');
    return false;
  }
  const hmac = crypto.createHmac('sha256', sigKey);
  hmac.update(notificationUrl + rawBody.toString('utf8'));
  const digest = hmac.digest('base64');
  const provided = Buffer.from(signature);
  const expected = Buffer.from(digest);
  if (provided.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(provided, expected);
}

module.exports = {
  applyCompletedPayment,
  verifySquareSignature,
  parsePizzaQuantity,
  getCrowdfundingSummary,
  createFeedback,
  listFeedback,
  normalizeFeedbackInput,
};
