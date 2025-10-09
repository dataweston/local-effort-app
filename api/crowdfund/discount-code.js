const { resolveCrowdfundDiscount } = require('./_lib/discountCodes');
const { getSquareClient } = require('../_lib/squareClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'missing-code' });
    }

    const { client: squareClient } = getSquareClient();

    const discount = await resolveCrowdfundDiscount(code, { squareClient });
    if (!discount) {
      return res.json({ valid: false });
    }

    return res.json({ valid: true, discount });
  } catch (err) {
    console.error('[crowdfund.discount-code] failed to validate code', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name
    });
    return res.status(500).json({ error: 'Unable to validate discount code. Please try again.' });
  }
};
