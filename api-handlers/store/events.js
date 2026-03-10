// POST /api/store/events
// Fire-and-forget checkout funnel event log. Frontend sends these on key
// moments; we persist to Firestore for funnel analysis.
//
// Body: {
//   event: string,       — event name, see EVENT_ALLOWLIST below
//   store: string,       — 'sale' | 'happy-monday' | etc.
//   sessionId?: string,  — checkout attempt id if available
//   meta?: object        — small, schema-free metadata bag
// }
//
// Always returns 204. Never blocks the user-facing flow.

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');

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
]);

module.exports = async (req, res) => {
  // Always 204 — never block the client
  res.status(204).end();

  if (req.method !== 'POST') return;

  const { event, store, sessionId, meta } = req.body || {};
  if (!event || !EVENT_ALLOWLIST.has(event)) return;

  const { firestore } = getFirebaseAdmin();
  if (!firestore) return;

  try {
    await firestore.collection('checkout_events').add({
      event,
      store: store || 'unknown',
      sessionId: sessionId || null,
      meta: meta && typeof meta === 'object' ? meta : {},
      ts: new Date().toISOString(),
      tsMs: Date.now(),
    });
  } catch (err) {
    // Silent — instrumentation must never surface errors to users
    console.warn('[store/events] log failed:', err?.message);
  }
};
