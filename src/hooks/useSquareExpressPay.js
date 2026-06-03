/**
 * useSquareExpressPay
 *
 * Mounts Square Google Pay and Apple Pay buttons into a provided container.
 * The Square SDK owns the wallet UI; this hook attaches each button and calls
 * tokenize() from that button's click handler.
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
    const interval = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(interval);
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      if (window.Square) {
        clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - start > 15000) {
        clearInterval(interval);
        reject(new Error('Square SDK not ready'));
      }
    }, 150);
  });

const buildWalletError = (walletName, tokenResult) => {
  const first = tokenResult?.errors?.[0];
  return new Error(first?.message || first?.code || tokenResult?.status || `${walletName} was not approved.`);
};

export function useSquareExpressPay({ amountCents, containerId, enabled, onToken }) {
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!enabled || !amountCents || amountCents <= 0) return undefined;

    const controller = new AbortController();
    const { signal } = controller;

    const handleWalletToken = async (walletName, tokenResult) => {
      if (tokenResult?.status !== 'OK' || !tokenResult?.token) {
        throw buildWalletError(walletName, tokenResult);
      }
      await onToken?.(tokenResult.token, tokenResult);
    };

    const mountWalletButton = async ({ walletName, create, attachOptions, ref, setAvailable }) => {
      const container = typeof containerId === 'string'
        ? document.querySelector(containerId)
        : containerId;
      if (!container) throw new Error('Express pay container not found');

      const wallet = await create();
      const buttonHost = document.createElement('div');
      buttonHost.className = 'le-checkout-wallet-button';
      container.appendChild(buttonHost);
      await wallet.attach(buttonHost, attachOptions);
      ref.current = wallet;
      buttonHost.onclick = async () => {
        try {
          setError('');
          await handleWalletToken(walletName, await wallet.tokenize());
        } catch (err) {
          setError(err?.message || `${walletName} failed.`);
        }
      };
      if (!signal.aborted) setAvailable(true);
    };

    const init = async () => {
      setLoading(true);
      setError('');
      try {
        const { appId, locationId } = readConfig();
        if (!appId || !locationId) throw new Error('Square not configured');

        await waitForSquare(signal);
        if (signal.aborted) return;

        const payments = window.Square.payments(appId, locationId);
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
        container.innerHTML = '';

        try {
          await mountWalletButton({
            walletName: 'Google Pay',
            create: () => payments.googlePay(paymentRequest),
            attachOptions: { buttonType: 'long' },
            ref: googlePayRef,
            setAvailable: setGooglePayAvailable,
          });
        } catch (_) {
          // Wallet unavailable in this browser or seller configuration.
        }

        try {
          await mountWalletButton({
            walletName: 'Apple Pay',
            create: () => payments.applePay(paymentRequest),
            attachOptions: undefined,
            ref: applePayRef,
            setAvailable: setApplePayAvailable,
          });
        } catch (_) {
          // Wallet unavailable in this browser or seller configuration.
        }
      } catch (err) {
        if (!signal.aborted) setError(err?.message || 'Express pay unavailable');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    init();
    return () => {
      controller.abort();
      destroy();
    };
  }, [enabled, amountCents, containerId, onToken, destroy]);

  return { googlePayAvailable, applePayAvailable, loading, error };
}
