// POST /api/store/events
// Fire-and-forget checkout funnel instrumentation. Accepted events retain the
// legacy Firestore document shape and are also written to the Brain ledger.
// This endpoint must always return 204 and never block a customer flow.

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { writeLedgerEvent } = require('../../backend/api/brain/ledger');
const {
  sanitizeCheckoutEvent,
  checkoutEventSourceId,
} = require('./_eventPayload');

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
  // Respond before any external write. Express still allows this handler to
  // finish its best-effort writes after the response is sent.
  res.status(204).end();

  if (req.method !== 'POST') return;

  const { event, store, sessionId, meta } = req.body || {};
  if (!event || !EVENT_ALLOWLIST.has(event)) return;

  const accepted = sanitizeCheckoutEvent({ event, store, sessionId, meta });
  const occurredAt = new Date();
  const writes = [];

  try {
    const { firestore } = getFirebaseAdmin();
    if (firestore) {
      writes.push(
        firestore.collection('checkout_events').add({
          ...accepted,
          ts: occurredAt.toISOString(),
          tsMs: occurredAt.getTime(),
        }).catch((err) => {
          console.warn('[store/events] firestore log failed:', err?.message);
        }),
      );
    }
  } catch (err) {
    console.warn('[store/events] firestore unavailable:', err?.message);
  }

  writes.push(
    writeLedgerEvent({
      eventType: accepted.event,
      schemaVersion: 1,
      occurredAt,
      source: 'web_checkout',
      sourceId: checkoutEventSourceId(accepted),
      actorType: 'visitor',
      payload: {
        store: accepted.store,
        sessionId: accepted.sessionId,
        ...accepted.meta,
      },
    }).catch((err) => {
      console.warn('[store/events] brain log failed:', err?.message);
    }),
  );

  await Promise.allSettled(writes);
};
