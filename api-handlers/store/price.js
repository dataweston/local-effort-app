const { prisma } = require('../_lib/prisma');
const { priceStorefrontCart } = require('../../backend/api/pricing/storefrontCatalogService');
const { validateSmithOrder } = require('./_pizzaOnSmith');
const { isSelectableDate } = require('./_dateSelection');
const { LOCAL_DELIVERY_FEE_CENTS, resolveDeliveryMinimum, resolveFulfillmentFee } = require('./_fulfillment');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { items, store = 'sale', pickup = true, pricingVersion = null } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items required' });
  try {
    const smithError = validateSmithOrder(items, store, pickup);
    if (smithError) return res.status(422).json({ error: smithError });
    const priced = await priceStorefrontCart({ store, items, fulfillment: { pickup }, expectedPriceBookVersion: pricingVersion, prisma });
    for (const line of priced.lines) {
      if (line.selectedDate && !isSelectableDate(line.selectedDate)) return res.status(422).json({ error: `Choose a future date for ${line.title}.`, code: 'catalog-option-invalid' });
      if (line.inventoryMode === 'manual' && line.quantity > Math.max(0, line.manualQty || 0)) return res.status(409).json({ error: `${line.title} only has ${Math.max(0, line.manualQty || 0)} remaining. Please update your cart.`, code: 'insufficient-inventory', productId: line.productId, available: Math.max(0, line.manualQty || 0) });
      if (!pickup && line.allowsDelivery === false) return res.status(409).json({ error: `${line.title} is pickup only. Choose pickup or remove it from your bag.`, code: 'pickup-only-product', productId: line.productId });
    }
    const minimum = resolveDeliveryMinimum(store);
    if (!pickup && minimum && priced.subtotal < minimum) return res.status(409).json({ error: `Chez Garage delivery requires a $${(minimum / 100).toFixed(0)} merchandise minimum.`, code: 'delivery-minimum', minimumCents: minimum, subtotal: priced.subtotal });
    const fulfillmentFee = resolveFulfillmentFee(store, pickup !== false);
    return res.status(200).json({ lines: priced.lines, subtotal: priced.subtotal, fulfillmentFee, total: priced.subtotal + fulfillmentFee, localDeliveryFee: LOCAL_DELIVERY_FEE_CENTS, deliveryMinimum: minimum, currency: 'USD', pricedAt: new Date().toISOString(), priceBookKey: priced.priceBookKey, priceBookVersion: priced.priceBookVersion, pricingVersion: priced.pricingVersion });
  } catch (error) {
    return res.status(error.statusCode || 503).json({ error: error.message || 'Pricing failed', code: error.code || 'catalog-pricing-unavailable' });
  }
};
