import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/le-checkout.css';

const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);
const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const LocalistPage = () => {
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch('/api/localist/images');
        const data = await res.json();
        setImages(data.images || []);
      } catch (err) {
        console.error('Failed to fetch gallery:', err);
      }
    };
    fetchImages();
  }, []);

  const canSubmit = normalizePhone(phone).length === 10 && status !== 'submitting';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setError('');

    try {
      const response = await fetch('/api/localist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, website }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Subscription failed.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="le-checkout-page localist-page">
      <Helmet>
        <title>Localist — Weekly Meals Text List | {SITE_NAME}</title>
        <meta
          name="description"
          content="Sign up for the Localist text list. Every Monday we'll text you a limited menu of salads and hot bowls for Tuesday and Wednesday pickup in North Minneapolis."
        />
        <link rel="canonical" href={`${SITE_URL}/localist`} />
      </Helmet>

      <nav className="le-checkout-nav">
        <a className="le-checkout-back" href="/">← Home</a>
      </nav>

      <div className="le-checkout-layout">

        {/* Left: context */}
        <div className="le-checkout-context">
          <div>
            <h1 className="le-checkout-product-title">Localist</h1>
          </div>

          <div className="le-checkout-product-meta">
            <h2 style={{ fontSize: '1.25rem', lineHeight: 1.3, marginTop: '1.5rem', marginBottom: '1rem', color: '#111', fontWeight: 600 }}>
              Every Monday — we'll text you a limited menu of low-cost salads and hot bowls.
              You'll pick up on Tuesday and Wednesday at Neon Collective Kitchens in North Minneapolis.
            </h2>
          </div>
        </div>

        {/* Right: form */}
        <div className="le-checkout-form-panel">
          {status === 'success' ? (
            <div className="le-checkout-success">
              <div className="le-checkout-success-title">You're on the list</div>
              <p className="le-checkout-success-copy">
                Expect your first text on Monday. Reply STOP anytime to unsubscribe.
              </p>
            </div>
          ) : (
            <form className="le-checkout-form" onSubmit={handleSubmit} noValidate>
              <div className="le-checkout-section">
                <p className="le-checkout-section-title">Subscribe</p>

                <div className="le-checkout-field">
                  <label className="le-checkout-label" htmlFor="localist-phone">
                    Phone number
                  </label>
                  <input
                    id="localist-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="le-checkout-input"
                    placeholder="(612) 555-0100"
                    value={formatPhone(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={status === 'submitting'}
                  />
                </div>

                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="hidden"
                  style={{ display: 'none' }}
                />

                {error && (
                  <div className="le-checkout-error">{error}</div>
                )}

                <button
                  type="submit"
                  className="le-checkout-submit"
                  disabled={!canSubmit}
                >
                  {status === 'submitting' ? 'Saving...' : 'Text me the menu'}
                </button>

                <p className="le-checkout-footnote">
                  US numbers only. Reply STOP to unsubscribe at any time.
                </p>
              </div>
            </form>
          )}
        </div>

      </div>

      {images.length > 0 && (
        <div className="px-6 py-12 lg:px-8 lg:py-16 max-w-6xl mx-auto">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {images.map((img, idx) => (
              <motion.div
                key={img.asset_id || img.public_id}
                className="mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
                whileHover={{ scale: 1.02 }}
              >
                <img
                  src={img.thumbnail_url}
                  alt={img.context?.alt || `Localist menu item ${idx + 1}`}
                  loading="lazy"
                  className="rounded-lg w-full h-auto"
                  decoding="async"
                  fetchPriority={idx < 2 ? 'high' : 'auto'}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalistPage;
