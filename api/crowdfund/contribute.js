const { v4: uuidv4 } = require('uuid');
const { getSquareClient } = require('../_lib/squareClient');

const DEFAULT_SUCCESS_URL = 'https://localeffortfood.com/crowdfunding?payment=success';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client: squareClient, locationId } = getSquareClient();
  if (!squareClient) {
    return res.status(500).json({ error: 'Payment provider not configured on this server.' });
  }
  if (!locationId) {
    return res.status(500).json({ error: 'Square location missing' });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  const lineItems = items.map((item) => {
    const quantity = Number(item?.quantity || item?.pizzaCount || 1);
    const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
    const priceDollars = Number(item?.price || 0);
    const amount = Math.round(priceDollars * 100);
    return {
      name: item?.name || 'Contribution',
      quantity: String(normalizedQuantity),
      basePriceMoney: {
        amount,
        currency: 'USD',
      },
    };
  });

  const checkoutOptions = {
    redirectUrl: process.env.CROWDFUND_PAYMENT_SUCCESS_URL || DEFAULT_SUCCESS_URL,
    askForShippingAddress: true,
  };

  try {
    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: uuidv4(),
      order: {
        locationId,
        lineItems,
      },
      checkoutOptions,
    });

    return res.status(200).json({ url: response.result?.paymentLink?.url || null });
  } catch (error) {
    console.warn('[crowdfund.contribute] failed to create payment link', error.message);
    return res.status(500).json({ error: 'Failed to create payment link.' });
  }
};
