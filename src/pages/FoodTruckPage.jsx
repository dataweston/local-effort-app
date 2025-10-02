import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Flame,
  MapPin,
  Phone,
  Sparkles,
  Truck,
  UtensilsCrossed
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  eventDate: '',
  cuisine: '',
  location: '',
  notes: ''
};

const FoodTruckInquiryDialog = ({
  children,
  triggerClassName = '',
  triggerVariant = 'default',
  triggerSize = 'lg'
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setForm(initialFormState);
      setStatus('idle');
      setError('');
    }
  }, [open]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'loading') return;

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.eventDate || !form.location.trim()) {
      setError('Please complete the required fields before submitting.');
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      setError('');

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        eventDate: form.eventDate,
        cuisine: form.cuisine.trim(),
        location: form.location.trim(),
        notes: form.notes.trim()
      };

      const response = await fetch('/api/food-truck/inquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'We were unable to send your request. Please try again.');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={triggerClassName}
          variant={triggerVariant}
          size={triggerSize}
        >
          {children || 'Book the Food Truck'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book the Local Effort Food Truck</DialogTitle>
          <DialogDescription>
            The minimum for a food truck service at your event is <strong>$1,200</strong>, either paid by you or guaranteed by you.
            Fill out the details below and we&rsquo;ll confirm availability within 24 hours.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-4 py-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-4 text-xl font-semibold text-emerald-700">Thank you!</h3>
              <p className="text-sm text-emerald-700">
                We received your food truck inquiry and will get back to you within 24 hours.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" className="w-full sm:w-auto">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="food-truck-name">Name / business name *</Label>
                <Input
                  id="food-truck-name"
                  name="name"
                  placeholder="Who should we contact?"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-email">Email *</Label>
                <Input
                  id="food-truck-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-phone">Phone *</Label>
                <Input
                  id="food-truck-phone"
                  type="tel"
                  name="phone"
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-date">Event date *</Label>
                <Input
                  id="food-truck-date"
                  type="date"
                  name="eventDate"
                  value={form.eventDate}
                  onChange={handleChange('eventDate')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="food-truck-cuisine">Desired cuisine or menu focus</Label>
                <Input
                  id="food-truck-cuisine"
                  name="cuisine"
                  placeholder="Wood-fired pizza, tacos, brunch..."
                  value={form.cuisine}
                  onChange={handleChange('cuisine')}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="food-truck-location">Event location *</Label>
                <Textarea
                  id="food-truck-location"
                  name="location"
                  placeholder="Venue name, street address, city"
                  value={form.location}
                  onChange={handleChange('location')}
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="food-truck-notes">Anything else we should know?</Label>
              <Textarea
                id="food-truck-notes"
                name="notes"
                placeholder="Guest count, service window, power or parking notes..."
                value={form.notes}
                onChange={handleChange('notes')}
                rows={3}
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-700">
              <p className="font-semibold">Minimum guarantee</p>
              <p>The minimum for a food truck service is $1,200. This can be prepaid or guaranteed to meet the minimum sales.</p>
            </div>

            {status === 'error' && error && (
              <p className="text-sm font-medium text-rose-600" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Submit inquiry'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.35 }}
    className="rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-sm backdrop-blur"
  >
    <Icon className="h-8 w-8 text-[var(--color-accent)]" />
    <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-600">{description}</p>
  </motion.div>
);

const steps = [
  {
    title: 'Share your event details',
    description: 'Tell us about the date, location, cuisine and guest needs. We&rsquo;ll reply with timing and menu options.'
  },
  {
    title: 'Design your menu',
    description: 'Collaborate with Chef Weston on a custom wood-fired menu that fits your guests, season and budget.'
  },
  {
    title: 'We roll in ready to cook',
    description: 'Our crew handles setup, service and cleanup so you can enjoy the event. All we need is space to park and cook.'
  }
];

const FoodTruckPage = () => {
  const canonical = 'https://localeffort.app/food-truck';
  const pageTitle = 'Book a Food Truck | Local Effort';
  const pageDescription = 'Bring Local Effort’s wood-fired food truck to your next event. Custom menus, on-site cooking and a $1,200 minimum guarantee.';

  const serviceSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Local Effort Food Truck Catering',
    serviceType: 'Food Truck Catering',
    provider: {
      '@type': 'Organization',
      name: 'Local Effort',
      areaServed: { '@type': 'Place', name: 'Minnesota' }
    },
    description: pageDescription,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'PriceSpecification',
        price: 1200,
        priceCurrency: 'USD',
        description: 'Minimum guarantee for on-site food truck service.'
      }
    },
    url: canonical,
    areaServed: ['Minneapolis', 'St. Paul', 'Twin Cities', 'Minnesota'],
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: canonical,
      servicePhone: {
        '@type': 'ContactPoint',
        telephone: '+1-651-243-1235',
        contactType: 'Sales'
      }
    }
  }), [canonical, pageDescription]);

  const breadcrumbSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://localeffort.app/' },
      { '@type': 'ListItem', position: 2, name: 'Book a Food Truck', item: canonical }
    ]
  }), [canonical]);

  return (
    <div className="pb-16">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-100" aria-hidden="true" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:flex-row md:items-center md:gap-16 md:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm">
              <Truck className="h-4 w-4" />
              Local Effort Food Truck
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Wood-fired food truck experiences built for your event
            </h1>
            <p className="mt-4 text-lg text-slate-700">
              From weddings and corporate celebrations to neighborhood block parties, we bring our mobile kitchen, seasoned team and custom menus right to you. The only requirement is a $1,200 minimum guarantee.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <FoodTruckInquiryDialog triggerClassName="w-full sm:w-auto" />
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                <Phone className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <p className="font-semibold text-slate-900">Prefer to call?</p>
                  <p>651-243-1235</p>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative w-full max-w-md self-center"
          >
            <div className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <Flame className="h-10 w-10 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Signature service</p>
                  <p className="text-2xl font-semibold text-slate-900">Fire, flavor & hospitality</p>
                </div>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  Custom menu design & on-site cooking
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  Staffed by Local Effort hospitality team
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                  Service minimum: $1,200 guarantee
                </li>
              </ul>
              <FoodTruckInquiryDialog triggerVariant="outline" triggerSize="default" triggerClassName="mt-8 w-full">
                Check availability
              </FoodTruckInquiryDialog>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={ChefHat}
            title="Chef-led menus"
            description="Chef Weston cooks alongside our team to deliver seasonal menus built around your guests, theme and service window."
          />
          <FeatureCard
            icon={UtensilsCrossed}
            title="Flexible formats"
            description="Choose coursed dinners, roaming bites, late-night snacks or service windows that keep the line moving."
          />
          <FeatureCard
            icon={MapPin}
            title="On-site everywhere"
            description="We travel across the Twin Cities metro and greater Minnesota. All we need is a safe parking space and access to guests."
          />
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 md:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-semibold text-slate-900">What to expect</h2>
            <p className="text-lg text-slate-700">
              We design and cook everything from scratch using Midwestern ingredients, seasonal produce and our wood-fired equipment. Each booking includes menu planning, staffing, service ware and clean up when the service window ends.
            </p>
            <div className="space-y-4 text-slate-700">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-1 h-6 w-6 text-[var(--color-accent)]" />
                <div>
                  <p className="font-semibold text-slate-900">Prime dates fill fast</p>
                  <p className="text-sm">Submitting the inquiry above gives you first hold on the calendar while we confirm logistics.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Flame className="mt-1 h-6 w-6 text-[var(--color-accent)]" />
                <div>
                  <p className="font-semibold text-slate-900">Wood-fired, anywhere</p>
                  <p className="text-sm">We operate year-round with ovens, planchas and grills that can be configured for indoor garages or outdoor spaces.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <UtensilsCrossed className="mt-1 h-6 w-6 text-[var(--color-accent)]" />
                <div>
                  <p className="font-semibold text-slate-900">Service team included</p>
                  <p className="text-sm">Our crew handles setup, guest interaction, replenishing and cleanup. You focus on hosting.</p>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-xl"
          >
            <h3 className="text-2xl font-semibold text-slate-900">How booking works</h3>
            <ol className="mt-6 space-y-5 text-slate-700">
              {steps.map((step, index) => (
                <li key={step.title} className="flex items-start gap-4">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-base font-semibold text-orange-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm" dangerouslySetInnerHTML={{ __html: step.description }} />
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4 text-sm text-emerald-700">
              <p className="font-semibold text-emerald-800">Need a custom package?</p>
              <p>We can bundle beverage service, private chef dinners or late-night snacks with your food truck booking.</p>
            </div>
            <FoodTruckInquiryDialog triggerClassName="mt-8 w-full">
              Start your inquiry
            </FoodTruckInquiryDialog>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default FoodTruckPage;
