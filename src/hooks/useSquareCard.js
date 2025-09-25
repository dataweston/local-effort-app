import { useEffect, useRef, useState, useCallback } from 'react';

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
  const [envInfo, setEnvInfo] = useState({ appId: null, locationId: null, sdkUrl: null, sandbox: false, mismatch: false });

  // Allow consumer to manually force a remount (e.g., when reopening a modal)
  const reset = useCallback(() => {
    try {
      cardRef.current = null;
      paymentsRef.current = null;
      attachStartedRef.current = false;
      setCardLoaded(false);
      setError('');
      setAttempts(0);
    } catch (_) { /* ignore */ }
  }, []);

  // Inject script (once)
  useEffect(() => {
    if (!enabled) return;
    // Detect desired mode
    const rawEnv = (import.meta?.env?.VITE_SQUARE_ENV || window.__SQUARE_ENV__ || '').toLowerCase();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const prodHost = /localeffort\.(app|com)$/i.test(hostname);
    // Use heuristics: sandbox app IDs start with 'sandbox-'
    const runtimeAppId = (window?.__SQUARE_APP_ID__) || (import.meta?.env?.VITE_SQUARE_APP_ID) || window?.SQUARE_APPLICATION_ID || '';
    const sandboxById = runtimeAppId.startsWith('sandbox-');
    const explicitSandbox = rawEnv === 'sandbox' || rawEnv === 'dev' || rawEnv === 'development';
    const forceProd = rawEnv === 'production' || rawEnv === 'prod';
    const isSandbox = explicitSandbox || sandboxById || (!forceProd && !prodHost);
    const sdkUrl = isSandbox ? 'https://sandbox.web.squarecdn.com/v1/square.js' : 'https://web.squarecdn.com/v1/square.js';
    const existing = document.querySelector('script[data-square-sdk]');
    if (!existing) {
      const sc = document.createElement('script');
      sc.src = sdkUrl;
      sc.async = true;
      sc.dataset.squareSdk = 'true';
      sc.onerror = () => setError('Failed to load payment script.');
      setLoadingScript(true);
      sc.onload = () => setLoadingScript(false);
      document.head.appendChild(sc);
    } else {
      // Validate that existing script matches desired environment
      const currentUrl = existing.getAttribute('src') || '';
      if (currentUrl !== sdkUrl) {
        // Env mismatch: show warning but do not replace mid-flight.
        setError(prev => prev || 'Payment script environment mismatch (refresh may be required).');
        setEnvInfo(info => ({ ...info, mismatch: true }));
      }
    }
    setEnvInfo(info => ({
      ...info,
      appId: runtimeAppId || null,
      locationId: (window?.__SQUARE_LOCATION_ID__) || (import.meta?.env?.VITE_SQUARE_LOCATION_ID) || window?.SQUARE_LOCATION_ID || null,
      sdkUrl,
      sandbox: isSandbox,
    }));
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
        if (attempts > 30) { // ~7.5s
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
        // Retry container presence up to 40 * 125ms = 5s
        let container = null;
        for (let i = 0; i < 40; i++) {
          container = typeof containerId === 'string' ? document.querySelector(containerId) : null;
          if (container) break;
          await new Promise(r => setTimeout(r, 125));
        }
        if (!container) {
          setError('Payment container not found (timed out).');
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
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[Square:init:error]', e);
        }
        if (msg.includes('Invalid App ID')) {
          setError('Invalid Square App ID.');
        } else if (msg.includes('Unexpected token')) {
          setError('Payment script parse error.');
        } else if (msg.includes('network')) {
          setError('Network error initializing payment form.');
        } else {
          setError(msg);
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [enabled, attempts, containerId, reset, ...deps]);

  const tokenize = async () => {
    if (!cardRef.current) throw new Error(error || 'Card form not ready');
    const result = await cardRef.current.tokenize();
    if (result.status !== 'OK') {
      const first = result?.errors?.[0];
      const msg = first?.message || first?.code || result.status || 'Card details invalid';
      throw new Error(msg);
    }
    return result.token;
  };

  return { cardLoaded, error, loadingScript, tokenize, reset, envInfo };
}
