/**
 * trackEvent — fire-and-forget checkout funnel instrumentation.
 *
 * Sends a single event to /api/store/events. Never throws, never awaits a
 * response, never blocks rendering. Safe to call anywhere in the purchase flow.
 *
 * Usage:
 *   trackEvent('cart.item_added', { store: 'sale', productId: '...' });
 *   trackEvent('checkout.started', { store: 'sale', sessionId: attemptId });
 *   trackEvent('payment.failed', { store: 'sale', reason: err.message });
 *
 * Event names must match the allowlist in api-handlers/store/events.js.
 */
export function trackEvent(event, meta = {}) {
  if (typeof window === 'undefined') return;
  const { store, sessionId, ...rest } = meta;
  try {
    fetch('/api/store/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, store: store || 'unknown', sessionId: sessionId || null, meta: rest }),
      // keepalive allows the request to outlive the page unload (session.abandoned)
      keepalive: true,
    }).catch(() => { /* swallow */ });
  } catch (_) {
    // never propagate
  }
}
