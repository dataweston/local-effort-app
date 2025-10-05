import React, { useMemo, useState } from 'react';
import clsx from 'clsx';

import { Button } from '../../components/ui/button';
import { MENU_ITEMS, formatCurrency } from './menu';
import { TIP_OPTIONS, isValidEmail } from './utils';

const inputClassName = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-orange-200';

const PaikkaCheckout = () => {
  const [quantities, setQuantities] = useState(() => Object.fromEntries(MENU_ITEMS.map((item) => [item.sku, 0])));
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [tipSelection, setTipSelection] = useState('15');
  const [customTip, setCustomTip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const subtotalCents = useMemo(
    () => MENU_ITEMS.reduce((sum, item) => sum + (quantities[item.sku] ?? 0) * item.presalePriceCents, 0),
    [quantities]
  );

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
  const canSubmit = hasItems && emailValid && firstNameValid && !isSubmitting;

  const summaryItems = MENU_ITEMS.filter((item) => (quantities[item.sku] ?? 0) > 0).map((item) => ({
    item,
    qty: quantities[item.sku] ?? 0,
  }));

  const handleQuantityChange = (sku, delta) => {
    setQuantities((prev) => {
      const current = prev[sku] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === current) return prev;
      return { ...prev, [sku]: next };
    });
  };

  const buildPayload = () => ({
    items: summaryItems.map(({ item, qty }) => ({ sku: item.sku, qty })),
    customer: {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim(),
    },
    tipCents,
  });

  const handleCheckout = async () => {
    if (!canSubmit) {
      setError('Add at least one sandwich and enter your contact info.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/paikka/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Checkout failed. Please try again.');
      }
      if (!data?.checkoutUrl) {
        throw new Error('Missing checkout URL in response.');
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('Paikka checkout failed', err);
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-10">
      <header className="space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Local Effort x Paikka</p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Paikka Sandwich Presale</h1>
        <p className="mx-auto max-w-2xl text-base text-neutral-600">
          Skip the line at Paikka. Reserve your sandwiches now and check in with the QR code we will email you.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {MENU_ITEMS.map((item) => {
            const qty = quantities[item.sku] ?? 0;
            return (
              <div key={item.sku} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-neutral-900">{item.title}</h2>
                    <p className="text-sm text-neutral-600">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                      <span className="font-medium text-neutral-900">{formatCurrency(item.presalePriceCents)}</span>
                      <span className="opacity-80">Presale</span>
                      <span aria-hidden="true">·</span>
                      <span className="line-through">{formatCurrency(item.regularPriceCents)}</span>
                      <span className="opacity-80">Door price</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-stretch sm:flex-col sm:items-end sm:justify-between">
                    <div className="flex items-center rounded-full border border-neutral-300 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.sku, -1)}
                        className="px-3 py-2 text-lg font-semibold text-neutral-700 hover:text-neutral-900"
                        aria-label={`Remove one ${item.title}`}
                      >
                        -
                      </button>
                      <span className="min-w-[2rem] text-center text-base font-semibold text-neutral-900">{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item.sku, 1)}
                        className="px-3 py-2 text-lg font-semibold text-neutral-700 hover:text-neutral-900"
                        aria-label={`Add one ${item.title}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm text-neutral-500">Add to order</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900">Fast Square checkout</h3>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleCheckout();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                First name
                <input
                  className={inputClassName}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Alex"
                  required
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-neutral-700">
                Last name (optional)
                <input
                  className={inputClassName}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Patel"
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
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Add gratuity (optional)</p>
              <div className="flex flex-wrap gap-3">
                {TIP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTipSelection(option.value)}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm font-medium transition',
                      tipSelection === option.value
                        ? 'border-accent bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-orange-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {tipSelection === 'custom' && (
                <input
                  className={inputClassName}
                  inputMode="decimal"
                  placeholder="Tip amount in dollars"
                  value={customTip}
                  onChange={(event) => setCustomTip(event.target.value)}
                />
              )}
            </div>

            <div className="space-y-3 rounded-xl bg-neutral-50 p-4">
              <h4 className="text-sm font-semibold text-neutral-700">Order summary</h4>
              {summaryItems.length === 0 ? (
                <p className="text-sm text-neutral-500">Add a sandwich to see your total.</p>
              ) : (
                <ul className="space-y-2 text-sm text-neutral-600">
                  {summaryItems.map(({ item, qty }) => (
                    <li key={item.sku} className="flex justify-between">
                      <span>
                        {item.title} x {qty}
                      </span>
                      <span>{formatCurrency(item.presalePriceCents * qty)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Gratuity</span>
                <span>{formatCurrency(tipCents)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-neutral-900">
                <span>Total due</span>
                <span>{formatCurrency(totalCents)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {isSubmitting ? 'Redirecting...' : 'Pay with Square'}
            </Button>
            {!hasItems && <p className="text-xs text-neutral-500">Select at least one sandwich to enable checkout.</p>}
            {!emailValid && email.length > 0 && (
              <p className="text-xs text-rose-600">Enter a valid email address to receive your QR code.</p>
            )}
          </form>
          <p className="text-xs text-neutral-500">
            After payment we will email your QR code and backup code. Bring either to the Paikka pickup window during the
            presale pickup time.
          </p>
        </aside>
      </div>
    </section>
  );
};

export default PaikkaCheckout;
