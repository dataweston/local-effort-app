// Durable write path for checkout funnel events, shared by the public beacon
// (events.js) and the checkout handler itself, so a server-side rejection is
// recorded in the same ledger the owner already reads.
//
// Callers MUST await this before responding: on Vercel a function can be
// frozen as soon as the response is sent, which silently drops work still in
// flight. It never throws.

const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
const { writeLedgerEvent } = require('../../backend/api/brain/ledger');
const { sanitizeCheckoutEvent, checkoutEventSourceId } = require('./_eventPayload');

async function recordCheckoutEvent({ event, store, sessionId, meta, actorType = 'visitor' }) {
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
      actorType,
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
  return accepted;
}

module.exports = { recordCheckoutEvent };
