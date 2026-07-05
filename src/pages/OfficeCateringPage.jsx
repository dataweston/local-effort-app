import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { Button } from '../components/ui/button';
import { SITE_URL, CONTACT_EMAIL } from '../config/siteMetadata';
import {
  OFFICE_POLICIES,
  OFFICE_MENU_ITEMS,
  OFFICE_MENU_LOOKUP,
  OFFICE_MENU_SECTIONS,
  formatOfficeCurrency,
  perPersonLabel,
  computeOfficeOrderTotals,
  earliestOfficeDeliveryDate,
  suggestedSpreadForHeadcount,
  buildOfficeMenuPlainText,
} from '../features/paikka/officeMenu';

const CANONICAL = `${SITE_URL}/office-catering`;
const SEO_TITLE = 'Office Catering Minneapolis - Sandwich Trays, Salads & Baked Goods | Local Effort Cooperative';
const SEO_DESCRIPTION =
  'Order office catering in Minneapolis-St. Paul from Local Effort Cooperative: sandwich trays, big-bowl salads, and baked goods by the dozen. $150 minimum, 48-hour lead time, $40 delivery (free at $750+). Invoice-friendly for corporate teams.';

const LAST_ORDER_KEY = 'le:officeCatering:lastOrder';

const inputClassName =
  'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-orange-200';

const isValidEmail = (value = '') => /.+@.+\..+/.test(String(value).trim());

const feedsLabel = (item) => {
  if (!item.feedsMin || !item.feedsMax) return '—';
  return item.feedsMin === item.feedsMax ? `${item.feedsMax}` : `${item.feedsMin}–${item.feedsMax}`;
};

const dietUrl = {
  vegetarian: 'https://schema.org/VegetarianDiet',
  vegan: 'https://schema.org/VeganDiet',
  'gluten-free': 'https://schema.org/GlutenFreeDiet',
  'dairy-free': 'https://schema.org/LowLactoseDiet',
};

// schema.org JSON-LD: FoodEstablishment + Menu with MenuSection/MenuItem/Offer.
// Built once from officeMenu.js so structured data can never drift from the page.
const buildJsonLd = () => {
  const policyText = `${formatOfficeCurrency(OFFICE_POLICIES.orderMinimumCents)} order minimum. Order at least ${OFFICE_POLICIES.leadTimeHours} hours ahead. ${formatOfficeCurrency(OFFICE_POLICIES.deliveryFeeCents)} delivery fee, free delivery on orders of ${formatOfficeCurrency(OFFICE_POLICIES.freeDeliveryThresholdCents)} or more. Delivery across the ${OFFICE_POLICIES.deliveryArea}.`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FoodEstablishment',
        '@id': `${CANONICAL}#business`,
        name: 'Local Effort Cooperative',
        url: SITE_URL,
        email: CONTACT_EMAIL,
        servesCuisine: 'Seasonal Midwestern',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Minneapolis',
          addressRegion: 'MN',
          addressCountry: 'US',
        },
        areaServed: OFFICE_POLICIES.deliveryArea,
        hasMenu: { '@id': `${CANONICAL}#menu` },
      },
      {
        '@type': 'Menu',
        '@id': `${CANONICAL}#menu`,
        name: 'Office Catering Menu',
        url: CANONICAL,
        description: policyText,
        inLanguage: 'en-US',
        hasMenuSection: OFFICE_MENU_SECTIONS.map((section) => ({
          '@type': 'MenuSection',
          name: section.title,
          description: section.note,
          hasMenuItem: section.items.map((item) => ({
            '@type': 'MenuItem',
            name: item.title,
            description: `${item.description} (${item.unitLabel}${item.feedsMax ? `, feeds ${feedsLabel(item)}` : ''})`,
            ...(item.dietary.length
              ? { suitableForDiet: item.dietary.map((d) => dietUrl[d]).filter(Boolean) }
              : {}),
            offers: {
              '@type': 'Offer',
              sku: item.sku,
              price: (item.priceCents / 100).toFixed(2),
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              seller: { '@id': `${CANONICAL}#business` },
            },
          })),
        })),
      },
      {
        '@type': 'WebPage',
        '@id': CANONICAL,
        url: CANONICAL,
        name: SEO_TITLE,
        description: SEO_DESCRIPTION,
        about: { '@id': `${CANONICAL}#business` },
      },
    ],
  };
};

const OfficeCateringPage = () => {
  const [quantities, setQuantities] = useState({});
  const [headcount, setHeadcount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryWindow, setDeliveryWindow] = useState(OFFICE_POLICIES.deliveryWindows[1]);
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasSavedOrder, setHasSavedOrder] = useState(false);

  // Recompute at render; cheap and keeps the 48-hour rule current.
  const earliestDate = earliestOfficeDeliveryDate();

  const totals = useMemo(() => computeOfficeOrderTotals(quantities), [quantities]);
  const headcountNum = Math.max(0, Math.floor(Number(headcount) || 0));
  const perPersonCents = headcountNum > 0 && totals.totalCents > 0 ? Math.round(totals.totalCents / headcountNum) : null;

  const orderedItems = useMemo(
    () =>
      OFFICE_MENU_ITEMS.filter((item) => (Number(quantities[item.sku]) || 0) > 0).map((item) => ({
        item,
        qty: Number(quantities[item.sku]) || 0,
      })),
    [quantities]
  );

  const jsonLd = useMemo(() => buildJsonLd(), []);
  const plainTextMenu = useMemo(() => buildOfficeMenuPlainText(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setHasSavedOrder(Boolean(window.localStorage.getItem(LAST_ORDER_KEY)));
    } catch (_) {
      /* private mode etc. */
    }
  }, []);

  const setQty = (sku, next) => {
    setQuantities((prev) => {
      const value = Math.max(0, Math.min(99, Math.floor(Number(next) || 0)));
      if ((prev[sku] || 0) === value) return prev;
      return { ...prev, [sku]: value };
    });
  };
  const bumpQty = (sku, delta) => setQty(sku, (quantities[sku] || 0) + delta);

  const applySuggestedSpread = () => {
    const count = headcountNum || 10;
    if (!headcountNum) setHeadcount('10');
    setQuantities(suggestedSpreadForHeadcount(count));
    setError(null);
  };

  const loadLastOrder = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LAST_ORDER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const sanitized = {};
      Object.entries(saved.quantities || {}).forEach(([sku, qty]) => {
        if (OFFICE_MENU_LOOKUP.has(sku) && Number(qty) > 0) sanitized[sku] = Math.floor(Number(qty));
      });
      setQuantities(sanitized);
      if (saved.headcount) setHeadcount(String(saved.headcount));
      if (saved.company) setCompany(saved.company);
      if (saved.contactName) setContactName(saved.contactName);
      if (saved.email) setEmail(saved.email);
      if (saved.phone) setPhone(saved.phone);
      if (saved.address) setAddress(saved.address);
      setError(null);
    } catch (_) {
      /* corrupted saved order — ignore */
    }
  };

  const saveLastOrder = () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        LAST_ORDER_KEY,
        JSON.stringify({ quantities, headcount: headcountNum, company, contactName, email, phone, address })
      );
    } catch (_) {
      /* best effort */
    }
  };

  const buildOrderMessage = () => {
    const lines = [];
    lines.push('OFFICE CATERING ORDER REQUEST');
    lines.push('');
    lines.push(`Company: ${company.trim()}`);
    lines.push(`Contact: ${contactName.trim()}`);
    lines.push(`Email: ${email.trim()}`);
    lines.push(`Phone: ${phone.trim()}`);
    lines.push(`Delivery address: ${address.trim()}`);
    lines.push(`Headcount: ${headcountNum || '(not given)'}`);
    lines.push(`Delivery date: ${deliveryDate}`);
    lines.push(`Delivery window: ${deliveryWindow}`);
    lines.push('');
    lines.push('ITEMS');
    orderedItems.forEach(({ item, qty }) => {
      lines.push(`- ${item.title} [${item.sku}] x${qty} @ ${formatOfficeCurrency(item.priceCents)} = ${formatOfficeCurrency(item.priceCents * qty)}`);
    });
    lines.push('');
    lines.push(`Subtotal: ${formatOfficeCurrency(totals.subtotalCents)}`);
    lines.push(
      totals.freeDelivery
        ? 'Delivery: FREE (order over $750)'
        : `Delivery: ${formatOfficeCurrency(totals.deliveryFeeCents)}`
    );
    lines.push(`Total: ${formatOfficeCurrency(totals.totalCents)}`);
    if (perPersonCents) lines.push(`Per person (${headcountNum}): ${formatOfficeCurrency(perPersonCents)}`);
    if (notes.trim()) {
      lines.push('');
      lines.push(`Notes / dietary flags: ${notes.trim()}`);
    }
    return lines.join('\n');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (orderedItems.length === 0) {
      setError('Add at least one item to your order.');
      return;
    }
    if (!totals.minimumMet) {
      setError(`Orders start at ${formatOfficeCurrency(OFFICE_POLICIES.orderMinimumCents)} — you are ${formatOfficeCurrency(totals.remainingToMinimumCents)} away.`);
      return;
    }
    if (!deliveryDate || deliveryDate < earliestDate) {
      setError(`We need ${OFFICE_POLICIES.leadTimeHours} hours of lead time — the earliest delivery date is ${earliestDate}.`);
      return;
    }
    if (!company.trim()) {
      setError('Enter your company name.');
      return;
    }
    if (!contactName.trim()) {
      setError('Enter a contact name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email so we can confirm your order.');
      return;
    }
    if (!phone.trim()) {
      setError('Enter a phone number for the delivery driver.');
      return;
    }
    if (!address.trim()) {
      setError('Enter the delivery address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'office-catering',
          name: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject: `Office catering order — ${company.trim()} — ${deliveryDate}`,
          message: buildOrderMessage(),
          sendCopy: true,
          website: honeypot, // honeypot — left empty by humans (and polite robots)
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error === 'rate-limit-exceeded' ? 'Too many submissions — please try again in a few minutes.' : data?.error || 'Something went wrong. Please try again.');
      }
      saveLastOrder();
      setHasSavedOrder(true);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minimumProgress = Math.min(100, Math.round((totals.subtotalCents / OFFICE_POLICIES.orderMinimumCents) * 100));
  const freeDeliveryProgress = Math.min(100, Math.round((totals.subtotalCents / OFFICE_POLICIES.freeDeliveryThresholdCents) * 100));

  return (
    <div className="px-4 py-10">
      <Helmet>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta
          name="keywords"
          content="office catering Minneapolis, corporate lunch catering Twin Cities, sandwich trays Minneapolis, office lunch delivery St. Paul, catering for meetings Minneapolis"
        />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={CANONICAL} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large" />
        <link rel="canonical" href={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <article className="mx-auto max-w-6xl space-y-10">
        {/* ------------------------------------------------------------------
            Above the fold: what this is + the three ordering facts.
            Kept as semantic, always-rendered HTML for search engines and
            AI assistants ordering on an office's behalf.
        ------------------------------------------------------------------ */}
        <header className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">Local Effort Cooperative</p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">Office Catering — Minneapolis &amp; St. Paul</h1>
          <p className="mx-auto max-w-2xl text-base text-neutral-600">
            Lunch for the whole office from a Minneapolis workers cooperative: sandwich trays on our sourdough
            focaccia, big-bowl salads that feed 8–10, and baked goods by the dozen — built from Minnesota-grown
            ingredients, labeled, and dropped off ready to serve.
          </p>
          <dl className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Ordering policies">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Order minimum</dt>
              <dd className="text-lg font-semibold text-neutral-900">{formatOfficeCurrency(OFFICE_POLICIES.orderMinimumCents)}</dd>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Lead time</dt>
              <dd className="text-lg font-semibold text-neutral-900">{OFFICE_POLICIES.leadTimeHours} hours</dd>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Delivery</dt>
              <dd className="text-lg font-semibold text-neutral-900">
                {formatOfficeCurrency(OFFICE_POLICIES.deliveryFeeCents)}
                <span className="block text-xs font-normal text-neutral-500">
                  free at {formatOfficeCurrency(OFFICE_POLICIES.freeDeliveryThresholdCents)}+
                </span>
              </dd>
            </div>
          </dl>
          <p className="mx-auto max-w-2xl text-sm text-neutral-500">
            Delivery across the {OFFICE_POLICIES.deliveryArea}. {OFFICE_POLICIES.paymentNote}
          </p>
        </header>

        {/* Headcount-first quick start */}
        <section
          aria-labelledby="quick-start-title"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h2 id="quick-start-title" className="text-lg font-semibold text-neutral-900">How many are you feeding?</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm font-medium text-neutral-700">
              Headcount
              <input
                className={`${inputClassName} w-28`}
                type="number"
                inputMode="numeric"
                min="1"
                max="500"
                value={headcount}
                onChange={(event) => setHeadcount(event.target.value)}
                placeholder="12"
              />
            </label>
            <Button type="button" variant="outline" onClick={applySuggestedSpread}>
              Build a spread for {headcountNum || 10}
            </Button>
            {hasSavedOrder && (
              <Button type="button" variant="outline" onClick={loadLastOrder}>
                Reorder my last spread
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            One sandwich per person, a big salad per ~10 people, cookies for the table. Adjust anything below.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          {/* ----------------------------- Menu ----------------------------- */}
          <div className="space-y-8">
            {OFFICE_MENU_SECTIONS.map((section) => (
              <section key={section.id} aria-labelledby={`section-${section.id}`} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 id={`section-${section.id}`} className="text-xl font-semibold text-neutral-900">{section.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">{section.note}</p>
                <table className="mt-4 w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                      <th scope="col" className="py-2 pr-3">Item</th>
                      <th scope="col" className="py-2 pr-3 text-center">Feeds</th>
                      <th scope="col" className="py-2 pr-3 text-right">Price</th>
                      <th scope="col" className="py-2 text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => {
                      const qty = Number(quantities[item.sku]) || 0;
                      const perPerson = perPersonLabel(item);
                      return (
                        <tr key={item.sku} data-sku={item.sku} data-price-cents={item.priceCents} className="border-b border-neutral-100 align-top">
                          <td className="py-3 pr-3">
                            <p className="font-medium text-neutral-900">{item.title}</p>
                            <p className="mt-1 text-neutral-600">{item.description}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {item.unitLabel}
                              {perPerson ? ` · ${perPerson}` : ''}
                              {item.dietary.length ? ` · ${item.dietary.join(', ')}` : ''}
                            </p>
                          </td>
                          <td className="py-3 pr-3 text-center text-neutral-700">{feedsLabel(item)}</td>
                          <td className="py-3 pr-3 text-right font-medium text-neutral-900">{formatOfficeCurrency(item.priceCents)}</td>
                          <td className="py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => bumpQty(item.sku, -1)}
                                className="h-8 w-8 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
                                aria-label={`Remove one ${item.title}`}
                              >
                                -
                              </button>
                              <span className="min-w-[2rem] text-center text-base font-semibold text-neutral-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => bumpQty(item.sku, 1)}
                                className="h-8 w-8 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
                                aria-label={`Add one ${item.title}`}
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}
          </div>

          {/* ------------------------- Order summary ------------------------- */}
          <aside className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-lg font-semibold text-neutral-900">Your order</h2>

            {submitted ? (
              <div className="space-y-4">
                <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                  Order request sent. A copy is on its way to {email.trim()} — we will confirm details, delivery, and
                  payment (card or invoice) within one business day.
                </p>
                <pre className="whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-xs text-neutral-700">{buildOrderMessage()}</pre>
                <Button type="button" variant="outline" className="w-full" onClick={() => setSubmitted(false)}>
                  Edit or place another order
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                {orderedItems.length === 0 ? (
                  <p className="text-sm text-neutral-500">Add items from the menu, or use the headcount builder above.</p>
                ) : (
                  <ul className="space-y-2">
                    {orderedItems.map(({ item, qty }) => (
                      <li key={item.sku} className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-neutral-800">{item.title} × {qty}</span>
                        <span className="font-medium text-neutral-900">{formatOfficeCurrency(item.priceCents * qty)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Minimum + free-delivery progress, enforced here, not at checkout */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>{totals.minimumMet ? '✓ $150 minimum met' : `${formatOfficeCurrency(totals.remainingToMinimumCents)} to the $150 minimum`}</span>
                      <span>{formatOfficeCurrency(totals.subtotalCents)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100" role="presentation">
                      <div
                        className={`h-full rounded-full ${totals.minimumMet ? 'bg-green-500' : 'bg-orange-400'}`}
                        style={{ width: `${minimumProgress}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-neutral-600">
                      <span>
                        {totals.freeDelivery
                          ? '✓ Free delivery unlocked'
                          : `${formatOfficeCurrency(totals.remainingToFreeDeliveryCents)} to free delivery`}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100" role="presentation">
                      <div
                        className={`h-full rounded-full ${totals.freeDelivery ? 'bg-green-500' : 'bg-neutral-300'}`}
                        style={{ width: `${freeDeliveryProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-neutral-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatOfficeCurrency(totals.subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{totals.freeDelivery ? 'Free' : formatOfficeCurrency(totals.deliveryFeeCents)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-neutral-900">
                    <span>Total</span>
                    <span>{formatOfficeCurrency(totals.totalCents)}</span>
                  </div>
                  {perPersonCents && (
                    <div className="flex justify-between text-xs text-neutral-500">
                      <span>Per person ({headcountNum})</span>
                      <span>{formatOfficeCurrency(perPersonCents)}</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-3">
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Delivery date (earliest {earliestDate})
                    <input
                      className={inputClassName}
                      type="date"
                      min={earliestDate}
                      value={deliveryDate}
                      onChange={(event) => setDeliveryDate(event.target.value)}
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Delivery window
                    <select
                      className={inputClassName}
                      value={deliveryWindow}
                      onChange={(event) => setDeliveryWindow(event.target.value)}
                    >
                      {OFFICE_POLICIES.deliveryWindows.map((window) => (
                        <option key={window} value={window}>{window}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Company
                    <input className={inputClassName} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="North Loop Studio Co." required />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Contact name
                    <input className={inputClassName} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Alex Patel" required />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Email
                    <input className={inputClassName} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@company.com" required />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Phone
                    <input className={inputClassName} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="612-555-0134" required />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Delivery address
                    <input className={inputClassName} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Suite 400, 123 Washington Ave N, Minneapolis" required />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-neutral-700">
                    Notes, allergies, dietary flags (optional)
                    <textarea className={inputClassName} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="2 gluten-free, 1 vegan; leave trays at front desk" />
                  </label>
                  {/* Honeypot — hidden from real users; bots that fill it are silently dropped */}
                  <label className="hidden" aria-hidden="true">
                    Website
                    <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />
                  </label>
                </div>

                {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending order…' : 'Send order request'}
                </Button>
                <p className="text-xs text-neutral-500">
                  No payment is taken on this page. We confirm your order by email within one business day, then take a
                  corporate card or send an invoice (Net 15) — whichever your office prefers.
                </p>
              </form>
            )}
          </aside>
        </div>

        {/* ------------------------------------------------------------------
            Machine-readable fallback: the full menu and policies as plain
            text, always rendered (works without JS and in the prerendered
            HTML). Generated from the same data module as everything above.
        ------------------------------------------------------------------ */}
        <section aria-labelledby="plain-menu-title" className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <h2 id="plain-menu-title" className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Full menu &amp; policies (plain text)
          </h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-700">{plainTextMenu}</pre>
        </section>
      </article>
    </div>
  );
};

export default OfficeCateringPage;
