const express = require('express');
const { v4: uuidv4 } = require('uuid');

function createCrowdfundingRouter({ db, squareClient, logger }) {
  const router = express.Router();

  router.get('/status', async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: 'Failed to read database.' });
      }
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
      return res.status(500).json({ error: 'Failed to read database.' });
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

  return router;
}

module.exports = { createCrowdfundingRouter };
