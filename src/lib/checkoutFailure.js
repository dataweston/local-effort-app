import { trackEvent } from './trackEvent';

/**
 * Checkout failure evidence.
 *
 * Failures the server already recorded (a rejected /api/store/checkout) carry
 * `recordedByServer` and are not reported again. Everything else happens only in
 * the browser — card tokenization, buyer verification, a dropped connection — so
 * this is the only record of it. Stages: tokenize, verify, submit, express.
 */
export function reportCheckoutFailure({ store, sessionId, stage, error, amountCents }) {
  if (error?.recordedByServer) return;
  trackEvent('payment.failed', {
    store,
    sessionId,
    origin: 'client',
    stage,
    code: typeof error?.code === 'string' ? error.code : undefined,
    reason: error?.message || String(error || 'unknown'),
    amountCents,
  });
}

const MAX_PAGE_ERRORS = 3;

/**
 * Report uncaught script errors and unhandled promise rejections while a
 * checkout surface is open, so a broken page leaves a record instead of a
 * silent dead button. Capped per page load to keep a render loop from flooding
 * the ledger. Returns a cleanup function.
 */
export function capturePageErrors({ store }) {
  if (typeof window === 'undefined') return () => {};
  let sent = 0;

  const report = (stage, message, code) => {
    if (sent >= MAX_PAGE_ERRORS) return;
    sent += 1;
    trackEvent('page.error', { store, stage, code, reason: message || 'unknown' });
  };
  const onError = (event) => {
    report('window.error', event?.message, event?.error?.name);
  };
  const onRejection = (event) => {
    const reason = event?.reason;
    report('unhandledrejection', reason?.message || String(reason || 'unknown'), reason?.name);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
