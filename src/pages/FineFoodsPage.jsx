import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../config/siteMetadata';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';

const PRODUCT_GROUPS = [
  {
    id: 'chocolate',
    title: 'Chocolate',
    description: 'Hazelnut butter with chocolate and chocolate chip cookie dough.',
    className: 'from-amber-300 via-orange-300 to-rose-300',
  },
  {
    id: 'sugar',
    title: 'Sugar',
    description: 'Panela and coconut sugar.',
    className: 'from-lime-200 via-emerald-200 to-teal-200',
  },
  {
    id: 'olive-oil',
    title: 'Olive Oil',
    description: 'Psyche, Alt, and Another olive oil in 250ml, 750ml, and 3Liter.',
    className: 'from-sky-200 via-cyan-200 to-blue-200',
  },
  {
    id: 'hazelnuts',
    title: 'Hazelnuts',
    description: 'Hazelnuts halves and pieces, plus classic hazelnut butter.',
    className: 'from-fuchsia-200 via-pink-200 to-violet-200',
  },
];

const PRODUCTS = [
  'Hazelnuts, halves and pieces',
  'Hazelnut butter',
  'Hazelnut butter with chocolate',
  'Psyche olive oil',
  'Alt olive oil',
  'Another olive oil',
  'Panela',
  'Coconut sugar',
  'Hemp protein powder',
  'Black popcorn',
  'Chocolate chip cookie dough',
];

const OLIVE_OIL_PRODUCTS = ['Psyche olive oil', 'Alt olive oil', 'Another olive oil'];
const OLIVE_OIL_SIZES = ['250ml', '750ml', '3Liter'];

const PRODUCT_LINES = PRODUCTS.flatMap((product) => {
  if (OLIVE_OIL_PRODUCTS.includes(product)) {
    return OLIVE_OIL_SIZES.map((size) => `${product} - ${size}`);
  }
  return [product];
});

const INITIAL_QUANTITIES = PRODUCT_LINES.reduce((acc, line) => {
  acc[line] = '';
  return acc;
}, {});

const getProductFieldId = (product) =>
  `finefoods-${product.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

const FineFoodsPage = () => {
  const [form, setForm] = useState({
    buyerName: '',
    businessName: '',
    email: '',
    phone: '',
    requestedDate: '',
    notes: '',
    quantities: INITIAL_QUANTITIES,
  });
  const [submitted, setSubmitted] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);

  const selectedProducts = useMemo(
    () =>
      Object.values(form.quantities).filter((value) => {
        const amount = Number(value);
        return Number.isFinite(amount) && amount > 0;
      }).length,
    [form.quantities]
  );

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuantityChange = (product, value) => {
    const normalized = value === '' ? '' : String(Math.max(0, Number(value) || 0));
    setForm((prev) => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [product]: normalized,
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-8 md:py-12">
      <Helmet>
        <title>finefoods</title>
        <meta
          name="description"
          content="Westonsen Fine Foods sales request form for food distribution product orders."
        />
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta name="googlebot" content="noindex, nofollow, noarchive" />
        <link rel="canonical" href={`${SITE_URL}/finefoods`} />
      </Helmet>

      <div className="mx-auto w-full max-w-4xl px-6">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "'National Park', 'General Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Westonsen Fine Foods
        </h1>

        <section className="mt-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PRODUCT_GROUPS.map((group) => {
              const isActive = activeGroup === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroup((prev) => (prev === group.id ? null : group.id))}
                  className={`group relative aspect-square overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${group.className} p-5 text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <p className="text-lg font-semibold text-slate-900">{group.title}</p>
                    <div
                      className={`rounded-xl bg-white/80 p-3 text-sm text-slate-700 backdrop-blur-sm transition-all duration-300 ${
                        isActive
                          ? 'translate-y-0 opacity-100'
                          : 'pointer-events-none translate-y-2 opacity-0'
                      }`}
                    >
                      {group.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <Card className="mt-6 border-slate-200">
          <CardHeader>
            <CardTitle>Sales Request</CardTitle>
            <CardDescription>Simple order intake form for wholesale and distribution requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="finefoods-buyer-name">Name</Label>
                  <Input
                    id="finefoods-buyer-name"
                    value={form.buyerName}
                    onChange={(event) => handleFieldChange('buyerName', event.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finefoods-business-name">Business</Label>
                  <Input
                    id="finefoods-business-name"
                    value={form.businessName}
                    onChange={(event) => handleFieldChange('businessName', event.target.value)}
                    placeholder="Business name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finefoods-email">Email</Label>
                  <Input
                    id="finefoods-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleFieldChange('email', event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finefoods-phone">Phone</Label>
                  <Input
                    id="finefoods-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => handleFieldChange('phone', event.target.value)}
                    placeholder="(555) 555-5555"
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="finefoods-requested-date">Requested delivery date</Label>
                  <Input
                    id="finefoods-requested-date"
                    type="date"
                    value={form.requestedDate}
                    onChange={(event) => handleFieldChange('requestedDate', event.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-4 text-sm font-semibold text-slate-900">Products and quantities</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {PRODUCTS.map((product) => (
                    <div key={product} className="space-y-2">
                      {OLIVE_OIL_PRODUCTS.includes(product) ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-700">{product}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {OLIVE_OIL_SIZES.map((size) => {
                              const lineKey = `${product} - ${size}`;
                              const fieldId = getProductFieldId(lineKey);
                              return (
                                <div key={lineKey} className="space-y-1">
                                  <Label htmlFor={fieldId} className="text-xs font-medium text-slate-600">
                                    {size}
                                  </Label>
                                  <Input
                                    id={fieldId}
                                    type="number"
                                    min="0"
                                    value={form.quantities[lineKey]}
                                    onChange={(event) => handleQuantityChange(lineKey, event.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <Label htmlFor={getProductFieldId(product)}>{product}</Label>
                          <Input
                            id={getProductFieldId(product)}
                            type="number"
                            min="0"
                            value={form.quantities[product]}
                            onChange={(event) => handleQuantityChange(product, event.target.value)}
                            placeholder="0"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finefoods-notes">Notes</Label>
                <Textarea
                  id="finefoods-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => handleFieldChange('notes', event.target.value)}
                  placeholder="Delivery details, packaging notes, anything else"
                />
              </div>

              <CardFooter className="px-0 pb-0 pt-2">
                <Button type="submit">Submit Request</Button>
                <p className="text-sm text-slate-600">{selectedProducts} products selected</p>
              </CardFooter>
            </form>
          </CardContent>
        </Card>

        {submitted && (
          <Card className="mt-4 border-emerald-200 bg-emerald-50">
            <CardContent className="py-4 text-sm text-emerald-900">
              Request captured. This page is currently a simple intake form (no checkout wired yet).
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FineFoodsPage;
