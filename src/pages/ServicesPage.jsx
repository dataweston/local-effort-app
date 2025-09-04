import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import CloudinaryImage from '../components/common/cloudinaryImage';
import Carousel from '../components/common/Carousel';

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
  const [serviceSlides, setServiceSlides] = useState([]);
  const [bookHero, setBookHero] = useState(null);

  const required = (v) => String(v || '').trim().length > 0;
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const reset = () => setForm(initialForm);

  // Load hero carousel images tagged 'service'
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/search-images?query=service&per_page=12`);
        if (!res.ok) throw new Error(`Service images failed: ${res.status}`);
        const data = await res.json();
        if (abort) return;
        const images = data.images || [];
    const slides = images.map((img, i) => ({
          key: img.public_id || String(i),
          node: (
      <div className="w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[21/9] max-h-[70vh] rounded-xl overflow-hidden">
              <CloudinaryImage
                publicId={img.public_id}
                alt={img.public_id}
        className="w-full h-full object-cover"
                placeholderMode="none"
        sizes="(min-width: 1024px) 100vw, 100vw"
                eager={i === 0}
              />
            </div>
          ),
        }));
        setServiceSlides(slides);
      } catch (_e) {
        // silent fail
      }
    })();
    return () => { abort = true; };
  }, []);

  // Load a single hero image for the Book section from tag 'book'
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`/api/search-images?query=book&per_page=1`);
        if (!res.ok) throw new Error(`Book image failed: ${res.status}`);
        const data = await res.json();
        if (abort) return;
        const first = (data.images || [])[0];
        if (first) setBookHero(first.public_id);
      } catch (_e) {
        // ignore
      }
    })();
    return () => { abort = true; };
  }, []);

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
      const subject = `Event Request${form.guestCount ? `: ${form.guestCount} guests` : ''}${form.eventDate ? ` on ${form.eventDate}` : ''}`;
      const summary = [
        form.eventType ? `Event Type: ${form.eventType}` : null,
        form.eventDate ? `Event Date: ${form.eventDate}` : null,
        form.guestCount ? `Estimated Guests: ${form.guestCount}` : null,
        form.city || form.state || form.zip ? `Location: ${[form.city, form.state, form.zip].filter(Boolean).join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      const message = `${summary}\n\nNotes:\n${form.notes || '(none)'}`;

      const resp = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone,
          subject,
          message,
          type: 'event',
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
        <title>Services | Local Effort</title>
        <meta
          name="description"
          content="Explore the personal chef and catering services offered by Local Effort."
        />
      </Helmet>
      <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        <h2 className="text-hero uppercase border-b border-gray-900 pb-4">Services</h2>

        {/* Hero carousel from Cloudinary tag `service` */}
        {serviceSlides.length > 0 && (
          <Carousel items={serviceSlides} intervalMs={6500} transitionStyle="fade" className="w-full" />
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card space-y-4">
            <h3 className="text-heading">Weekly Meal Prep</h3>
            <p className="text-body">Nutritious, locally-sourced meals delivered weekly.</p>
            <button onClick={() => navigate('/meal-prep')} className="text-body text-sm underline">
              Details &rarr;
            </button>
          </div>
          <div className="card space-y-4">
            <h3 className="text-heading">Dinners & Events</h3>
            <p className="text-body">in-home dinner parties and small events up to 50</p>
            <button onClick={() => navigate('/events')} className="text-body text-sm underline">
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

        {/* Event Request Form */}
        <section id="event-request" className="border-t border-neutral-200 pt-10">
          <div className="max-w-3xl mx-auto">
            {/* Book section hero image */}
            {bookHero && (
              <div className="w-full h-[30vh] md:h-[36vh] lg:h-[42vh] rounded-xl overflow-hidden mb-6">
                <CloudinaryImage
                  publicId={bookHero}
                  alt="Book an event"
                  className="w-full h-full object-cover"
                  sizes="100vw"
                  eager
                />
              </div>
            )}
            <h3 className="mb-1 text-center text-2xl font-bold">book an event</h3>
            <p className="text-body mb-6 text-center">Tell us about your event and we’ll follow up with availability and a tailored menu.</p>

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
