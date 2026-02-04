import { useEffect, useMemo, useRef, useState } from 'react';

type SquareCardResult = {
  status: string;
  token?: string;
  errors?: Array<{ message?: string; code?: string }>;
};

type SquareCard = {
  attach: (selectorOrElement: string | HTMLElement) => Promise<void>;
  destroy?: () => Promise<void> | void;
  tokenize: () => Promise<SquareCardResult>;
};

type SquarePayments = {
  card: (options?: Record<string, unknown>) => Promise<SquareCard>;
  verifyBuyer?: (token: string, details: Record<string, unknown>) => Promise<{
    token?: string;
    verificationToken?: string;
    errors?: Array<{ message?: string; code?: string }>;
  }>;
};

type SquareEnvironment = 'sandbox' | 'production';

type SquareConfig = {
  appId: string | null;
  locationId: string | null;
  sdkUrl: string;
  isSandbox: boolean;
  environment: SquareEnvironment;
};

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<SquarePayments>;
    };
    __SQUARE_APP_ID__?: string;
    __SQUARE_LOCATION_ID__?: string;
    __SQUARE_ENV__?: string;
    SQUARE_APPLICATION_ID?: string;
    SQUARE_LOCATION_ID?: string;
  }
}

const SQUARE_SCRIPT_ATTR = 'data-square-sdk';

const scriptState: { promise: Promise<void> | null; url: string | null } = {
  promise: null,
  url: null,
};

const resolveEnvHint = () => {
  const env = (import.meta as any)?.env || {};
  const raw =
    (typeof window !== 'undefined' && window.__SQUARE_ENV__) ||
    env?.VITE_SQUARE_ENV ||
    '';
  return String(raw || '')
    .trim()
    .toLowerCase();
};

const getSquareConfig = (): SquareConfig => {
  const env = (import.meta as any)?.env || {};
  const appId =
    (typeof window !== 'undefined' &&
      (window.__SQUARE_APP_ID__ || window.SQUARE_APPLICATION_ID || null)) ||
    env?.VITE_SQUARE_APP_ID ||
    null;

  const locationId =
    (typeof window !== 'undefined' &&
      (window.__SQUARE_LOCATION_ID__ || window.SQUARE_LOCATION_ID || null)) ||
    env?.VITE_SQUARE_LOCATION_ID ||
    null;

  const envHint = resolveEnvHint();
  let isSandbox = false;

  if (envHint) {
    if (['sandbox', 'dev', 'development', 'test'].includes(envHint)) {
      isSandbox = true;
    } else if (['prod', 'production', 'live'].includes(envHint)) {
      isSandbox = false;
    }
  } else if (appId && appId.startsWith('sandbox-')) {
    isSandbox = true;
  } else if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';
    if (/localhost$/i.test(hostname) || hostname === '127.0.0.1') {
      isSandbox = true;
    }
  } else if (env?.MODE && env.MODE !== 'production') {
    isSandbox = true;
  }

  const sdkUrl = isSandbox
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js';

  return {
    appId: appId || null,
    locationId: locationId || null,
    sdkUrl,
    isSandbox,
    environment: isSandbox ? 'sandbox' : 'production',
  };
};

const loadSquareSdk = (sdkUrl: string, isSandbox: boolean): Promise<void> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Square SDK requires a browser environment.'));
  }

  if (scriptState.promise && scriptState.url === sdkUrl) {
    return scriptState.promise;
  }

  const startMs = performance?.now?.() ?? Date.now();
  console.log('[square] requesting Square Web Payments SDK', { sdkUrl });

  const promise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[${SQUARE_SCRIPT_ATTR}]`);

    const finish = (success: boolean, error?: Error) => {
      if (script) {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      }
      if (success) {
        const elapsed = Math.round((performance?.now?.() ?? Date.now()) - startMs);
        console.log('[square] Square Web Payments SDK loaded', { sdkUrl, elapsed });
        resolve();
      } else {
        reject(error || new Error('Failed to load Square Web Payments SDK.'));
      }
    };

    const onLoad = () => {
      if (script) {
        script.dataset.squareLoaded = 'true';
      }
      finish(true);
    };

    const onError = (event: Event | string) => {
      const message =
        typeof event === 'string'
          ? event
          : 'Failed to load Square Web Payments SDK';
      finish(false, new Error(message));
    };

    if (script && script.src !== sdkUrl) {
      script.parentElement?.removeChild(script);
      script = null;
    }

    if (!script) {
      script = document.createElement('script');
      script.async = true;
      script.src = sdkUrl;
      script.setAttribute(SQUARE_SCRIPT_ATTR, 'true');
      script.dataset.squareSdkEnv = isSandbox ? 'sandbox' : 'production';
      document.head.appendChild(script);
    } else if (script.dataset.squareLoaded === 'true' || (window as any).Square) {
      finish(true);
      return;
    }

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
  }).catch((err) => {
    if (scriptState.url === sdkUrl) {
      scriptState.promise = null;
      scriptState.url = null;
    }
    console.error('[square] Square Web Payments SDK failed to load', err);
    throw err;
  });

  scriptState.promise = promise;
  scriptState.url = sdkUrl;
  return promise;
};

export const useSquarePayments = () => {
  const config = useMemo(() => getSquareConfig(), []);
  const [payments, setPayments] = useState<SquarePayments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (typeof window === 'undefined') {
      setError('Square payments require a browser environment.');
      return;
    }

    if (!config.appId || !config.locationId) {
      const message = 'Square configuration missing application or location ID.';
      console.error('[square] missing configuration for Square Web Payments', config);
      setError(message);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadSquareSdk(config.sdkUrl, config.isSandbox)
      .then(() => {
        const square = window.Square;
        if (!square?.payments) {
          throw new Error('Square payments API is unavailable after script load.');
        }
        return square.payments(config.appId as string, config.locationId as string);
      })
      .then((instance) => {
    if (cancelled) {
      return;
    }
        console.log('[square] Square payments initialized', {
          locationId: config.locationId,
          environment: config.environment,
        });
        setPayments(instance);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[square] failed to initialize Square payments', err);
          setError(err?.message || 'Failed to initialize Square payments.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [config]);

  return {
    payments,
    loading,
    error,
    appId: config.appId,
    locationId: config.locationId,
    isSandbox: config.isSandbox,
    sdkUrl: config.sdkUrl,
    environment: config.environment,
  } as const;
};

export type UseSquarePaymentsReturn = ReturnType<typeof useSquarePayments>;
