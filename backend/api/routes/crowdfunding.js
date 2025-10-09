const express = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  resolveCrowdfundDiscount,
} = require('../../../api/crowdfund/_lib/discountCodes');

function createCrowdfundingRouter({ db, squareClient, logger }) {
  const router = express.Router();

  const FEEDBACK_COLLECTION = 'crowdfund_feedback';

  const sanitizeName = (value) => {
    const str = String(value || '').replace(/\s+/g, ' ').trim();
    if (!str) return '';
    return str.slice(0, 120);
  };

  const sanitizeMessage = (value) => {
    const str = String(value || '').replace(/\r/g, '').trim();
    if (!str) return '';
    return str.slice(0, 600);
  };

  const sanitizeRating = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    const int = Math.round(num);
    if (int < 1 || int > 5) return null;
    return int;
  };

  const mapFeedbackDoc = (doc) => {
    if (!doc) return null;
    const data = typeof doc.data === 'function' ? doc.data() : doc;
    if (!data) return null;
    const comment = sanitizeMessage(data.comment || data.message);
    if (!comment) return null;
    const rating = sanitizeRating(data.rating);
    return {
      id: doc.id || data.id || `feedback-${Date.now()}`,
      name: sanitizeName(data.name) || 'Anonymous pizza fan',
      comment,
      message: comment,
      rating: rating ?? null,
      createdAt: data.createdAt || null,
    };
  };

  const fallbackStatus = () => ({
    goal: 1000,
    pizzasSold: 0,
    funders: [],
    source: 'fallback',
  });

  router.get('/status', async (req, res) => {
    const respondWithFallback = () => {
      if (logger?.warn) {
        logger.warn('crowdfund status requested but database unavailable; returning fallback data');
      }
      return res.json(fallbackStatus());
    };

    if (!db) {
      return respondWithFallback();
    }

    try {
      const docRef = db.collection('crowdfund').doc('status');
      const doc = await docRef.get();
      if (!doc.exists) {
        const defaultData = { goal: 1000, pizzasSold: 0, funders: [] };
        await docRef.set(defaultData);
        return res.json(defaultData);
      }
      return res.json(doc.data());
    } catch (error) {
      if (logger) logger.error({ err: error }, 'crowdfund status error');
      return respondWithFallback();
    }
  });

  router.post('/contribute', async (req, res) => {
    const { items } = req.body || {};
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    try {
      const lineItems = items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity && item.quantity > 0 ? item.quantity : item.pizzaCount || 1),
        basePriceMoney: {
          amount: item.price * 100,
          currency: 'USD',
        },
      }));

      if (!squareClient) {
        return res.status(500).json({ error: 'Payment provider not configured on this server.' });
      }

      const response = await squareClient.checkoutApi.createPaymentLink({
        idempotencyKey: uuidv4(),
        order: {
          locationId: process.env.SQUARE_LOCATION_ID,
          lineItems,
        },
        checkoutOptions: {
          redirectUrl: 'https://localeffortfood.com/#/crowdfunding?payment=success',
          askForShippingAddress: true,
        },
      });

      return res.json({ url: response.result.paymentLink.url });
    } catch (error) {
      if (logger) logger.error({ err: error }, 'square create payment link error');
      return res.status(500).json({ error: 'Failed to create payment link.' });
    }
  });

  router.post('/discount-code', async (req, res) => {
    try {
      const { code } = req.body || {};
      if (!code || typeof code !== 'string' || !code.trim()) {
        return res.status(400).json({ error: 'missing-code' });
      }

  const discount = await resolveCrowdfundDiscount(code, { squareClient, logger });
      if (!discount) {
        return res.json({ valid: false });
      }

      return res.json({ valid: true, discount });
    } catch (error) {
      if (logger?.warn) {
        logger.warn({ err: error }, 'crowdfund discount validation failed');
      }
      return res.status(500).json({ error: 'unable-to-validate-discount' });
    }
  });

  router.post('/confirm-payment', async (req, res) => {
    const { items = [], funderName } = req.body || {};
    try {
      const pizzasInCart = items
        .filter((item) => item.type === 'pizza')
        .reduce((sum, item) => {
          const pizzaCount = Number(item.pizzaCount);
          const quantity = Number(item.quantity);
          if (Number.isFinite(pizzaCount) && pizzaCount > 0) {
            return sum + pizzaCount;
          }
          if (Number.isFinite(quantity) && quantity > 0) {
            return sum + quantity;
          }
          return sum + 1;
        }, 0);

      if (pizzasInCart === 0) {
        return res.json({ success: true, message: 'No pizza items to update.' });
      }

      if (!db) {
        return res.status(500).json({ error: 'Database not configured on this server.' });
      }

      const docRef = db.collection('crowdfund').doc('status');
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        const current = doc.exists ? (doc.data() || {}) : {};

        const newPizzasSold = (current.pizzasSold || 0) + pizzasInCart;
        const newFunders = Array.isArray(current.funders) ? current.funders.slice() : [];
        newFunders.push({
          name: (funderName && funderName.trim()) || 'Anonymous',
          date: new Date().toISOString(),
        });

        if (doc.exists) {
          transaction.update(docRef, {
            pizzasSold: newPizzasSold,
            funders: newFunders,
          });
        } else {
          transaction.set(docRef, {
            goal: typeof current.goal === 'number' ? current.goal : 1000,
            pizzasSold: newPizzasSold,
            funders: newFunders,
          });
        }
      });

      const updatedDoc = await docRef.get();
      const updatedTotal = updatedDoc.exists ? (updatedDoc.data().pizzasSold || 0) : null;
      return res.json({ success: true, newTotal: updatedTotal });
    } catch (error) {
      if (logger) logger.error({ err: error }, 'confirm payment error');
      return res.status(500).json({ error: 'Failed to update database after payment.' });
    }
  });

  router.get('/pizza-feedback', async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: 'Feedback storage unavailable' });
      }

      let limit = parseInt(req.query.limit, 10);
      if (!Number.isFinite(limit) || limit <= 0) limit = 8;
      limit = Math.min(limit, 20);

      const snapshot = await db
        .collection(FEEDBACK_COLLECTION)
        .orderBy('createdAtMs', 'desc')
        .limit(limit)
        .get();

      const entries = Array.isArray(snapshot?.docs)
        ? snapshot.docs
            .map((doc) => mapFeedbackDoc({ id: doc.id, data: () => doc.data() }))
            .filter(Boolean)
        : [];

      return res.json({ entries });
    } catch (error) {
      if (logger) logger.error({ err: error }, 'pizza feedback list error');
      return res.status(500).json({ error: 'Failed to load pizza feedback.' });
    }
  });

  router.post('/pizza-feedback', async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: 'Feedback storage unavailable' });
      }

      const name = sanitizeName(req.body?.name);
      const rating = sanitizeRating(req.body?.rating);
      const comment = sanitizeMessage(req.body?.message ?? req.body?.comment);

      if (!comment) {
        return res.status(400).json({ error: 'Please share a quick note about the pizza.' });
      }

      if (!Number.isInteger(rating)) {
        return res.status(400).json({ error: 'Please choose how much you loved the pizza.' });
      }

      const entry = {
        name: name || 'Anonymous pizza fan',
        comment,
        message: comment,
        rating,
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        source: 'web',
      };

      let docId = null;
      try {
        const docRef = await db.collection(FEEDBACK_COLLECTION).add(entry);
        docId = docRef?.id || null;
      } catch (firestoreErr) {
        if (logger) logger.warn({ err: firestoreErr }, 'pizza feedback write error');
        return res.status(500).json({ error: 'Failed to save pizza feedback.' });
      }

      const responseEntry = {
        id: docId || `feedback-${entry.createdAtMs}`,
        name: entry.name,
        comment: entry.comment,
        message: entry.comment,
        rating: entry.rating,
        createdAt: entry.createdAt,
      };

      return res.json({ entry: responseEntry });
    } catch (error) {
      if (logger) logger.error({ err: error }, 'pizza feedback submit error');
      return res.status(500).json({ error: 'Failed to save pizza feedback.' });
    }
  });

  return router;
}

module.exports = { createCrowdfundingRouter };
