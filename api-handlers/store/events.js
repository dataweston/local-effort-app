// POST /api/store/events
// Fire-and-forget checkout funnel instrumentation. Accepted events retain the
// legacy Firestore document shape and are also written to the Brain ledger.
// This endpoint must always return 204 and never block a customer flow: the
// browser sends these with keepalive and ignores the response, so the write is
// finished before responding. Writing after the response risks the serverless
// function being frozen first, which silently loses the very failure events
// this endpoint exists to keep.

const { recordCheckoutEvent } = require('./_recordEvent');

const EVENT_ALLOWLIST = new Set([
  'checkout.started',
  'express_pay.shown',
  'express_pay.used',
  'contact.completed',
  'shipping.loaded',
  'shipping.selected',
  'payment.attempted',
  'payment.failed',
  'order.placed',
  'session.abandoned',
  'reprice.triggered',
  'cart.opened',
  'cart.item_added',
  'product.viewed',
  'page.error',
]);

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const { event, store, sessionId, meta } = req.body || {};
      if (event && EVENT_ALLOWLIST.has(event)) {
        await recordCheckoutEvent({ event, store, sessionId, meta });
      }
    }
  } catch (err) {
    console.warn('[store/events] record failed:', err?.message);
  }
  res.status(204).end();
};
