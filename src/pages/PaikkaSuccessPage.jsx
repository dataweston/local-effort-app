import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';

import ResendEmailButton from '../features/paikka/ResendEmailButton';
import { MENU_LOOKUP, formatCurrency } from '../features/paikka/menu';
import { computeTotals, decodeCheckoutState, resolvePaymentReference } from '../features/paikka/utils';

const PaikkaSuccessPage = () => {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const stateParam = searchParams.get('state') || undefined;
  const paymentReference = resolvePaymentReference(searchParams);

  const { decodedState, decodeError } = useMemo(() => {
    if (!stateParam) {
      return { decodedState: null, decodeError: 'Missing checkout state.' };
    }
    try {
      const state = decodeCheckoutState(stateParam);
      if (!state.items.length) {
        return { decodedState: null, decodeError: 'No items found in checkout.' };
      }
      return { decodedState: state, decodeError: null };
    } catch (err) {
      return { decodedState: null, decodeError: err instanceof Error ? err.message : 'Invalid checkout state.' };
    }
  }, [stateParam]);

  const referenceError = paymentReference ? null : 'Missing payment reference from Square.';

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    if (decodeError || referenceError) {
      setError(decodeError || referenceError);
      setStatus('error');
    } else {
      setError(null);
    }
  }, [decodeError, referenceError]);

  useEffect(() => {
    if (!decodedState || decodeError || referenceError) {
      return;
    }

    let cancelled = false;
    const finalize = async () => {
      setStatus('loading');
      try {
        const response = await fetch('/api/paikka/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: stateParam, paymentReference }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to finalize order.');
        }
        if (!cancelled) {
          setOrderResult(data);
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to finalize order.');
          setStatus('error');
        }
      }
    };

    finalize();
    return () => {
      cancelled = true;
    };
  }, [decodedState, decodeError, referenceError, paymentReference, stateParam]);

  const totals = useMemo(() => computeTotals(decodedState, MENU_LOOKUP), [decodedState]);

  const canonical = 'https://localeffortfood.com/paikka/success';
  const pageTitle = 'Paikka Check-In Success | Local Effort';
  const pageDescription = 'Confirmation and pickup instructions for the Paikka sandwich presale.';

  return (
    <div className="bg-neutral-50 pb-16 pt-10">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl space-y-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
          {status === 'success' && orderResult ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-neutral-900">You are all set.</h1>
                <p className="text-neutral-600">
                  We emailed your QR code to <span className="font-medium">{orderResult.order.email}</span>. Show the QR or the
                  backup code at pickup to skip the line.
                </p>
              </div>

              <div className="space-y-4 rounded-xl bg-neutral-50 p-5">
                <div className="flex flex-col gap-1 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-neutral-900">Order ID</span>
                  <span>{orderResult.order.oid}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-neutral-900">Backup code</span>
                  <span className="font-mono text-base text-neutral-900">{orderResult.order.jti}</span>
                </div>
                <div className="space-y-2 text-sm text-neutral-600">
                  <p className="font-medium text-neutral-900">Items</p>
                  <ul className="space-y-1">
                    {decodedState?.items.map((item) => {
                      const menu = MENU_LOOKUP.get(item.sku);
                      if (!menu) return null;
                      return (
                        <li key={item.sku} className="flex justify-between">
                          <span>
                            {menu.title} x {item.qty}
                          </span>
                          <span>{formatCurrency(menu.presalePriceCents * item.qty)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>Gratuity</span>
                  <span>{formatCurrency(totals.tip)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-neutral-900">
                  <span>Total paid</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>

              <ResendEmailButton order={orderResult.order} jwt={orderResult.jwt} />

              <div className="flex flex-col gap-2 text-sm text-neutral-600">
                <span>
                  Need help? Email <a className="text-orange-700" href="mailto:hello@localoffice.co">hello@localoffice.co</a>.
                </span>
                <Link to="/paikka" className="text-orange-700 hover:underline">
                  Back to presale
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-neutral-900">We could not confirm your order.</h1>
              <p className="text-neutral-600">{error || 'Something went wrong while finalizing your order.'}</p>
              {status === 'loading' && (
                <p className="text-sm text-neutral-500">Finalizing checkout...</p>
              )}
              <p className="text-sm text-neutral-600">
                Reach out to <a className="text-orange-700" href="mailto:hello@localoffice.co">hello@localoffice.co</a> with your
                payment receipt and we will help.
              </p>
              <Link to="/paikka" className="text-orange-700 hover:underline">
                Return to presale
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaikkaSuccessPage;
