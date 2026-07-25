// src/components/services/slipForms.jsx
//
// The hand-ruled order-slip forms shared by the service surfaces: the
// standalone /weekly-meals and /small-events pages, and the Local Pizza panel
// on the home page. Extracted verbatim from FullPageDemoPage so the two new
// pages and the home tabs cannot drift apart.
//
// Material system + tokens: src/styles/home-tabs.css (.ht-* under .ht-scope).
// Direction: src/components/fullpage/HOME-TABS-DESIGN.md
import React, { useState } from 'react';
import { trackEvent } from '../../lib/trackEvent';

export const QUICK_EVENT_OPTIONS = [
  { value: 'Dinner party', label: 'Dinner party at my home' },
  { value: 'Pizza party', label: 'Pizza party' },
  { value: 'Office / holiday / shower', label: 'Office, holiday party, shower + more' },
];

// Shared slip-form helpers (same behavior as /julydinner's booking form).
export const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);

export const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export const isValidEmailAddress = (value = '') => /.+@.+\..+/.test(String(value).trim());

export const todayISO = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

// Minimal event booking: name, email, phone, date (+ type when not fixed).
// Posts to the existing /api/events/request endpoint (Supabase + team email
// + ICS attachment + honeypot + rate limiting all live server-side).
export const QuickEventBookForm = ({ fixedType, source, ctaLabel = 'Request this date' }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    type: fixedType || QUICK_EVENT_OPTIONS[0].value,
    website: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const minDate = todayISO();

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  // Friendly, specific validation before anything leaves the page.
  const validationMessage = () => {
    if (!form.date) return "Pick the date you're hoping for — we confirm it within one business day.";
    if (form.date < minDate) return 'That date has already passed — pick one coming up.';
    if (!form.name.trim()) return "Add your name so we know who's hosting.";
    if (!isValidEmailAddress(form.email)) return 'Add your email — the confirmation lands there.';
    if (normalizePhone(form.phone).length !== 10) return 'Add a phone number — we confirm dates with a quick call or text.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    const problem = validationMessage();
    if (problem) {
      setStatus('error');
      setError(problem);
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const nameParts = form.name.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '-';
      const res = await fetch('/api/events/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: form.email.trim(),
          phone: form.phone.trim(),
          eventDate: form.date || undefined,
          eventType: form.type,
          notes: `Quick booking request (${source}).`,
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to send request');
      trackEvent('contact.completed', { store: 'small-events', leadType: `quick_book_${source}` });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to send request. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="ht-success" role="status">
        <span className="ht-success-lead">request received —</span>
        We&apos;ll confirm your date within one business day. Nothing is charged
        until we&apos;ve confirmed the details together.
      </div>
    );
  }

  return (
    <form className="ht-form" onSubmit={handleSubmit} noValidate>
      {!fixedType && (
        <div>
          <span className="ht-label" id={`quickbook-type-${source}`}>what kind of party?</span>
          <div className="ht-chips" role="group" aria-labelledby={`quickbook-type-${source}`}>
            {QUICK_EVENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="ht-chip"
                aria-pressed={form.type === opt.value}
                onClick={() => setForm((prev) => ({ ...prev, type: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="ht-label" htmlFor={`quickbook-date-${source}`}>the date you&apos;re hoping for</label>
        <input
          id={`quickbook-date-${source}`}
          type="date"
          className="ht-input"
          min={minDate}
          value={form.date}
          onChange={update('date')}
          required
        />
      </div>
      <div>
        <label className="ht-label" htmlFor={`quickbook-name-${source}`}>your name</label>
        <input
          id={`quickbook-name-${source}`}
          className="ht-input"
          value={form.name}
          onChange={update('name')}
          autoComplete="name"
          placeholder="first and last"
          required
        />
      </div>
      <div className="ht-row">
        <div>
          <label className="ht-label" htmlFor={`quickbook-email-${source}`}>email</label>
          <input
            id={`quickbook-email-${source}`}
            type="email"
            className="ht-input"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="ht-label" htmlFor={`quickbook-phone-${source}`}>phone</label>
          <input
            id={`quickbook-phone-${source}`}
            type="tel"
            className="ht-input"
            value={form.phone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))
            }
            autoComplete="tel"
            placeholder="(612) 555-0123"
            required
          />
        </div>
      </div>
      {/* Honeypot — real users never see or fill this. */}
      <div className="ht-hp" aria-hidden="true">
        <label htmlFor={`quickbook-website-${source}`}>Website</label>
        <input
          id={`quickbook-website-${source}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={update('website')}
        />
      </div>
      {status === 'error' && <p className="ht-error" role="alert">{error}</p>}
      <button type="submit" className="ht-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : ctaLabel}
      </button>
      <p className="ht-footnote">
        No payment now — we confirm the date and details together first.
      </p>
    </form>
  );
};

// Minimal meal-prep start: name, email, phone (optional), start week.
// Posts to the existing /api/messages/submit endpoint (Brevo contact upsert,
// Sanity inbox message, team email, honeypot + rate limiting server-side).
export const MealPrepQuickStart = ({ source = 'weekly-meals' }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', startDate: '', website: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const minDate = todayISO();

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validationMessage = () => {
    if (!form.name.trim()) return 'Add your name so we know who we are cooking for.';
    if (!isValidEmailAddress(form.email)) return 'Add your email — that is where we plan your first week.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    const problem = validationMessage();
    if (problem) {
      setStatus('error');
      setError(problem);
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const lines = [
        `Weekly meal prep quick signup (${source}).`,
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone || '(not provided)'}`,
        `Preferred start week: ${form.startDate || 'as soon as possible'}`,
      ];
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim(),
          phone: form.phone,
          subject: 'Weekly meal prep signup',
          type: 'meal-prep-signup',
          website: form.website,
          message: lines.join('\n'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to send request');
      trackEvent('contact.completed', { store: 'meal-prep', leadType: 'meal_prep_quick_start' });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to send request. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="ht-success" role="status">
        <span className="ht-success-lead">you&apos;re in —</span>
        The intake form is on its way to your inbox. We&apos;ll reach out within
        one business day to plan your first week: menu, portions, and delivery day.
      </div>
    );
  }

  return (
    <form className="ht-form" onSubmit={handleSubmit} noValidate>
      <div>
        <label className="ht-label" htmlFor="mealprep-quick-name">your name</label>
        <input
          id="mealprep-quick-name"
          className="ht-input"
          value={form.name}
          onChange={update('name')}
          autoComplete="name"
          placeholder="first and last"
          required
        />
      </div>
      <div className="ht-row">
        <div>
          <label className="ht-label" htmlFor="mealprep-quick-email">email</label>
          <input
            id="mealprep-quick-email"
            type="email"
            className="ht-input"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="ht-label" htmlFor="mealprep-quick-phone">phone <span aria-hidden="true">·</span> optional</label>
          <input
            id="mealprep-quick-phone"
            type="tel"
            className="ht-input"
            value={form.phone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))
            }
            autoComplete="tel"
            placeholder="(612) 555-0123"
          />
        </div>
      </div>
      <div>
        <label className="ht-label" htmlFor="mealprep-quick-start">when should the first week land?</label>
        <input
          id="mealprep-quick-start"
          type="date"
          className="ht-input"
          min={minDate}
          value={form.startDate}
          onChange={update('startDate')}
        />
        <p className="ht-footnote ht-footnote--tight">
          leave it blank for as soon as possible
        </p>
      </div>
      {/* Honeypot — real users never see or fill this. */}
      <div className="ht-hp" aria-hidden="true">
        <label htmlFor="mealprep-quick-website">Website</label>
        <input
          id="mealprep-quick-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={update('website')}
        />
      </div>
      {status === 'error' && <p className="ht-error" role="alert">{error}</p>}
      <button type="submit" className="ht-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Start weekly meals'}
      </button>
    </form>
  );
};
