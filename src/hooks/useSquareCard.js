import { useEffect, useRef, useState } from 'react';

/**
 * useSquareCard - shared hook to load Square Web Payments SDK, initialize card, and provide tokenize helper.
 * @param {string} containerId - DOM selector id (e.g. '#cf-card-container') to attach card to.
 * @param {boolean} enabled - if false, hook skips initialization.
 * @param {any[]} deps - dependency array items that, when changed, should retry initialization (e.g., tier existence).
 */
export function useSquareCard(containerId, enabled, deps = []) {
  const paymentsRef = useRef(null);
  const cardRef = useRef(null);
  const [cardLoaded, setCardLoaded] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const attachStartedRef = useRef(false);

  // Inject script (once)
  useEffect(() => {
    if (!enabled) return;
    const existing = document.querySelector('script[data-square-sdk]');
    if (existing) return;
    const mode = (import.meta?.env?.VITE_SQUARE_ENV || '').toLowerCase();
    const isProd = mode === 'production' || mode === 'prod';
    const src = isProd ? 'https://web.squarecdn.com/v1/square.js' : 'https://sandbox.web.squarecdn.com/v1/square.js';
    const sc = document.createElement('script');
    sc.src = src;
    sc.async = true;
    sc.dataset.squareSdk = 'true';
    sc.onerror = () => setError('Failed to load payment script.');
    setLoadingScript(true);
    sc.onload = () => setLoadingScript(false);
    document.head.appendChild(sc);
  }, [enabled]);

  // Initialize card
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const appId = (window?.__SQUARE_APP_ID__) || (import.meta?.env?.VITE_SQUARE_APP_ID) || window?.SQUARE_APPLICATION_ID;
    const locationId = (window?.__SQUARE_LOCATION_ID__) || (import.meta?.env?.VITE_SQUARE_LOCATION_ID) || window?.SQUARE_LOCATION_ID;
    if (!appId || !locationId) {
      setError('Payment not available: missing Square configuration.');
      return;
    }
    const init = async () => {
      if (cancelled) return;
      if (!window.Square) {
        if (attempts > 20) { // extend retries
          setError('Payment form failed to load (script not ready).');
          return;
        }
        setAttempts(a => a + 1);
        setTimeout(init, 250);
        return;
      }
      try {
        if (cardRef.current || attachStartedRef.current) return; // prevent duplicate attach
        const payments = window.Square.payments(appId, locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        const container = typeof containerId === 'string' ? document.querySelector(containerId) : null;
        if (!container) {
          setError('Payment container not found.');
          return;
        }
        attachStartedRef.current = true;
        await card.attach(containerId);
        if (!cancelled) {
          cardRef.current = card;
          setCardLoaded(true);
          setError('');
        }
      } catch (e) {
        const msg = e?.message || 'Payment initialization failed';
        // Surface more specific Square error codes if present
        if (msg.includes('Invalid App ID')) {
          setError('Invalid Square App ID.');
        } else if (msg.includes('Unexpected token')) {
          setError('Payment script parse error.');
        } else {
          setError(msg);
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [enabled, attempts, containerId, ...deps]);

  const tokenize = async () => {
    if (!cardRef.current) throw new Error(error || 'Card form not ready');
    const result = await cardRef.current.tokenize();
    if (result.status !== 'OK') {
      throw new Error(result?.errors?.[0]?.message || result.status || 'Card details invalid');
    }
    return result.token;
  };

  return { cardLoaded, error, loadingScript, tokenize };
}
