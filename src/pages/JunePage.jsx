import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ImageZoom from 'react-image-zooom';
import { useSquareCard } from '../hooks/useSquareCard';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../lib/checkoutAttemptId';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';

const MIN_GUESTS = 4;
const MAX_GUESTS = 12;

// Tiered pricing: party of 4 = $300, 6 = $420, 8+ = $65/person
const PARTY_PRICES_CENTS = {
  4: 30000,
  5: 36000,
  6: 42000,
  7: 49000,
  8: 52000,
  9: 58500,
  10: 65000,
  11: 71500,
  12: 78000,
};

const getPartyPrice = (guests) => {
  const clamped = Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, guests));
  return PARTY_PRICES_CENTS[clamped] || PARTY_PRICES_CENTS[MIN_GUESTS];
};

const getJuneYear = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return month > 5 ? year + 1 : year;
};

const pad2 = (value) => String(value).padStart(2, '0');

const formatDateLabel = (date) => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatMoney = (cents) => (cents / 100).toFixed(2);

const clampGuests = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return MIN_GUESTS;
  return Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, parsed));
};

const isValidEmail = (value) => /.+@.+\..+/.test(value.trim());
const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);
const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};
const formatPostal = (value) => value.replace(/\D/g, '').slice(0, 5);

const JunePage = () => {
  const year = useMemo(() => getJuneYear(), []);
  const monthLabel = useMemo(() => `June ${year}`, [year]);
  const juneStart = useMemo(() => new Date(year, 5, 1, 12, 0, 0), [year]);
  const juneEnd = useMemo(() => new Date(year, 6, 0, 12, 0, 0), [year]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [guestCount, setGuestCount] = useState(MIN_GUESTS);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: 'MN', postal: '' });
  const [preferredTime, setPreferredTime] = useState('6:00 PM');
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);
  const stepLabels = ['Pick a date', 'Name + address', 'Dietary + notes', 'Reserve'];
  const [activeStep, setActiveStep] = useState(0);
  const trackRef = useRef(null);

  // Known sold out dates (fallback if API fails in development)
  const KNOWN_SOLD_OUT = [];
  const FORCE_AVAILABLE = useMemo(() => [], []);

  // Fetch booked dates on mount
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        console.log('[JunePage] Fetching booked dates...');
        const resp = await fetch('/api/june/booked-dates');
        console.log('[JunePage] Response status:', resp.status);
        if (resp.ok) {
          const data = await resp.json();
          console.log('[JunePage] Booked dates:', data.bookedDates);
          // Merge API dates with known sold out dates
          const merged = [...new Set([...(data.bookedDates || []), ...KNOWN_SOLD_OUT])];
          const filtered = merged.filter((date) => !FORCE_AVAILABLE.includes(date));
          setBookedDates(filtered);
        } else {
          console.warn('[JunePage] API response not ok, using fallback');
          setBookedDates(KNOWN_SOLD_OUT.filter((date) => !FORCE_AVAILABLE.includes(date)));
        }
      } catch (err) {
        console.warn('[JunePage] Failed to fetch booked dates, using fallback', err);
        setBookedDates(KNOWN_SOLD_OUT.filter((date) => !FORCE_AVAILABLE.includes(date)));
      }
    };
    fetchBookedDates();
  }, []);

  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer } = useSquareCard(
    '#june-card-container',
    true,
    [] // Don't reinitialize card when date changes
  );
  const [fallbackUrl, setFallbackUrl] = useState('');
  const [fallbackStatus, setFallbackStatus] = useState({ loading: false, error: '' });
  const checkoutAttemptRef = useRef('');
  const attemptStorageKey = 'le:checkoutAttempt:june';

  const resolveCheckoutAttemptId = useCallback(() => {
    if (checkoutAttemptRef.current) return checkoutAttemptRef.current;
    const next = getOrCreateCheckoutAttemptId(attemptStorageKey);
    checkoutAttemptRef.current = next;
    return next;
  }, []);

  const clearCheckoutAttempt = useCallback(() => {
    checkoutAttemptRef.current = '';
    clearCheckoutAttemptId(attemptStorageKey);
  }, []);

  const totalGuests = clampGuests(guestCount);
  const totalCents = getPartyPrice(totalGuests);
  const selectedIso = selectedDate
    ? `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(selectedDate.getDate())}`
    : '';

  const buildFallbackLink = useCallback(async () => {
    if (fallbackStatus.loading) return;
    if (!selectedIso) {
      setFallbackStatus({ loading: false, error: 'Select a date to build hosted checkout.' });
      return;
    }
    setFallbackStatus({ loading: true, error: '' });
    try {
      const response = await fetch('/api/june/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedIso,
          guestCount: totalGuests,
          preferredTime,
          customer,
          address,
          dietaryNotes,
          notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Unable to create hosted checkout.');
      setFallbackUrl(data?.url || '');
    } catch (err) {
      setFallbackStatus({ loading: false, error: err?.message || 'Unable to create hosted checkout.' });
      return;
    }
    setFallbackStatus({ loading: false, error: '' });
  }, [fallbackStatus.loading, selectedIso, totalGuests, preferredTime, customer, address, dietaryNotes, notes]);

  const isDateBooked = useCallback((date) => {
    if (!date) return false;
    const iso = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    return bookedDates.includes(iso);
  }, [bookedDates]);

  const isAvailableDate = useCallback((date) => {
    if (!date) return false;
    if (date.getMonth() !== 5) return false;
    const day = date.getDay();
    if (day !== 4 && day !== 6) return false;
    // Check if already booked
    if (isDateBooked(date)) return false;
    return true;
  }, [isDateBooked]);

  const getDayClassName = useCallback((date) => {
    if (!date || date.getMonth() !== 5) return 'june-date-unavailable';
    const day = date.getDay();
    if (day !== 4 && day !== 6) return 'june-date-unavailable';
    if (isDateBooked(date)) return 'june-date-soldout';
    return 'june-date-available';
  }, [isDateBooked]);

  const canSubmit = () => {
    if (!selectedDate) return false;
    if (!customer.name.trim()) return false;
    if (!isValidEmail(customer.email)) return false;
    if (normalizePhone(customer.phone).length !== 10) return false;
    if (!address.line1.trim() || !address.city.trim() || address.postal.trim().length < 5) return false;
    if (!cardLoaded) return false;
    return true;
  };

  const resetStatus = () => {
    if (status !== 'idle') {
      setStatus('idle');
      setError('');
    }
  };

  const scrollToStep = useCallback((index, behavior = 'smooth') => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth || 1;
    track.scrollTo({ left: index * width, behavior });
    setActiveStep(index);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const width = track.clientWidth || 1;
        const nextIndex = Math.round(track.scrollLeft / width);
        if (nextIndex !== activeStep) {
          setActiveStep(nextIndex);
        }
      });
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeStep]);

  useEffect(() => {
    const handleResize = () => scrollToStep(activeStep, 'auto');
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeStep, scrollToStep]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    setError('');

    if (!selectedDate) {
      setError('Select an available June date first.');
      return;
    }
    if (!canSubmit()) {
      setError('Please complete all required fields before booking.');
      return;
    }

    setStatus('submitting');

    try {
      const token = await tokenize();
      const verificationDetails = {
        amount: (totalCents / 100).toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: customer?.name?.split(' ')?.[0] || undefined,
          familyName: customer?.name?.split(' ')?.slice(1).join(' ') || undefined,
          email: customer?.email || undefined,
          phone: customer?.phone || undefined,
          addressLines: [address?.line1, address?.line2].filter(Boolean),
          city: address?.city || undefined,
          state: address?.state || undefined,
          postalCode: address?.postal || undefined,
          countryCode: 'US',
        },
      };
      const verificationToken = await verifyBuyer(token, verificationDetails);
      const checkoutAttemptId = resolveCheckoutAttemptId();
      const payload = {
        date: selectedIso,
        guestCount: totalGuests,
        preferredTime,
        dietaryNotes,
        notes,
        customer,
        address,
        token,
        verificationToken,
        checkoutAttemptId,
      };

      const response = await fetch('/api/june/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Payment failed.');
      }

      setPaymentId(data?.paymentId || '');
      setEmailStatus(data?.emailStatus || null);
      setStatus('success');
      clearCheckoutAttempt();
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to complete booking.');
    }
  };

  return (
    <div className="fullpage-demo june-page">
      <Helmet>
        <title>June Chef Dinner | {SITE_NAME}</title>
        <meta
          name="description"
          content="Reserve a private chef dinner in your home this June. Thursday and Saturday dates available."
        />
        <link rel="canonical" href={`${SITE_URL}/june`} />
        {/* Open Graph / iMessage / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/june`} />
        <meta property="og:title" content={`June Chef Dinner | ${SITE_NAME}`} />
        <meta property="og:description" content="Reserve a private chef dinner in your home this June. Thursday and Saturday dates available." />
        <meta property="og:image" content="https://res.cloudinary.com/dokyhfvyd/image/upload/v1769975355/jo5t7cv3zuvuuvsyuh8c.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${SITE_URL}/june`} />
        <meta name="twitter:title" content={`June Chef Dinner | ${SITE_NAME}`} />
        <meta name="twitter:description" content="Reserve a private chef dinner in your home this June. Thursday and Saturday dates available." />
        <meta name="twitter:image" content="https://res.cloudinary.com/dokyhfvyd/image/upload/v1769975355/jo5t7cv3zuvuuvsyuh8c.jpg" />
      </Helmet>

      <nav className="june-breadcrumb">
        <a href="/#small-events">← Small Events</a>
      </nav>

      <div className="june-grid">
        <div className="june-col june-col-left">
          <div className="june-hero-media">
            <ImageZoom
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/v1769975355/jo5t7cv3zuvuuvsyuh8c.jpg"
              alt="Chef-prepared dinner served in a home setting"
              zoom="200"
            />
          </div>
          <div className="june-info-box june-info-box-mobile">
            <h2>Dinner in your Home</h2>
            <p>
              We'll come over an hour before dinner time and prepare the meal in your kitchen. We'll use your pots and pans, and we'll bring anything specialized that we need. Your dinner price includes dishware and flatware, service, and cleanup when we're done. The experience is intended to feel like your home has transformed into a restaurant.
            </p>
          </div>
          <div className="june-hero-text">
            <div className="june-pricing">
              <h2>Party of 4 — $300</h2>
              <h2>Party of 6 — $420</h2>
              <h2>Party of 8+ — $65/person</h2>
            </div>
            <p>
              Dinners in June are the toughest, from a farm-to-table perspective. This menu is comfort-food forward, and focuses on a seasonal preoccupation: dairy.
            </p>
            <p>
              We're making our own ricotta, cottage cheese, labneh, butter, marscapone, and ranch dressing from milk and cream by Autumnwood Farm in Forest Lake. We've also got lamb neck from Petersen Meats in Porter, and confit mushrooms from R&R, which are grown year-round in tents.
            </p>
            <p>
              Meanwhile, citrus is fully in season in Southern California.
            </p>
          </div>
        </div>

        <div className="june-col june-col-right">
          <section className="june-reservation">
          <div className="june-step-nav">
            <div className="june-step-tabs" role="tablist" aria-label="Reservation steps">
              {stepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={activeStep === index}
                  className={`june-step-tab ${activeStep === index ? 'is-active' : ''}`}
                  onClick={() => scrollToStep(index)}
                >
                  <span className="june-step-index">{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="june-step-actions">
              <button
                type="button"
                className="june-step-arrow"
                onClick={() => scrollToStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                aria-label="Previous step"
              >
                ‹
              </button>
              <button
                type="button"
                className="june-step-button"
                onClick={() => scrollToStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
              >
                Back
              </button>
              <button
                type="button"
                className="june-step-button is-primary"
                onClick={() => scrollToStep(Math.min(stepLabels.length - 1, activeStep + 1))}
                disabled={activeStep === stepLabels.length - 1}
              >
                Next
              </button>
              <button
                type="button"
                className="june-step-arrow"
                onClick={() => scrollToStep(Math.min(stepLabels.length - 1, activeStep + 1))}
                disabled={activeStep === stepLabels.length - 1}
                aria-label="Next step"
              >
                ›
              </button>
            </div>
          </div>

          {status === 'success' && (
            <div className="june-success">
              <div className="june-success-title">Booking confirmed</div>
              <div className="june-success-copy">
                Payment received. A confirmation email is on the way with your details.
              </div>
              {paymentId && (
                <div className="june-success-meta">Payment ID: {paymentId}</div>
              )}
              {emailStatus?.customer === false && (
                <div className="june-warning">We could not send the customer email. Please contact us.</div>
              )}
            </div>
          )}

          <form className="june-reservation-track" onSubmit={handleSubmit} ref={trackRef}>
            <section className="june-card june-step june-step-calendar june-step-compact">
              <div className="june-step-title">1. Pick a date</div>
              <div className="june-datepicker">
                <DatePicker
                  inline
                  selected={selectedDate}
                  onChange={(date) => {
                    if (isAvailableDate(date)) {
                      setSelectedDate(date);
                      resetStatus();
                    }
                  }}
                  minDate={juneStart}
                  maxDate={juneEnd}
                  filterDate={isAvailableDate}
                  dayClassName={getDayClassName}
                />
              </div>
            </section>

            <section className="june-card june-step june-step-compact">
              <div className="june-step-title">2. Name + address</div>
              <div className="june-form-grid">
                <div>
                  <label className="form-fun-label" htmlFor="june-name">Name <span className="required-indicator">*</span></label>
                  <input
                    id="june-name"
                    className="input"
                    value={customer.name}
                    onChange={(e) => {
                      setCustomer((prev) => ({ ...prev, name: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="june-email">Email <span className="required-indicator">*</span></label>
                  <input
                    id="june-email"
                    type="email"
                    className="input"
                    value={customer.email}
                    onChange={(e) => {
                      setCustomer((prev) => ({ ...prev, email: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="june-phone">Phone <span className="required-indicator">*</span></label>
                  <input
                    id="june-phone"
                    type="tel"
                    className="input"
                    value={customer.phone}
                    onChange={(e) => {
                      setCustomer((prev) => ({ ...prev, phone: formatPhone(e.target.value) }));
                      resetStatus();
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="june-guests">Guest count <span className="required-indicator">*</span></label>
                  <input
                    id="june-guests"
                    type="number"
                    className="input"
                    min={MIN_GUESTS}
                    max={MAX_GUESTS}
                    value={guestCount}
                    onChange={(e) => {
                      setGuestCount(clampGuests(e.target.value));
                      resetStatus();
                    }}
                    required
                  />
                </div>
                <div className="june-form-span">
                  <label className="form-fun-label" htmlFor="june-address1">Address <span className="required-indicator">*</span></label>
                  <input
                    id="june-address1"
                    className="input"
                    value={address.line1}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, line1: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Street address"
                    required
                  />
                </div>
                <div className="june-form-span">
                  <input
                    id="june-address2"
                    className="input"
                    value={address.line2}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, line2: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Unit, suite, etc. (optional)"
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="june-city">City <span className="required-indicator">*</span></label>
                  <input
                    id="june-city"
                    className="input"
                    value={address.city}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, city: e.target.value }));
                      resetStatus();
                    }}
                    placeholder="Minneapolis"
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="june-state">State <span className="required-indicator">*</span></label>
                  <input
                    id="june-state"
                    className="input"
                    value={address.state}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, state: e.target.value }));
                      resetStatus();
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="june-postal">ZIP <span className="required-indicator">*</span></label>
                  <input
                    id="june-postal"
                    className="input"
                    value={address.postal}
                    onChange={(e) => {
                      setAddress((prev) => ({ ...prev, postal: formatPostal(e.target.value) }));
                      resetStatus();
                    }}
                    placeholder="55401"
                    required
                  />
                </div>
                <div className="june-form-span">
                  <label className="form-fun-label" htmlFor="june-time">Preferred start time</label>
                  <input
                    id="june-time"
                    className="input"
                    value={preferredTime}
                    onChange={(e) => {
                      setPreferredTime(e.target.value);
                      resetStatus();
                    }}
                    placeholder="6:00 PM"
                  />
                </div>
              </div>
            </section>

            <section className="june-card june-step june-step-notes june-step-compact">
              <div className="june-step-title">3. Dietary + notes</div>
              <div className="june-form-grid">
                <div className="june-form-span">
                  <label className="form-fun-label" htmlFor="june-dietary">Dietary notes</label>
                  <textarea
                    id="june-dietary"
                    className="textarea june-textarea-lg"
                    rows={6}
                    value={dietaryNotes}
                    onChange={(e) => {
                      setDietaryNotes(e.target.value);
                      resetStatus();
                    }}
                    placeholder="Allergies, restrictions, preferences"
                  />
                </div>
                <div className="june-form-span">
                  <label className="form-fun-label" htmlFor="june-notes">Additional notes</label>
                  <textarea
                    id="june-notes"
                    className="textarea june-textarea-lg"
                    rows={6}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      resetStatus();
                    }}
                    placeholder="Parking details, kitchen notes, celebrations"
                  />
                </div>
              </div>
            </section>

            <section className="june-card june-step june-step-compact">
              <div className="june-step-title">4. Reserve</div>
              <div className="june-form-grid">
                <div className="june-form-span">
                  <label className="form-fun-label">Payment</label>
                  <div className="june-payment">
                    <div id="june-card-container" className="june-card-container" />
                    {loadingScript && <div className="june-payment-status">Loading secure payment form...</div>}
                    {cardError && <div className="june-payment-error">{cardError}</div>}
                    {(cardError || status === 'error') && (
                      <div className="june-payment-status">
                        <button
                          type="button"
                          className="june-link-button"
                          onClick={buildFallbackLink}
                          disabled={fallbackStatus.loading}
                        >
                          {fallbackStatus.loading ? 'Building hosted checkout...' : 'Use hosted Square checkout'}
                        </button>
                        {fallbackStatus.error && <div className="june-payment-error">{fallbackStatus.error}</div>}
                        {fallbackUrl && (
                          <div>
                            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer">Open hosted checkout</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {error && <div className="june-error">{error}</div>}
                <button
                  type="submit"
                  className="june-submit"
                  disabled={!canSubmit() || status === 'submitting' || status === 'success'}
                >
                  {status === 'submitting' ? 'Processing...' : `Book dinner for $${formatMoney(totalCents)}`}
                </button>
                <div className="required-note">
                  <span className="required-indicator">*</span>Required fields
                </div>
                <div className="june-form-footnote">
                  Payments are processed securely by Square. You will receive a confirmation email after booking.
                </div>
              </div>
            </section>
          </form>
        </section>

          <div className="june-info-box june-info-box-desktop">
            <h2>Dinner in your Home</h2>
            <p>
              We'll come over an hour before dinner time and prepare the meal in your kitchen. We'll use your pots and pans, and we'll bring anything specialized that we need. Your dinner price includes dishware and flatware, service, and cleanup when we're done. The experience is intended to feel like your home has transformed into a restaurant.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JunePage;
