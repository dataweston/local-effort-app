import React, { useMemo, useState } from 'react';
import clsx from 'clsx';

import { Button } from '../../components/ui/button';
import { GROUPED_MENU, MENU_ITEMS, formatCurrency } from './menu';
import { TIP_OPTIONS, base64UrlEncode, isValidEmail } from './utils';
import { useSquareCard } from '../../hooks/useSquareCard';

const inputClassName =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-orange-200';
const PaikkaCheckout = () => {
  const [quantities, setQuantities] = useState(() => Object.fromEntries(MENU_ITEMS.map((item) => [item.sku, 0])));
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [tipSelection, setTipSelection] = useState('15');
  const [customTip, setCustomTip] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const presaleClosed = true;
  const presaleClosedCopy = 'pre-sale has ended, see you at Paikka!';

  const validDiscountCode = import.meta.env.VITE_PAIKKA_DISCOUNT_CODE || '';
  const discountPriceCents = Number(import.meta.env.VITE_PAIKKA_DISCOUNT_PRICE_CENTS) || 0;

  const isDiscountApplied = useMemo(
    () => appliedDiscountCode.trim().toLowerCase() === validDiscountCode.toLowerCase(),
    [appliedDiscountCode, validDiscountCode]
  );

  const handleApplyDiscount = () => {
    setAppliedDiscountCode(discountCode);
  };

  const handleRemoveDiscount = () => {
    setDiscountCode('');
    setAppliedDiscountCode('');
  };

  const subtotalCents = useMemo(() => {
    return MENU_ITEMS.reduce((sum, item) => {
      const quantity = quantities[item.sku] ?? 0;
      const pricePerItem = isDiscountApplied && discountPriceCents > 0
        ? discountPriceCents
        : item.presalePriceCents;
      return sum + quantity * pricePerItem;
    }, 0);
  }, [quantities, isDiscountApplied, discountPriceCents]);

  const tipCents = useMemo(() => {
    if (tipSelection === 'custom') {
      const parsed = Number.parseFloat(customTip.replace(/[^0-9.]/g, ''));
      return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
    }
    const percentage = Number.parseInt(tipSelection, 10);
    return Math.round(subtotalCents * (percentage / 100));
  }, [tipSelection, customTip, subtotalCents]);

  const totalCents = subtotalCents + tipCents;
  const hasItems = subtotalCents > 0;
  const emailValid = isValidEmail(email);
  const firstNameValid = firstName.trim().length > 0;

  const summaryItems = useMemo(
    () =>
      MENU_ITEMS.filter((item) => (quantities[item.sku] ?? 0) > 0).map((item) => ({
        item,
        qty: quantities[item.sku] ?? 0,
      })),
    [quantities]
  );

  const { cardLoaded, error: cardError, loadingScript, tokenize } = useSquareCard('#paikka-card-container', true, []);
  const handleQuantityChange = (sku, delta) => {
    setQuantities((prev) => {
      const current = prev[sku] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === current) return prev;
      return { ...prev, [sku]: next };
    });
  };

  const handleAddToCart = (sku) => {
    if (presaleClosed) {
      setError(presaleClosedCopy);
      return;
    }
    setError(null);
    handleQuantityChange(sku, 1);
  };

  const buildCheckoutPayload = () => ({
    items: summaryItems.map(({ item, qty }) => ({ sku: item.sku, qty })),
    customer: {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim(),
    },
    tipCents,
    discountCode: isDiscountApplied ? validDiscountCode : undefined,
  });

  const buildEncodedState = () =>
    base64UrlEncode({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      items: summaryItems.map(({ item, qty }) => ({ sku: item.sku, qty })),
      tipCents,
      discountCode: isDiscountApplied ? validDiscountCode : undefined,
      discountPriceCents: isDiscountApplied ? discountPriceCents : undefined,
    });

  const handleCheckout = async () => {
    if (presaleClosed) {
      setError(presaleClosedCopy);
      return;
    }
    if (!hasItems) {
      setError('Add at least one sandwich to your cart.');
      return;
    }
    if (!firstNameValid) {
      setError('Enter your first name so we can hold your order.');
      return;
    }
    if (!emailValid) {
      setError('Enter a valid email so we can send your QR code.');
      return;
    }
    if (!cardLoaded) {
      setError('Secure card entry is still loading. Please try again in a moment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let token;
      try {
        token = await tokenize();
      } catch (tokenErr) {
        throw new Error(tokenErr?.message || 'Unable to verify your card details.');
      }

      const response = await fetch('/api/paikka/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildCheckoutPayload(), token }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Checkout failed. Please try again.');
      }

      const paymentReference =
        data?.paymentId ||
        data?.payment_id ||
        data?.transactionId ||
        data?.transaction_id ||
        data?.id;

      if (!paymentReference) {
        throw new Error('Missing payment reference from Square.');
      }

      const params = new URLSearchParams();
      params.set('state', buildEncodedState());
      params.set('paymentId', paymentReference);
      window.location.href = `/paikka/success?${params.toString()}`;
    } catch (err) {
      console.error('Paikka checkout failed', err);
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const canSubmit = !presaleClosed && hasItems && emailValid && firstNameValid && cardLoaded && !isSubmitting;
  const showCustomTipInput = tipSelection === 'custom';

  return (
    <section className="mx-auto max-w-5xl space-y-10">
      {presaleClosed && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-center text-sm font-semibold uppercase tracking-wide text-red-700">
          {presaleClosedCopy}
        </p>
      )}
      <header className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Local Effort x Paikka</p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Paikka Sandwich Presale</h1>
        <p className="mx-auto max-w-2xl text-base text-neutral-600">Skip the line at Paikka. Reserve your sandwiches now and check in with the QR code we will email you.</p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="space-y-2 text-left text-sm text-neutral-600">
          <p>served on sourdough focaccia</p>
          <p>red fife and rye milled at bakers field, 100% hydration</p>
          <p>chickens from wild acres, squash from wisconsin growers</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {GROUPED_MENU.map((group) => {
            const hasDairyFree = group.variants.some((variant) => variant.isDairyFree);
            return (
              <div key={group.baseSku} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-neutral-900">{group.title}</h2>
                    <p className="text-sm text-neutral-600">{group.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                      <span className="font-medium text-neutral-900">{formatCurrency(group.presalePriceCents)}</span>
                      <span className="opacity-80">Presale</span>
                      <span aria-hidden="true">·</span>
                      <span className="line-through">{formatCurrency(group.regularPriceCents)}</span>
                      <span className="opacity-80">Door price</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {group.variants.map((variant) => (
                      <Button
                        key={variant.sku}
                        type="button"
                        onClick={() => handleAddToCart(variant.sku)}
                        disabled={presaleClosed}
                        variant={variant.isDairyFree ? 'outline' : 'default'}
                        className="flex-1 min-w-[10rem] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {variant.isDairyFree ? 'Add dairy-free' : 'Add to cart'}
                      </Button>
                    ))}
                  </div>

                  {hasDairyFree && (
                    <p className="text-xs text-neutral-500">Dairy-free sandwiches are prepared without cheese.</p>
                  )}
                </div>
              </div>
            );
          })}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl shadow-md">
              <img
                src="https://res.cloudinary.com/dokyhfvyd/image/upload/f_auto,q_auto/v1762044009/afjewnuvii0tgx7wolni.heic"
                alt="Paikka sandwich preparation"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="overflow-hidden rounded-2xl shadow-md sm:mt-6">
              <img
                src="https://res.cloudinary.com/dokyhfvyd/image/upload/f_auto,q_auto/v1762044001/fhq1oemkmct8wf73ji6l.heic"
                alt="Paikka sandwich ingredients"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:self-start lg:sticky lg:top-6">
          <h3 className="text-lg font-semibold text-neutral-900">Fast Square checkout</h3>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleCheckout();
            }}
          >
            <fieldset disabled={presaleClosed} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                First name
                <input
                  className={inputClassName}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Alex"
                  required
                  disabled={presaleClosed}
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                Last name (optional)
                <input
                  className={inputClassName}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Patel"
                  disabled={presaleClosed}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium text-neutral-700">
              Email
              <input
                className={inputClassName}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={presaleClosed}
              />
            </label>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700">
                Discount Code (optional)
              </label>
              <div className="flex gap-2">
                <input
                  className={inputClassName}
                  type="text"
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value)}
                  placeholder="Enter discount code"
                  disabled={isDiscountApplied || presaleClosed}
                />
                {!isDiscountApplied ? (
                  <Button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={presaleClosed || !discountCode.trim()}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    Apply
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleRemoveDiscount}
                    disabled={presaleClosed}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    Remove
                  </Button>
                )}
              </div>
              {isDiscountApplied && hasItems && (
                <p className="text-xs text-green-600">Discount applied! Each sandwich is $10.</p>
              )}
              {appliedDiscountCode && !isDiscountApplied && (
                <p className="text-xs text-red-600">Invalid discount code</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Add gratuity (optional)</p>
              <div className="flex flex-wrap gap-3">
                {TIP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTipSelection(option.value)}
                    disabled={presaleClosed}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      tipSelection === option.value
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:text-neutral-800',
                      presaleClosed && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {showCustomTipInput && (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-neutral-600" htmlFor="custom-tip">
                    Custom tip
                  </label>
                  <input
                    id="custom-tip"
                    type="text"
                    inputMode="decimal"
                    value={customTip}
                    onChange={(event) => setCustomTip(event.target.value)}
                    className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="$5.00"
                    disabled={presaleClosed}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-700">Your order</p>
                {hasItems && <span className="text-xs text-neutral-500">Tap +/- to adjust quantities</span>}
              </div>
              {summaryItems.length === 0 ? (
                <p className="text-sm text-neutral-500">Add sandwiches to your cart to continue.</p>
              ) : (
                <ul className="space-y-3">
                  {summaryItems.map(({ item, qty }) => {
                    const pricePerItem = isDiscountApplied && discountPriceCents > 0 ? discountPriceCents : item.presalePriceCents;
                    return (
                      <li key={item.sku} className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-neutral-900">{item.summaryTitle || item.title}</p>
                          <p className="text-xs text-neutral-500">
                            {item.isDairyFree ? 'Dairy-free · prepared without cheese' : 'Contains dairy'}
                            {isDiscountApplied && (
                              <span className="text-green-600"> · ${(pricePerItem / 100).toFixed(2)} each</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.sku, -1)}
                          className="h-8 w-8 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Remove one ${item.summaryTitle || item.title}`}
                          disabled={presaleClosed}
                        >
                          -
                        </button>
                        <span className="min-w-[2rem] text-center text-base font-semibold text-neutral-900">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.sku, 1)}
                          className="h-8 w-8 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Add one ${item.summaryTitle || item.title}`}
                          disabled={presaleClosed}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Payment details</p>
              <div className="rounded-lg border border-dashed border-neutral-300 p-3">
                <div id="paikka-card-container" className="min-h-[56px]"></div>
              </div>
              {loadingScript && (
                <p className="text-xs text-neutral-500">Loading secure Square card entry…</p>
              )}
              {cardError && <p className="text-xs text-red-600">{cardError}</p>}
            </div>

            <div className="space-y-1 text-sm text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gratuity</span>
                <span>{formatCurrency(tipCents)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-neutral-900">
                <span>Total due</span>
                <span>{formatCurrency(totalCents)}</span>
              </div>
            </div>
            </fieldset>
            {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={!canSubmit}>{isSubmitting ? 'Processing payment…' : `Pay ${formatCurrency(totalCents)}`}</Button>
            <p className="text-xs text-neutral-500">Your receipt and QR code will arrive by email within a few minutes after payment.</p>
          </form>
        </aside>
      </div>
    </section>
  );
};

export default PaikkaCheckout;
