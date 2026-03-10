/**
 * useSquareExpressPay
 *
 * Initializes Square's Apple Pay and Google Pay buttons alongside the manual
 * card form. Call this hook once on a page that already has useSquareCard
 * running (they share the same payments instance via the same Square SDK load).
 *
 * Usage:
 *   const { googlePayAvailable, applePayAvailable, requestExpressPayment } =
 *     useSquareExpressPay({ amountCents, containerId, enabled, onToken });
 *
 * Props:
 *   amountCents  – number – the authoritative server total (cents)
 *   containerId  – string – CSS selector for the container div, e.g. '#express-pay-container'
 *   enabled      – boolean – skip init when false (e.g. Square not yet loaded)
 *   onToken      – async (token) => void – called with the nonce after user approves
 *
 * The hook mounts a Google Pay or Apple Pay button inside containerId. Each
 * button handles its own click internally; onToken fires when the wallet
 * returns a payment nonce.
 *
 * Implementation note: Square's googlePay() / applePay() methods return a button
 * element via .attach(). We unmount on cleanup.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const readConfig = () => {
  if (typeof window === 'undefined') return { appId: null, locationId: null };
  return {
    appId:
      window.__SQUARE_APP_ID__ ||
      (import.meta?.env?.VITE_SQUARE_APP_ID) ||
      null,
    locationId:
      window.__SQUARE_LOCATION_ID__ ||
      (import.meta?.env?.VITE_SQUARE_LOCATION_ID) ||
      null,
  };
};

const waitForSquare = (signal) =>
  new Promise((resolve, reject) => {
    if (window.Square) return resolve();
    const start = Date.now();
    const iv = setInterval(() => {
      if (signal?.aborted) { clearInterval(iv); reject(new DOMException('Aborted', 'AbortError')); return; }
      if (window.Square) { clearInterval(iv); resolve(); return; }
      if (Date.now() - start > 15000) { clearInterval(iv); reject(new Error('Square SDK not ready')); }
    }, 150);
  });

export function useSquareExpressPay({ amountCents, containerId, enabled, onToken }) {
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paymentsRef = useRef(null);
  const googlePayRef = useRef(null);
  const applePayRef = useRef(null);

  const destroy = useCallback(() => {
    [googlePayRef, applePayRef].forEach((ref) => {
      if (ref.current) {
        try { ref.current.destroy?.(); } catch (_) { /* ignore */ }
        ref.current = null;
      }
    });
    setGooglePayAvailable(false);
    setApplePayAvailable(false);
  }, []);

  useEffect(() => {
    if (!enabled || !amountCents || amountCents <= 0) return;

    const controller = new AbortController();
    const { signal } = controller;

    const init = async () => {
      setLoading(true);
      setError('');
      try {
        const { appId, locationId } = readConfig();
        if (!appId || !locationId) throw new Error('Square not configured');

        await waitForSquare(signal);
        if (signal.aborted) return;

        const payments = window.Square.payments(appId, locationId);
        paymentsRef.current = payments;

        const paymentRequest = payments.paymentRequest({
          countryCode: 'US',
          currencyCode: 'USD',
          total: {
            amount: (amountCents / 100).toFixed(2),
            label: 'Local Effort',
          },
        });

        const container = typeof containerId === 'string'
          ? document.querySelector(containerId)
          : containerId;
        if (!container) throw new Error('Express pay container not found');

        // Clear any previous buttons
        container.innerHTML = '';

        // Try Google Pay
        try {
          const gPay = await payments.googlePay(paymentRequest);
          await gPay.attach(container);
          googlePayRef.current = gPay;
          if (!signal.aborted) setGooglePayAvailable(true);
        } catch (_) {
          // Google Pay not available in this browser / context — silent
        }

        // Try Apple Pay
        try {
          const aPay = await payments.applePay(paymentRequest);
          await aPay.attach(container);
          applePayRef.current = aPay;
          if (!signal.aborted) setApplePayAvailable(true);
        } catch (_) {
          // Apple Pay not available — silent
        }
      } catch (err) {
        if (!signal.aborted) setError(err?.message || 'Express pay unavailable');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    // Wire tokenize callbacks on button click
    const handleToken = async (event) => {
      const token = event?.detail?.token || event?.token;
      if (token && onToken) {
        try { await onToken(token); } catch (_) { /* caller handles errors */ }
      }
    };

    const container = typeof containerId === 'string'
      ? document.querySelector(containerId)
      : containerId;
    container?.addEventListener('paymentMethodRequestUpdate', handleToken);

    init();
    return () => {
      controller.abort();
      destroy();
      container?.removeEventListener('paymentMethodRequestUpdate', handleToken);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, amountCents, containerId]);

  return { googlePayAvailable, applePayAvailable, loading, error };
}
