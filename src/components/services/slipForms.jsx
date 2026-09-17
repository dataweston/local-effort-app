// src/components/services/slipForms.jsx
//
// The hand-ruled order-slip forms shared by the service surfaces: the
// standalone /weekly-meals and /small-events pages, and the Local Pizza panel
// on the home page. Extracted verbatim from FullPageDemoPage so the two new
// pages and the home tabs cannot drift apart.
//
// Material system + tokens: src/styles/home-tabs.css (.ht-* under .ht-scope).
// Direction: src/components/fullpage/HOME-TABS-DESIGN.md
import React, { useEffect, useState } from 'react';
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
export const QuickEventBookForm = ({
  fixedType,
  source,
  ctaLabel = 'Request this date',
  // Set by the venue pages when someone picks a night on the calendar, so the
  // grid and the slip are never telling the customer two different dates.
  presetDate = '',
  // Venue nickname (FIREHOUSE / FOODIST). Absent means the original behaviour:
  // we cook at the customer's own place.
  venue = null,
}) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: presetDate || '',
    type: fixedType || QUICK_EVENT_OPTIONS[0].value,
    website: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // The calendar owns the date once a venue page passes one in, but the field
  // stays editable — someone who opens the date picker and changes it should
  // not have their choice snapped back.
  useEffect(() => {
    if (!presetDate) return;
    setForm((current) => (current.date === presetDate ? current : { ...current, date: presetDate }));
  }, [presetDate]);
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
          venue: venue || undefined,
          notes: venue
            ? `Quick booking request (${source}). Venue: ${venue}.`
            : `Quick booking request (${source}).`,
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to send request');
      trackEvent('contact.completed', {
        store: 'small-events',
        leadType: `quick_book_${source}`,
        ...(venue ? { venue } : {}),
      });
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

// Meal prep waitlist: email is the only required answer. Name, phone, family
// size, and which meals a household wants are all optional, because the list
// exists to capture the lead — details come later in conversation.
// Posts to the existing /api/messages/submit endpoint (Brevo contact upsert,
// Sanity inbox message, team email, Supabase meal_prep_waitlist row, honeypot
// + rate limiting server-side).
export const MEAL_INTEREST_OPTIONS = [
  { value: 'breakfasts', label: 'breakfasts' },
  { value: 'lunch', label: 'lunch' },
  { value: 'dinner', label: 'dinner' },
  { value: 'kids-food', label: 'kids food' },
  { value: 'other', label: 'other' },
];

export const MealPrepWaitlistForm = ({ source = 'weekly-meals' }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    familySize: '',
    website: '',
  });
  const [meals, setMeals] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const toggleMeal = (value) => () =>
    setMeals((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const mealLabels = () =>
    MEAL_INTEREST_OPTIONS.filter((option) => meals.includes(option.value))
      .map((option) => option.label)
      .join(', ');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (!isValidEmailAddress(form.email)) {
      setStatus('error');
      setError('Add your email — that is the only thing we actually need.');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const lines = [
        `Meal prep waitlist signup (${source}).`,
        `Name: ${form.name.trim() || '(not provided)'}`,
        `Email: ${form.email.trim()}`,
        `Phone: ${form.phone || '(not provided)'}`,
        `Family size: ${form.familySize.trim() || '(not provided)'}`,
        `Most interested in: ${mealLabels() || '(not provided)'}`,
      ];
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone,
          familySize: form.familySize.trim(),
          mealsInterested: meals,
          subject: 'Meal prep waitlist signup',
          type: 'meal-prep-waitlist',
          website: form.website,
          message: lines.join('\n'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to send request');
      trackEvent('contact.completed', { store: 'meal-prep', leadType: 'meal_prep_waitlist' });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to send request. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="ht-success" role="status">
        <span className="ht-success-lead">you&apos;re on the list —</span>
        We&apos;ll email you as soon as a spot opens. Check your inbox for the
        confirmation; the full intake form is linked inside if you want to plan
        details now.
      </div>
    );
  }

  return (
    <form className="ht-form" onSubmit={handleSubmit} noValidate>
      <div className="ht-row">
        <div>
          <label className="ht-label" htmlFor="mealprep-waitlist-email">email</label>
          <input
            id="mealprep-waitlist-email"
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
          <label className="ht-label" htmlFor="mealprep-waitlist-name">
            your name <span aria-hidden="true">·</span> optional
          </label>
          <input
            id="mealprep-waitlist-name"
            className="ht-input"
            value={form.name}
            onChange={update('name')}
            autoComplete="name"
            placeholder="first and last"
          />
        </div>
      </div>
      <div className="ht-row">
        <div>
          <label className="ht-label" htmlFor="mealprep-waitlist-phone">
            phone <span aria-hidden="true">·</span> optional
          </label>
          <input
            id="mealprep-waitlist-phone"
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
        <div>
          <label className="ht-label" htmlFor="mealprep-waitlist-family">
            family size <span aria-hidden="true">·</span> optional
          </label>
          <input
            id="mealprep-waitlist-family"
            className="ht-input"
            value={form.familySize}
            onChange={update('familySize')}
            placeholder="2 adults + 2 kids"
          />
        </div>
      </div>
      <fieldset className="ht-checks">
        <legend className="ht-label">
          most interested in <span aria-hidden="true">·</span> optional
        </legend>
        <div className="ht-checks-grid">
          {MEAL_INTEREST_OPTIONS.map((option) => (
            <label className="ht-check" key={option.value} htmlFor={`mealprep-waitlist-${option.value}`}>
              <input
                id={`mealprep-waitlist-${option.value}`}
                type="checkbox"
                checked={meals.includes(option.value)}
                onChange={toggleMeal(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {/* Honeypot — real users never see or fill this. */}
      <div className="ht-hp" aria-hidden="true">
        <label htmlFor="mealprep-waitlist-website">Website</label>
        <input
          id="mealprep-waitlist-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={update('website')}
        />
      </div>
      {status === 'error' && <p className="ht-error" role="alert">{error}</p>}
      <button type="submit" className="ht-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Join the waitlist'}
      </button>
      <p className="ht-footnote ht-footnote--tight">
        Only your email is required — everything else helps us plan sooner.
      </p>
    </form>
  );
};
