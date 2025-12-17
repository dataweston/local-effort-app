import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SectionHeader from '../components/ui/SectionHeader';
import Separator from '../components/ui/Separator';
import { businessInfo } from '../data/staticContent';

const ServicesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Smooth-scroll to anchor when navigated with a hash (e.g., /services#event-request)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        // Delay to ensure layout is ready
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }
  }, [location.hash]);

  const initialForm = useMemo(
    () => ({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      eventDate: '', // MM-DD-YYYY
      city: '',
      state: '',
      zip: '',
      eventType: '',
      guestCount: '',
      notes: '',
      sendCopy: false,
    }),
    []
  );
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  // const [serviceSlides, setServiceSlides] = useState([]);
  const business = businessInfo;

  const required = (v) => String(v || '').trim().length > 0;
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const reset = () => setForm(initialForm);

  // Hero carousel removed per request

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    // Basic validation
    if (!required(form.firstName) || !required(form.lastName) || !required(form.phone) || !required(form.email)) {
      setResult({ ok: false, message: 'Please complete first name, last name, phone, and email.' });
      return;
    }
    try {
      setSubmitting(true);
      const resp = await fetch('/api/events/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          eventDate: form.eventDate,
          city: form.city,
          state: form.state,
          zip: form.zip,
          eventType: form.eventType,
          guestCount: form.guestCount,
          notes: form.notes,
          sendCopy: !!form.sendCopy,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || 'Failed to submit');
      setResult({ ok: true, message: "thank you so much! we'll get right back to you." });
      reset();
    } catch (err) {
      setResult({ ok: false, message: err.message || 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <Helmet>
        <title>Personal Chef Services Minneapolis–St. Paul | Local Effort</title>
        <meta
          name="description"
          content="In-home dinners, weekly meal prep, and event catering across Minneapolis and St. Paul. Local ingredients, seasonal menus, and chef-led service. Request a quote."
        />
        <script type="application/ld+json">{JSON.stringify((() => {
          const src = business || {};
          return {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            name: src.name || 'Local Effort',
            url: (src.url || 'https://localeffortfood.com') + '/services',
            areaServed: Array.isArray(src.serviceArea) && src.serviceArea.length ? src.serviceArea : ['Minneapolis','St. Paul','Twin Cities','Roseville','Minnesota','Western Wisconsin'],
            sameAs: Array.isArray(src.sameAs) ? src.sameAs : undefined,
            telephone: src.telephone || undefined,
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Services',
              itemListElement: [
                { '@type': 'Service', name: 'Personal Chef', description: 'In-home private dinners and small gatherings.' },
                { '@type': 'Service', name: 'Weekly Meal Prep', description: 'Nutritious, locally-sourced weekly menus and plans.' },
                { '@type': 'Service', name: 'Event Catering', description: 'Small event catering with seasonal, local ingredients.' }
              ]
            }
          };
        })())}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'How far in advance should I book?', acceptedAnswer: { '@type': 'Answer', text: 'As early as you can—two to four weeks is helpful, but we can sometimes accommodate short notice.' } },
            { '@type': 'Question', name: 'What is the typical group size?', acceptedAnswer: { '@type': 'Answer', text: 'We specialize in intimate dinners and small events up to about 50 guests.' } },
            { '@type': 'Question', name: 'Can you customize the menu?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. We tailor menus around your tastes, dietary needs, and seasonal local ingredients.' } }
          ]
        })}</script>
      </Helmet>
      <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <SectionHeader overline="Capabilities" title="Services" />
  {/* Hero carousel removed */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card space-y-4">
            <h3 className="text-heading">Dinners & Events</h3>
            <p className="text-body">in-home dinner parties and small events up to 50</p>
            <button onClick={() => navigate('/events')} className="text-body text-sm underline">
              Details &rarr;
            </button>
          </div>
          <div className="card space-y-4">
            <h3 className="text-heading">Weekly Meal Plans</h3>
            <p className="text-body">Nutritious, locally-sourced meals delivered weekly.</p>
            <button onClick={() => navigate('/meal-prep')} className="text-body text-sm underline">
              Details &rarr;
            </button>
          </div>
          <div className="card space-y-4">
            <h3 className="text-heading">Pizza Parties</h3>
            <p className="text-body">local pizza at your party. we'll bring the oven.</p>
            <button
              onClick={() => navigate('/pizza-party')}
              className="text-body text-sm underline"
            >
              Details &rarr;
            </button>
          </div>
        </div>

        {/* Local city pages quick links (visually hidden, available to crawlers) */}
        <div className="text-center">
          <span className="sr-only">
            <a href="/personal-chef-minneapolis" className="btn btn-ghost">Personal Chef Minneapolis</a>
            <a href="/personal-chef-st-paul" className="btn btn-ghost">Personal Chef St. Paul</a>
            <a href="/personal-chef-twin-cities" className="btn btn-ghost">Twin Cities Personal Chef</a>
          </span>
        </div>

  {/* Photo grid removed per request */}

        <Separator />
        {/* Event Request Form */}
        <section id="event-request" className="pt-10">
          <div className="max-w-3xl mx-auto">
            <SectionHeader overline="Get Started" title="Book an event" />
            <p className="text-body mb-6 text-center">Tell us about your event and we'll follow up with availability and a tailored menu.</p>

            <div className="form-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact Name (First/Last) */}
              <div>
                <label className="block text-sm font-medium" htmlFor="firstName">Contact Name *</label>
                <div className="grid md:grid-cols-2 gap-4 mt-1">
                  <input
                    id="firstName"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2"
                    placeholder="First Name"
                    required
                  />
                  <input
                    id="lastName"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2"
                    placeholder="Last Name"
                    required
                  />
                </div>
                <p className="hint mt-1">This field is required.</p>
              </div>

              {/* Phone and Email */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium" htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-md p-2"
                    placeholder="(000) 000-0000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium" htmlFor="email">E-mail *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="mt-1 w-full border rounded-md p-2"
                    placeholder="example@example.com"
                    required
                  />
                </div>
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-sm font-medium" htmlFor="eventDate">Event Date</label>
                <input
                  type="date"
                  id="eventDate"
                  name="eventDate"
                  value={form.eventDate}
                  onChange={handleChange}
                  className="mt-1 w-full border rounded-md p-2"
                />
                <p className="hint mt-1">Choose a date from the calendar.</p>
              </div>

              {/* Location: City, State, Zip */}
              <div>
                <label className="block text-sm font-medium" htmlFor="city">Where will the event take place?</label>
                <div className="grid md:grid-cols-3 gap-4 mt-1">
                  <input
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2"
                    placeholder="City"
                  />
                  <select
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2 bg-white"
                  >
                    <option value="">Please Select</option>
                    {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    id="zip"
                    name="zip"
                    value={form.zip}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2"
                    placeholder="Zip Code"
                  />
                </div>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium" htmlFor="eventType">Event Type</label>
                <select
                  id="eventType"
                  name="eventType"
                  value={form.eventType}
                  onChange={handleChange}
                  className="mt-1 w-full border rounded-md p-2 bg-white"
                >
                  <option value="">Please Select</option>
                  <option>Home Dinner</option>
                  <option>Small Event</option>
                  <option>Wedding</option>
                  <option>Baby Shower</option>
                  <option>Pizza Party</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Estimated guest count */}
              <div>
                <label className="block text-sm font-medium" htmlFor="guestCount">Estimated guest count</label>
                <input
                  type="number"
                  id="guestCount"
                  name="guestCount"
                  value={form.guestCount}
                  onChange={handleChange}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="ex: 23"
                  min="1"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium" htmlFor="notes">Tell us more! What sort of meal are you thinking? Which foods do you like? What questions do you have for us straight away?</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  className="mt-1 w-full border rounded-md p-2"
                  rows={4}
                  placeholder="Type here..."
                />
              </div>

              {/* Send a copy */}
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" name="sendCopy" checked={form.sendCopy} onChange={handleChange} />
                <span className="text-sm">Email me a copy of this request</span>
              </label>

              {result && (
                <div className={"text-sm " + (result.ok ? 'text-green-700' : 'text-red-700')}>
                  {result.message}
                </div>
              )}

              <div className="actions">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              </div>
            </form>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
export default ServicesPage;
