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
  const [envInfo, setEnvInfo] = useState({
    appId: null,
    locationId: null,
    sdkUrl: null,
    sandbox: false,
    mismatch: false,
    environment: null,
    attempts: 0,
  });

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
    // Detect desired mode using explicit env first, then app-id heuristics, lastly localhost fallback.
    const runtimeAppId = (window?.__SQUARE_APP_ID__) || (import.meta?.env?.VITE_SQUARE_APP_ID) || window?.SQUARE_APPLICATION_ID || '';
    const envHint = (() => {
      const raw = (window?.__SQUARE_ENV__ ?? import.meta?.env?.VITE_SQUARE_ENV ?? '').toString().trim().toLowerCase();
      if (!raw) return '';
      if (['sandbox', 'dev', 'development', 'test'].includes(raw)) return 'sandbox';
      if (['production', 'prod', 'live'].includes(raw)) return 'production';
      return raw;
    })();
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    let isSandbox = false;
    if (envHint === 'sandbox') {
      isSandbox = true;
    } else if (envHint === 'production') {
      isSandbox = false;
    } else if (runtimeAppId.startsWith('sandbox-')) {
      isSandbox = true;
    } else if (/localhost$/i.test(hostname) || hostname === '127.0.0.1') {
      isSandbox = true;
    }
    const sdkUrl = isSandbox ? 'https://sandbox.web.squarecdn.com/v1/square.js' : 'https://web.squarecdn.com/v1/square.js';
    const existing = document.querySelector('script[data-square-sdk]');
    if (!existing) {
      const sc = document.createElement('script');
      sc.src = sdkUrl;
      sc.async = true;
      sc.dataset.squareSdk = 'true';
      sc.dataset.squareSdkEnv = isSandbox ? 'sandbox' : 'production';
      sc.onerror = () => {
        setError('Failed to load payment script.');
        setLoadingScript(false);
      };
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
      } else {
        setEnvInfo(info => ({ ...info, mismatch: false }));
      }
    }
    setEnvInfo(info => ({
      ...info,
      appId: runtimeAppId || null,
      locationId: (window?.__SQUARE_LOCATION_ID__) || (import.meta?.env?.VITE_SQUARE_LOCATION_ID) || window?.SQUARE_LOCATION_ID || null,
      sdkUrl,
      sandbox: isSandbox,
      environment: isSandbox ? 'sandbox' : 'production',
    }));
  }, [enabled]);

  // Initialize card
  useEffect(() => {
    if (!enabled) return;
    const abortController = new AbortController();
    const { signal } = abortController;
    const appId = (window?.__SQUARE_APP_ID__) || (import.meta?.env?.VITE_SQUARE_APP_ID) || window?.SQUARE_APPLICATION_ID;
    const locationId = (window?.__SQUARE_LOCATION_ID__) || (import.meta?.env?.VITE_SQUARE_LOCATION_ID) || window?.SQUARE_LOCATION_ID;
    if (!appId || !locationId) {
      setError('Payment not available: missing Square configuration.');
      return () => abortController.abort();
    }

    const waitForSquare = async () => {
      if (window.Square) return;
      const start = Date.now();
      while (!signal.aborted) {
        if (window.Square) return;
        if (Date.now() - start > 20000) {
          throw new Error('Payment form failed to load (script not ready).');
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      throw new DOMException('Aborted', 'AbortError');
    };

    const waitForContainer = () => new Promise((resolve, reject) => {
      let observer;
      let interval;
      let timeout;

      const resolveWith = (node) => {
        if (signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        resolve(node);
      };
      const rejectWith = (err) => {
        if (signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
        } else {
          reject(err);
        }
      };

      const cleanup = () => {
        if (observer) observer.disconnect();
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        if (signal) signal.removeEventListener('abort', onAbort);
      };

      const lookup = () => {
        if (signal.aborted) {
          cleanup();
          reject(new DOMException('Aborted', 'AbortError'));
          return true;
        }
        const node = typeof containerId === 'string' ? document.querySelector(containerId) : containerId;
        if (node) {
          cleanup();
          resolveWith(node);
          return true;
        }
        return false;
      };

      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      if (lookup()) return;

      const observerRoot = document.body || document.documentElement;
      try {
        observer = new MutationObserver(() => {
          lookup();
        });
        observer.observe(observerRoot, { childList: true, subtree: true });
      } catch (_) {
        observer = undefined;
      }
      interval = setInterval(() => {
        lookup();
      }, 150);
      signal.addEventListener('abort', onAbort, { once: true });
      timeout = setTimeout(() => {
        cleanup();
        rejectWith(new Error('Payment container not found (timed out).'));
      }, 120000);
    });

    const init = async () => {
      try {
        if (cardRef.current || attachStartedRef.current) return;
        setAttempts((a) => a + 1);
        await waitForSquare();
        if (signal.aborted) return;
        const payments = window.Square.payments(appId, locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        const container = await waitForContainer();
        if (signal.aborted) return;
        attachStartedRef.current = true;
        await card.attach(container);
        if (!signal.aborted) {
          cardRef.current = card;
          setCardLoaded(true);
          setError('');
        }
      } catch (e) {
        if (signal.aborted) return;
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug('[Square:init:error]', e);
        }
        const msg = e?.message || 'Payment initialization failed';
        attachStartedRef.current = false;
        if (msg.includes('Invalid App ID')) {
          setError('Invalid Square App ID.');
        } else if (msg.includes('Unexpected token')) {
          setError('Payment script parse error.');
        } else if (msg.includes('network')) {
          setError('Network error initializing payment form.');
        } else if (msg === 'Payment container not found (timed out).') {
          // Keep waiting for the form to render; retry automatically when it appears.
          attachStartedRef.current = false;
          setTimeout(() => {
            if (!signal.aborted) init();
          }, 300);
        } else if (msg === 'Payment form failed to load (script not ready).') {
          setError(msg);
          setTimeout(() => {
            if (!signal.aborted) init();
          }, 500);
        } else {
          setError(msg);
        }
      }
    };

    init();
    return () => {
      abortController.abort();
    };
  }, [enabled, containerId, ...deps]);

  useEffect(() => {
    setEnvInfo(info => ({ ...info, attempts }));
  }, [attempts]);

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
