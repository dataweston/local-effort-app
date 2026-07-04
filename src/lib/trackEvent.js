import { getAcquisitionContext } from './acquisitionContext';

/**
 * Fire-and-forget checkout funnel instrumentation.
 *
 * Preserves the operational event stream at /api/store/events and mirrors
 * supported commercial events to GA4. Event names must match the server
 * allowlist in api-handlers/store/events.js.
 */
const GA4_EVENT_MAP = Object.freeze({
  'product.viewed': 'view_item',
  'cart.item_added': 'add_to_cart',
  'checkout.started': 'begin_checkout',
  'shipping.selected': 'add_shipping_info',
  'payment.attempted': 'add_payment_info',
  'contact.completed': 'generate_lead',
  'order.placed': 'purchase',
});

function finiteAmount(value) {
  const amountCents = Number(value);
  return Number.isFinite(amountCents) && amountCents >= 0 ? amountCents / 100 : undefined;
}

function buildGa4Params(event, store, sessionId, meta) {
  const params = { store };
  const value = finiteAmount(meta.amountCents);
  if (value !== undefined) {
    params.currency = 'USD';
    params.value = value;
  }
  if (typeof meta.productId === 'string') params.item_id = meta.productId.slice(0, 100);
  if (Number.isFinite(Number(meta.itemCount))) params.item_count = Number(meta.itemCount);
  if (typeof meta.bookingType === 'string') params.booking_type = meta.bookingType.slice(0, 100);
  if (typeof meta.leadType === 'string') params.lead_type = meta.leadType.slice(0, 100);
  if (typeof meta.method === 'string') params.payment_type = meta.method.slice(0, 100);

  if (event === 'order.placed') {
    const transactionId = meta.paymentId || sessionId;
    if (typeof transactionId === 'string' && transactionId) {
      params.transaction_id = transactionId.slice(0, 100);
    }
  }
  return params;
}

function emitGa4Event(event, store, sessionId, meta) {
  const ga4Event = GA4_EVENT_MAP[event];
  if (!ga4Event || typeof window.gtag !== 'function') return;

  // This legacy event page already emits richer GA4 ecommerce payloads.
  // Remove this guard when the page's direct gaEvent calls are migrated.
  if (store === 'july-dinner') return;

  try {
    window.gtag('event', ga4Event, buildGa4Params(event, store, sessionId, meta));
  } catch (_) {
    // Measurement must never propagate errors into checkout.
  }
}

export function trackEvent(event, meta = {}) {
  if (typeof window === 'undefined') return;
  const { store, sessionId, ...rest } = meta;
  const normalizedStore = store || 'unknown';
  const acquisition = getAcquisitionContext();

  emitGa4Event(event, normalizedStore, sessionId, rest);

  try {
    fetch('/api/store/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        store: normalizedStore,
        sessionId: sessionId || null,
        meta: { ...rest, acquisition },
      }),
      // keepalive allows the request to outlive page unload.
      keepalive: true,
    }).catch(() => {
      // Swallow transport failures.
    });
  } catch (_) {
    // Measurement must never propagate errors into checkout.
  }
}
