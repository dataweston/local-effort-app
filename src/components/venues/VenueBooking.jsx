// VenueBooking — the ask on /firehouse and /foodist: a night, a party size, a
// service style, and a deposit that takes the date off the market.
//
// Design: docs/design/VENUES.md. Two things here are reference-derived rather
// than chosen:
//
//   1. The live figure. Explora Journeys pairs a `Nights` selector with a
//      "From $X per adult" that recomputes as you change the selection; that
//      was the one extractable the client's reference actually gave, and it is
//      what this panel is built around. The number is never animated — it just
//      changes — because a count-up is on the blacklist in VENUES.md:255.
//   2. Ruled rows, not cards. SPECIMEN.md rules out three-card rows, and the
//      service styles are three options, which is exactly the shape that wants
//      to become cards. They are a radio list on the same rules as the ledger,
//      taking their grammar from de Boodt's caption strip.
//
// The prices come from src/config/eventPricing.js so they render in the
// prerendered HTML. They are re-derived server-side before any payment link is
// created, so nothing here is load-bearing for correctness — only for honesty
// about what the visitor is about to be charged.

import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  MAX_GUESTS,
  MIN_GUESTS,
  SERVICE_STYLES,
  estimateEvent,
  usd,
} from '../../config/eventPricing';

const ERROR_COPY = {
  'date-not-open': 'That night was taken while you were filling this in. Pick another and we’ll hold it.',
  'date-taken': 'That night was taken while you were filling this in. Pick another and we’ll hold it.',
  'rate-limit-exceeded': 'Too many tries from here. Give it a few minutes, or email us and we’ll do it by hand.',
  'square-not-configured': 'Card payments are down at our end. Send us the date and we’ll hold it by hand today.',
  'checkout-failed': 'The card step didn’t open. Nothing was charged and the night is still free — try again, or email us.',
  'hold-failed': 'We couldn’t reach the calendar. Nothing was charged. Try again in a moment.',
  'over-capacity': 'That’s more people than the room holds. Drop the count, or ask us about the bigger space.',
  'enquiry-failed': 'We couldn’t send that. Nothing was charged — try again, or email us directly.',
  'invalid-email': 'That email address doesn’t look right.',
  'missing-name': 'We need a name for the booking.',
};

const errorFor = (code) =>
  ERROR_COPY[code] || 'Something went wrong and nothing was charged. Try again, or email us.';

export default function VenueBooking({ venue, selectedDate, selectedState, onClearDate }) {
  const [serviceStyle, setServiceStyle] = useState(SERVICE_STYLES[0].key);
  const [guestCount, setGuestCount] = useState(20);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  // The room's own ceiling wins over the pricing cap once it is a real fact.
  const roomMax = useMemo(() => {
    const seats = Math.max(venue.capacity?.seated || 0, venue.capacity?.standing || 0);
    return seats ? Math.min(seats, MAX_GUESTS) : MAX_GUESTS;
  }, [venue.capacity]);

  const quote = useMemo(
    () => estimateEvent({ venueSlug: venue.slug, serviceStyle, guestCount }),
    [venue.slug, serviceStyle, guestCount],
  );

  const stepGuests = (delta) =>
    setGuestCount((current) => Math.min(roomMax, Math.max(MIN_GUESTS, current + delta)));

  // An unmanaged night is not a promise, so it never reaches the deposit path.
  // See the state table in VENUES.md.
  const payable = selectedState === 'open';

  /**
   * Take the money, or ask.
   *
   * These are one form rather than two. The venue page used to fall back to
   * QuickEventBookForm for a night we had not opened, and that form opens with
   * "what kind of party?" — a different question, in a different vocabulary,
   * answered with chips. Someone who has already chosen buffet or coursed and
   * watched a price move should not be handed a fresh questionnaire because the
   * night they picked happens to be one we have not published yet.
   *
   * So the selection is identical either way, and only the last step differs:
   * an opened night gets a Square link, anything else gets an enquiry carrying
   * the same service style, guest count and estimate.
   */
  const submitDeposit = async () => {
    const response = await fetch(`/api/venues/${encodeURIComponent(venue.slug)}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate,
        serviceStyle,
        guestCount,
        contactName,
        contactEmail,
        contactPhone,
        notes,
        website,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.url) return payload.error || 'checkout-failed';

    // Square hosts the card step. Leaving the site is the point — we never
    // touch card data.
    window.location.assign(payload.url);
    return null;
  };

  const submitEnquiry = async () => {
    const parts = contactName.trim().split(/\s+/).filter(Boolean);
    // The shared endpoint prints `eventType` straight into the summary line a
    // human reads, so it gets the service style rather than a party category
    // this form no longer collects.
    const response = await fetch('/api/events/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '-',
        email: contactEmail,
        phone: contactPhone,
        eventDate: selectedDate || undefined,
        eventType: quote?.serviceStyleLabel || undefined,
        guestCount,
        venue: venue.nickname,
        notes: [
          `Venue enquiry from /${venue.slug}.`,
          quote ? `Estimate ${usd(quote.estimateMinCents)}–${usd(quote.estimateMaxCents)}.` : null,
          selectedDate ? `Date ${selectedDate} is not published as open.` : null,
          notes,
        ]
          .filter(Boolean)
          .join(' '),
        website,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return payload.error || 'enquiry-failed';
    return null;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedDate || !quote || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const failure = payable ? await submitDeposit() : await submitEnquiry();
      if (failure) {
        setError(failure);
        setSubmitting(false);
        return;
      }
      if (!payable) setSent(true);
    } catch {
      setError(payable ? 'checkout-failed' : 'enquiry-failed');
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="ht-success" role="status">
        <span className="ht-success-lead">request received —</span>
        We&apos;ll confirm {selectedDate} within one business day. Nothing is charged until we have
        confirmed the details with you.
      </div>
    );
  }

  return (
    <form className="ht-form venue-book" onSubmit={submit}>
      {/* ── the party ── */}
      <fieldset className="venue-book__field">
        <legend className="venue-book__legend">How many people</legend>
        <div className="venue-book__stepper">
          <button
            type="button"
            className="venue-calendar__step"
            onClick={() => stepGuests(-1)}
            disabled={guestCount <= MIN_GUESTS}
            aria-label="One fewer guest"
          >
            &minus;
          </button>
          <input
            className="venue-book__count"
            type="number"
            inputMode="numeric"
            min={MIN_GUESTS}
            max={roomMax}
            value={guestCount}
            aria-label="Number of guests"
            onChange={(event) => {
              const next = parseInt(event.target.value, 10);
              if (Number.isFinite(next)) setGuestCount(next);
            }}
            onBlur={() =>
              setGuestCount((current) => Math.min(roomMax, Math.max(MIN_GUESTS, current || MIN_GUESTS)))
            }
          />
          <button
            type="button"
            className="venue-calendar__step"
            onClick={() => stepGuests(1)}
            disabled={guestCount >= roomMax}
            aria-label="One more guest"
          >
            +
          </button>
          <span className="venue-book__stepper-note">
            {MIN_GUESTS} minimum
            {venue.capacity?.seated || venue.capacity?.standing ? ` · ${roomMax} maximum` : ''}
          </span>
        </div>
      </fieldset>

      {/* ── the service ── ruled rows, never three cards ── */}
      <fieldset className="venue-book__field">
        <legend className="venue-book__legend">How it’s served</legend>
        <div className="venue-book__styles">
          {SERVICE_STYLES.map((style) => (
            <label key={style.key} className="venue-book__style">
              <input
                type="radio"
                name="serviceStyle"
                value={style.key}
                checked={serviceStyle === style.key}
                onChange={() => setServiceStyle(style.key)}
              />
              <span className="venue-book__style-name">{style.label}</span>
              <span className="venue-book__style-rate">
                {usd(style.minCents)}–{usd(style.maxCents)} <i>per guest</i>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* ── the figure ── the one thing that moves as you choose ── */}
      {quote && (
        <dl className="venue-book__ledger" aria-live="polite">
          <div className="venue-ledger__row">
            <dt className="venue-ledger__term">food &amp; service</dt>
            <dd className="venue-ledger__value">
              {usd(quote.perGuestMinCents)}–{usd(quote.perGuestMaxCents)} × {quote.guestCount}
            </dd>
          </div>
          <div className="venue-ledger__row">
            <dt className="venue-ledger__term">venue fee</dt>
            <dd className="venue-ledger__value">
              {usd(quote.venueFeeCents)}
              {venue.venueFeeHours ? <i> — est. {venue.venueFeeHours} hours</i> : null}
            </dd>
          </div>
          <div className="venue-ledger__row venue-book__total">
            <dt className="venue-ledger__term">estimate</dt>
            <dd className="venue-ledger__value">
              {usd(quote.estimateMinCents)}–{usd(quote.estimateMaxCents)}
            </dd>
          </div>
          <div className="venue-ledger__row venue-book__deposit">
            <dt className="venue-ledger__term">to hold the date</dt>
            <dd className="venue-ledger__value">
              {usd(quote.depositCents)}
              <i>
                {' '}
                — {quote.depositPercent}% of {usd(quote.estimateMinCents)}, credited against the
                final invoice
              </i>
            </dd>
          </div>
        </dl>
      )}

      <p className="venue-book__basis">
        {payable || !selectedDate
          ? 'The estimate holds the date. Your chef sets the final menu price from what you actually choose to eat, and the deposit comes off it. If the total lands lower, we refund the difference.'
          : 'We haven’t published this night yet, so we won’t take your money for it. Send it over with the details above and we’ll confirm by hand — usually the same day.'}
      </p>

      {/* ── who ── the same field primitives every other slip on the site
           uses (slipForms.jsx:161-213), so this form inherits the house input
           styling rather than growing a second one. ── */}
      <div className="venue-book__who">
        <div>
          <label className="ht-label" htmlFor={`venue-name-${venue.slug}`}>your name</label>
          <input
            id={`venue-name-${venue.slug}`}
            className="ht-input"
            type="text"
            required
            autoComplete="name"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
          />
        </div>
        <div className="ht-row">
          <div>
            <label className="ht-label" htmlFor={`venue-email-${venue.slug}`}>email</label>
            <input
              id={`venue-email-${venue.slug}`}
              className="ht-input"
              type="email"
              required
              autoComplete="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
          </div>
          <div>
            <label className="ht-label" htmlFor={`venue-phone-${venue.slug}`}>phone</label>
            <input
              id={`venue-phone-${venue.slug}`}
              className="ht-input"
              type="tel"
              autoComplete="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="ht-label" htmlFor={`venue-notes-${venue.slug}`}>
            anything we should know
          </label>
          <textarea
            id={`venue-notes-${venue.slug}`}
            className="ht-input"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {/* Honeypot. Real browsers leave it empty; the server rejects anything
            that fills it. Matches every other public form on the site. */}
        <div className="ht-hp" aria-hidden="true">
          <label htmlFor={`venue-website-${venue.slug}`}>Website</label>
          <input
            id={`venue-website-${venue.slug}`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="ht-error" role="alert">
          {errorFor(error)}
        </p>
      )}

      <div className="venue-book__submit">
        <button type="submit" className="ht-submit" disabled={!selectedDate || submitting}>
          {!selectedDate && 'Pick a night above'}
          {selectedDate && submitting && (payable ? 'Opening the card step…' : 'Sending…')}
          {selectedDate && !submitting && payable && quote &&
            `Hold ${selectedDate} — pay ${usd(quote.depositCents)}`}
          {selectedDate && !submitting && !payable && `Ask about ${selectedDate}`}
        </button>
        {selectedDate && (
          <button type="button" className="venue-book__clear" onClick={onClearDate}>
            change date
          </button>
        )}
      </div>

      <p className="ht-footnote">
        {payable || !selectedDate
          ? 'Card step is handled by Square. The night is held for 24 hours while you pay, and released if you don’t.'
          : 'No card, and nothing held — this one comes back to you by email.'}
      </p>
    </form>
  );
}

VenueBooking.propTypes = {
  venue: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    nickname: PropTypes.string.isRequired,
    capacity: PropTypes.object,
    venueFeeHours: PropTypes.number,
  }).isRequired,
  selectedDate: PropTypes.string,
  selectedState: PropTypes.string,
  onClearDate: PropTypes.func.isRequired,
};

VenueBooking.defaultProps = {
  selectedDate: null,
  selectedState: null,
};
