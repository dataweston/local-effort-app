/// <reference types="react" />

'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

import { Button } from '@local-office/ui';

import { MENU_ITEMS, formatCurrency } from './menu';

type TipOption = '0' | '10' | '15' | '20' | 'custom';

type CheckoutPayload = {
  items: Array<{ sku: (typeof MENU_ITEMS)[number]['sku']; qty: number }>;
  customer: {
    firstName: string;
    lastName?: string;
    email: string;
  };
  tipCents: number;
};

const tipOptions: Array<{ label: string; value: TipOption }> = [
  { label: '0%', value: '0' },
  { label: '10%', value: '10' },
  { label: '15%', value: '15' },
  { label: '20%', value: '20' },
  { label: 'Other', value: 'custom' }
];

const isValidEmail = (value: string) => /.+@.+/.test(value.trim());

const inputClassName =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

export default function PaikkaPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(MENU_ITEMS.map((item) => [item.sku, 0]))
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [tipSelection, setTipSelection] = useState<TipOption>('15');
  const [customTip, setCustomTip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotalCents = useMemo(
    () =>
      MENU_ITEMS.reduce((sum, item) => sum + (quantities[item.sku] ?? 0) * item.presalePriceCents, 0),
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
  const isEmailValid = isValidEmail(email);
  const isFirstNameValid = firstName.trim().length > 0;
  const canSubmit = hasItems && isEmailValid && isFirstNameValid && !isSubmitting;

  const summaryItems = MENU_ITEMS.filter((item) => (quantities[item.sku] ?? 0) > 0).map((item) => ({
    item,
    qty: quantities[item.sku] ?? 0
  }));

  const handleQuantityChange = (sku: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[sku] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === current) return prev;
      return { ...prev, [sku]: next };
    });
  };

  const buildPayload = (): CheckoutPayload => ({
    items: summaryItems.map(({ item, qty }) => ({ sku: item.sku, qty })),
    customer: {
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      email: email.trim()
    },
    tipCents
  });

  const handleCheckout = async () => {
    if (!canSubmit) {
      setError('Add at least one sandwich and enter your name and email.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/paikka/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload())
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details?.error ?? 'Checkout failed. Please try again.');
      }

      const data = (await response.json()) as { checkoutUrl: string };
      if (!data.checkoutUrl) {
        throw new Error('Checkout URL missing in response.');
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="space-y-6 text-slate-900">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Paikka Sandwich Pre-Order</h1>
          <p className="text-lg text-slate-600">
            Pre-orders are $2 cheaper and you skip the line.
          </p>
        </div>
        <p className="max-w-3xl text-base text-slate-600">
          Reserve your sandwiches ahead of time, then pick them up at Paikka&apos;s fast lane. You&apos;ll get a QR code
          and backup code via email right after checkout.
        </p>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {MENU_ITEMS.map((item) => {
            const qty = quantities[item.sku] ?? 0;
            return (
              <div
                key={item.sku}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
                    <div className="text-sm text-slate-500">
                      <span className="mr-2 line-through text-slate-400">{formatCurrency(item.regularPriceCents)}</span>
                      <span className="font-medium text-brand-700">{formatCurrency(item.presalePriceCents)} presale</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleQuantityChange(item.sku, -1)}
                    disabled={qty === 0}
                  >
                    -
                  </Button>
                  <span className="w-10 text-center text-lg font-semibold text-slate-900">{qty}</span>
                  <Button type="button" onClick={() => handleQuantityChange(item.sku, 1)}>
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Fast Square checkout</h3>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              handleCheckout();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                First name
                <input
                  className={inputClassName}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Alex"
                  required
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Last name (optional)
                <input
                  className={inputClassName}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Patel"
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
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
              <p className="text-sm font-medium text-slate-700">Add gratuity (optional)</p>
              <div className="flex flex-wrap gap-3">
                {tipOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTipSelection(option.value)}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm font-medium transition',
                      tipSelection === option.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'
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

            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-700">Order summary</h4>
              {summaryItems.length === 0 ? (
                <p className="text-sm text-slate-500">Add a sandwich to see your total.</p>
              ) : (
                <ul className="space-y-2 text-sm text-slate-600">
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
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Gratuity</span>
                <span>{formatCurrency(tipCents)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <span>Total due</span>
                <span>{formatCurrency(totalCents)}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={!canSubmit}>
              {isSubmitting ? 'Redirecting...' : 'Pay with Square'}
            </Button>
            {!hasItems && (
              <p className="text-xs text-slate-500">Select at least one sandwich to enable checkout.</p>
            )}
            {!isEmailValid && email.length > 0 && (
              <p className="text-xs text-red-600">Enter a valid email address to receive your QR code.</p>
            )}
          </form>
          <p className="text-xs text-slate-500">
            After payment you&apos;ll receive a Brevo email with your QR code and backup code. Bring that email (or the
            backup code) to the Paikka pickup station during the published window to skip the line.
          </p>
        </div>
      </section>
    </div>
  );
}
