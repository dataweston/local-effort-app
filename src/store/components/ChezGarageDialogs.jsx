import React, { useEffect, useRef, useState } from 'react';

import { useSquareCard } from '../../hooks/useSquareCard';

const ABOUT_IMAGE_PATH = '/images/chez-garage-about.jpg';
const DEPOSIT_CENTS = 20000;
const DEPOSIT_LABEL = '$200';

const AT_HOME_DESCRIPTION = "Bring Chez Garage to your Garage. We'll send a chef, an oven, and whatever other tools and equipment necessary to help you throw your own little block party. Chez Garage is intended to serve a maximum of 40 guests, reach out directly before booking if you expect a larger group. $200 is the deposit cost to hold the date. Estimated final costs will depend on your menu choices, but anticipate $25-$45/person. A chef will reach out directly to help you make your menu and make your event a success.";

const initialForm = {
  date: '',
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: 'MN',
  postal: '',
  guestCount: '',
  notes: '',
  website: '',
};

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const createAttemptId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `chez-home-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const DialogShell = ({ labelledBy, onClose, children, wide = false }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const dialog = closeRef.current?.closest('[role="dialog"]');
        const focusable = Array.from(dialog?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ) || []).filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="le-chez-dialog-overlay" role="presentation">
      <button
        type="button"
        className="le-chez-dialog-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <section
        className={`le-chez-dialog${wide ? ' le-chez-dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <button
          ref={closeRef}
          type="button"
          className="le-chez-dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          Close
        </button>
        {children}
      </section>
    </div>
  );
};

const AboutDialog = ({ onClose }) => (
  <DialogShell labelledBy="chez-about-title" onClose={onClose}>
    <img
      className="le-chez-about-image"
      src={ABOUT_IMAGE_PATH}
      alt="A small green garage surrounded by summer trees and tall grass"
      width="640"
      height="427"
      loading="eager"
      decoding="async"
    />
    <div className="le-chez-dialog-content">
      <p className="le-chez-dialog-eyebrow">Local Effort popup</p>
      <h2 id="chez-about-title">What is Chez Garage?</h2>
      <p>
        Chez Garage is a super-casual popup concept by Local Effort. Have your
        friends over for pizza or barbeque or other kinds of casual summer
        good-times food, and send them home with awesome chef-inspired treats
        and prepared meals for the week.
      </p>
    </div>
  </DialogShell>
);

const AtHomeDialog = ({ onClose }) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const attemptIdRef = useRef(createAttemptId());
  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer } = useSquareCard(
    '#chez-home-card-container',
    !confirmation,
    [confirmation]
  );

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.date || !form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please enter your date and contact information.');
      return;
    }
    if (!form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.postal.trim()) {
      setError('Please enter the address where you would like to host Chez Garage.');
      return;
    }
    if (!cardLoaded) {
      setError(cardError || 'The payment form is still loading.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await tokenize();
      const verificationToken = await verifyBuyer(token, {
        amount: (DEPOSIT_CENTS / 100).toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          addressLines: [form.line1.trim(), form.line2.trim()].filter(Boolean),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postal.trim(),
          countryCode: 'US',
        },
      });

      const response = await fetch('/api/store/chez-garage-at-home-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          token,
          verificationToken,
          checkoutAttemptId: attemptIdRef.current,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to complete your booking.');
      if (data.suppressed) throw new Error('Unable to complete your booking.');
      setConfirmation({
        paymentId: data.paymentId,
        email: form.email.trim(),
        date: form.date,
        receiptSent: data.receiptSent === true,
      });
    } catch (submitError) {
      setError(submitError?.message || 'Unable to complete your booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell labelledBy="chez-home-title" onClose={onClose} wide>
      <div className="le-chez-dialog-content le-chez-home-content">
        <p className="le-chez-dialog-eyebrow">Private event deposit</p>
        <h2 id="chez-home-title">Chez Garage at your home</h2>

        {confirmation ? (
          <div className="le-chez-confirmation" role="status">
            <h3>Your date is reserved.</h3>
            <p>
              We received your {DEPOSIT_LABEL} deposit for {confirmation.date}.
              {confirmation.receiptSent
                ? ` A confirmation was sent to ${confirmation.email}.`
                : ' Please save the payment reference below.'}
              {' '}A chef will reach out to plan your menu and event.
            </p>
            <p className="le-chez-payment-reference">
              Payment reference: {confirmation.paymentId}
            </p>
          </div>
        ) : (
          <>
            <p className="le-chez-home-description">{AT_HOME_DESCRIPTION}</p>

            <form className="le-chez-home-form" onSubmit={submit}>
              <label className="le-chez-field le-chez-field--full">
                <span>Event date</span>
                <input
                  type="date"
                  name="date"
                  min={todayIso()}
                  value={form.date}
                  onChange={updateField}
                  required
                />
                <small>Every date from today onward is available to request.</small>
              </label>

              <label className="le-chez-field">
                <span>Name</span>
                <input name="name" autoComplete="name" value={form.name} onChange={updateField} required />
              </label>
              <label className="le-chez-field">
                <span>Email</span>
                <input type="email" name="email" autoComplete="email" value={form.email} onChange={updateField} required />
              </label>
              <label className="le-chez-field">
                <span>Phone</span>
                <input type="tel" name="phone" autoComplete="tel" value={form.phone} onChange={updateField} required />
              </label>
              <label className="le-chez-field">
                <span>Estimated guests</span>
                <input type="number" name="guestCount" min="1" max="999" inputMode="numeric" value={form.guestCount} onChange={updateField} />
              </label>

              <label className="le-chez-field le-chez-field--full">
                <span>Event address</span>
                <input name="line1" autoComplete="address-line1" placeholder="Street address" value={form.line1} onChange={updateField} required />
              </label>
              <label className="le-chez-field le-chez-field--full">
                <span>Apartment, suite, or unit (optional)</span>
                <input name="line2" autoComplete="address-line2" value={form.line2} onChange={updateField} />
              </label>
              <label className="le-chez-field">
                <span>City</span>
                <input name="city" autoComplete="address-level2" value={form.city} onChange={updateField} required />
              </label>
              <div className="le-chez-address-row">
                <label className="le-chez-field">
                  <span>State</span>
                  <input name="state" autoComplete="address-level1" maxLength="2" value={form.state} onChange={updateField} required />
                </label>
                <label className="le-chez-field">
                  <span>ZIP</span>
                  <input name="postal" autoComplete="postal-code" inputMode="numeric" value={form.postal} onChange={updateField} required />
                </label>
              </div>

              <label className="le-chez-field le-chez-field--full">
                <span>Anything we should know? (optional)</span>
                <textarea name="notes" rows="4" value={form.notes} onChange={updateField} />
              </label>

              <label className="le-chez-honeypot" aria-hidden="true">
                Website
                <input name="website" tabIndex="-1" autoComplete="off" value={form.website} onChange={updateField} />
              </label>

              <div className="le-chez-payment le-chez-field--full">
                <span className="le-chez-payment-label">Card details</span>
                <div id="chez-home-card-container" className="le-chez-card-container" />
                {loadingScript && <p className="le-chez-form-note">Loading secure payment form…</p>}
                {cardError && <p className="le-chez-form-error" role="alert">{cardError}</p>}
              </div>

              {error && <p className="le-chez-form-error le-chez-field--full" role="alert">{error}</p>}

              <div className="le-chez-checkout-total le-chez-field--full">
                <span>Date-hold deposit</span>
                <strong>{DEPOSIT_LABEL}</strong>
              </div>
              <button
                type="submit"
                className="le-chez-submit le-chez-field--full"
                disabled={submitting || loadingScript || !cardLoaded || Boolean(cardError)}
              >
                {submitting ? 'Processing…' : `Pay ${DEPOSIT_LABEL} deposit`}
              </button>
              <p className="le-chez-form-note le-chez-field--full">
                Secure payment by Square. This deposit holds your requested date
                and is applied toward your final event cost.
              </p>
            </form>
          </>
        )}
      </div>
    </DialogShell>
  );
};

const ChezGarageDialogs = () => {
  const [activeDialog, setActiveDialog] = useState(null);

  return (
    <>
      <nav className="le-chez-dialog-links" aria-label="Learn about Chez Garage">
        <button type="button" onClick={() => setActiveDialog('about')}>
          What is chez garage?
        </button>
        <button type="button" onClick={() => setActiveDialog('home')}>
          Chez Garage at your home
        </button>
      </nav>

      {activeDialog === 'about' && <AboutDialog onClose={() => setActiveDialog(null)} />}
      {activeDialog === 'home' && <AtHomeDialog onClose={() => setActiveDialog(null)} />}
    </>
  );
};

export default ChezGarageDialogs;
