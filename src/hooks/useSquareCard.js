import { useEffect, useRef, useState, useCallback } from 'react';

const SQUARE_SCRIPT_ATTR = 'data-square-sdk';
let squareScriptState = { url: null, promise: null };

const readSquareRuntimeConfig = () => {
  if (typeof window === 'undefined') {
    return {
      appId: null,
      locationId: null,
      sdkUrl: '',
      isSandbox: false,
      environment: 'production',
    };
  }

  const runtimeAppId =
    window.__SQUARE_APP_ID__ ||
    (import.meta?.env?.VITE_SQUARE_APP_ID) ||
    window.SQUARE_APPLICATION_ID ||
    '';

  const envHintRaw = (window.__SQUARE_ENV__ ?? import.meta?.env?.VITE_SQUARE_ENV ?? '')
    .toString()
    .trim()
    .toLowerCase();

  const hostname = window.location?.hostname || '';
  let isSandbox = false;
  if (['sandbox', 'dev', 'development', 'test'].includes(envHintRaw)) {
    isSandbox = true;
  } else if (['production', 'prod', 'live'].includes(envHintRaw)) {
    isSandbox = false;
  } else if (runtimeAppId.startsWith('sandbox-')) {
    isSandbox = true;
  } else if (/localhost$/i.test(hostname) || hostname === '127.0.0.1') {
    isSandbox = true;
  }

  const sdkUrl = isSandbox
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js';

  return {
    appId: runtimeAppId || null,
    locationId:
      window.__SQUARE_LOCATION_ID__ ||
      (import.meta?.env?.VITE_SQUARE_LOCATION_ID) ||
      window.SQUARE_LOCATION_ID ||
      null,
    sdkUrl,
    isSandbox,
    environment: isSandbox ? 'sandbox' : 'production',
  };
};

const getSquareSecurityState = () => {
  if (typeof window === 'undefined') {
    return {
      secureContext: false,
      secureForSquare: false,
      hostname: '',
      protocol: '',
    };
  }
  const { protocol = '', hostname = '' } = window.location || {};
  const normalizedProtocol = protocol.toLowerCase();
  const secureContext = typeof window.isSecureContext === 'boolean' ? window.isSecureContext : normalizedProtocol === 'https:';
  const secureForSquare = normalizedProtocol === 'https:' || hostname === 'localhost';
  return {
    secureContext,
    secureForSquare,
    hostname,
    protocol: normalizedProtocol,
  };
};

const ensureSquareSdkScript = (sdkUrl, isSandbox) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Square SDK requires a browser environment.'));
  }

  if (squareScriptState.promise && squareScriptState.url === sdkUrl) {
    return squareScriptState.promise;
  }

  let script = document.querySelector(`script[${SQUARE_SCRIPT_ATTR}]`);
  if (script && (script.getAttribute('src') || '') !== sdkUrl) {
    script.parentElement?.removeChild(script);
    script = null;
  }

  const promise = new Promise((resolve, reject) => {
    let scriptEl = script;

    const cleanup = () => {
      if (!scriptEl) return;
      scriptEl.removeEventListener('load', handleLoad);
      scriptEl.removeEventListener('error', handleError);
    };

    const handleLoad = () => {
      if (scriptEl) {
        scriptEl.setAttribute('data-square-loaded', 'true');
      }
      cleanup();
      resolve();
    };

    const handleError = (event) => {
      cleanup();
      const err = event instanceof Error ? event : new Error('Failed to load Square SDK');
      reject(err);
    };

    if (scriptEl) {
      scriptEl.dataset.squareSdkEnv = isSandbox ? 'sandbox' : 'production';
      const alreadyLoaded = scriptEl.getAttribute('data-square-loaded') === 'true';
      if (alreadyLoaded || window.Square) {
        resolve();
        return;
      }
      scriptEl.addEventListener('load', handleLoad, { once: true });
      scriptEl.addEventListener('error', handleError, { once: true });
    } else {
      scriptEl = document.createElement('script');
      scriptEl.src = sdkUrl;
      scriptEl.async = true;
      scriptEl.dataset.squareSdk = 'true';
      scriptEl.dataset.squareSdkEnv = isSandbox ? 'sandbox' : 'production';
      scriptEl.addEventListener('load', handleLoad, { once: true });
      scriptEl.addEventListener('error', handleError, { once: true });
      document.head.appendChild(scriptEl);
    }
  }).catch((err) => {
    if (squareScriptState.url === sdkUrl) {
      squareScriptState = { url: null, promise: null };
    }
    throw err;
  });

  squareScriptState = { url: sdkUrl, promise };
  return promise;
};

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
  const attemptsRef = useRef(0);
  const [error, setError] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const attachStartedRef = useRef(false);
  const securityState = getSquareSecurityState();
  const [envInfo, setEnvInfo] = useState({
    appId: null,
    locationId: null,
    sdkUrl: null,
    sandbox: false,
    mismatch: false,
    environment: null,
    attempts: 0,
    secureContext: securityState.secureContext,
    secureForSquare: securityState.secureForSquare,
    hostname: securityState.hostname,
    protocol: securityState.protocol,
  });

  const cleanupContainer = useCallback(() => {
    if (typeof document === 'undefined') return;
    try {
      const node =
        typeof containerId === 'string' ? document.querySelector(containerId) : containerId;
      if (node && node.childNodes && node.childNodes.length > 0) {
        node.innerHTML = '';
      }
    } catch (_) {
      // ignore cleanup issues
    }
  }, [containerId]);

  const destroyCardInstance = useCallback(() => {
    const card = cardRef.current;
    cardRef.current = null;
    attachStartedRef.current = false;

    const finalize = () => {
      cleanupContainer();
      setCardLoaded(false);
    };

    if (!card) {
      finalize();
      return;
    }

    try {
      const maybePromise = typeof card.destroy === 'function' ? card.destroy() : undefined;
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .catch(() => {})
          .finally(finalize);
        return;
      }
    } catch (_) {
      // ignore destroy issues
    }

    finalize();
  }, [cleanupContainer]);

  // Allow consumer to manually force a remount (e.g., when reopening a modal)
  const reset = useCallback(() => {
    try {
      destroyCardInstance();
      paymentsRef.current = null;
      setError('');
      setAttempts(0);
      attemptsRef.current = 0;
    } catch (_) {
      /* ignore */
    }
  }, [destroyCardInstance]);

  // Inject script (once)
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const config = readSquareRuntimeConfig();

    const security = getSquareSecurityState();
    setEnvInfo((info) => ({
      ...info,
      appId: config.appId,
      locationId: config.locationId,
      sdkUrl: config.sdkUrl,
      sandbox: config.isSandbox,
      environment: config.environment,
      mismatch: false,
      secureContext: security.secureContext,
      secureForSquare: security.secureForSquare,
      hostname: security.hostname,
      protocol: security.protocol,
    }));

    if (!security.secureForSquare) {
      setLoadingScript(false);
      setError('Payments require HTTPS or running on http://localhost.');
      return;
    }

    setLoadingScript(true);
    ensureSquareSdkScript(config.sdkUrl, config.isSandbox)
      .then(() => {
        if (cancelled) return;
        setLoadingScript(false);
        setError((prev) => (prev && prev.toLowerCase().includes('payment script') ? '' : prev));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadingScript(false);
        setError((prev) => prev || err?.message || 'Failed to load payment script.');
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Initialize card
  useEffect(() => {
    if (!enabled) return;
    const abortController = new AbortController();
    const { signal } = abortController;
    const config = readSquareRuntimeConfig();
    const security = getSquareSecurityState();

    setEnvInfo((info) => ({
      ...info,
      secureContext: security.secureContext,
      secureForSquare: security.secureForSquare,
      hostname: security.hostname,
      protocol: security.protocol,
    }));

    if (!security.secureForSquare) {
      setError('Payments require HTTPS or running on http://localhost.');
      return () => abortController.abort();
    }

    if (!config.appId || !config.locationId) {
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

    const scheduleRetry = (delay = 800) => {
      if (signal.aborted) return;
      if (attemptsRef.current >= 5) return;
      setTimeout(() => {
        if (!signal.aborted) {
          init();
        }
      }, delay);
    };

    const init = async () => {
      try {
        if (cardRef.current || attachStartedRef.current) return;
        setAttempts((a) => {
          const next = a + 1;
          attemptsRef.current = next;
          return next;
        });
        await ensureSquareSdkScript(config.sdkUrl, config.isSandbox);
        await waitForSquare();
        if (signal.aborted) return;
        if (!window.Square || typeof window.Square.payments !== 'function') {
          throw new Error('Square payments API unavailable.');
        }
        const payments = window.Square.payments(config.appId, config.locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        const container = await waitForContainer();
        if (signal.aborted) return;
        attachStartedRef.current = true;
        cleanupContainer();
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
        if (msg.includes('secure context')) {
          setError('Payments require HTTPS or running on http://localhost.');
        } else if (msg.includes('Invalid App ID')) {
          setError('Invalid Square App ID.');
        } else if (msg.includes('Unexpected token')) {
          setError('Payment script parse error.');
          scheduleRetry(1500);
        } else if (msg.includes('network')) {
          setError('Network error initializing payment form.');
          scheduleRetry(1200);
        } else if (msg === 'Payment container not found (timed out).') {
          scheduleRetry(300);
        } else if (msg === 'Payment form failed to load (script not ready).') {
          setError(msg);
          scheduleRetry(500);
        } else if (msg === 'Square payments API unavailable.') {
          setError('Square payments API unavailable.');
          scheduleRetry(800);
        } else {
          setError(msg);
          scheduleRetry(1500);
        }
      }
    };

    init();
    return () => {
      abortController.abort();
      destroyCardInstance();
      paymentsRef.current = null;
    };
  }, [enabled, containerId, destroyCardInstance, cleanupContainer, ...deps]);

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
