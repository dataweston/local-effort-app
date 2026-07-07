import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/le-checkout.css';
import '../styles/localist-membership.css';

const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, 10);
const formatPhone = (value) => {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const TIERS = {
  monthly: { label: 'Monthly', sub: '$45/mo' },
  annual: { label: 'Annual', sub: '$375/yr' },
  waived: { label: 'Cost waived', sub: '$0' },
};

const FAQ_ITEMS = [
  {
    q: 'Who should claim the waived membership?',
    a: [
      "Anyone for whom $45 a month is a real question. Fixed income, SNAP or EBT, a student budget, between jobs, caring for family, or any reason at all — if the fee is a barrier, it's waived. You don't owe us an explanation and we will never ask for proof.",
      "If you're wondering whether this is for you, it is. Claiming it takes one click, and you'll be as much a Localist as anyone else.",
    ],
  },
  {
    q: 'What is the 4% credit, and when does it land?',
    a: [
      'Paying members earn 4% of everything they spend with the co-op back as credit. It accrues automatically and lands in your account every quarter — spend it on menus, meal prep, whatever you like.',
      'Only paid memberships (monthly or annual) earn the credit; waived memberships do not.',
    ],
  },
  {
    q: 'Monthly or annual — what’s the difference?',
    a: [
      'Same membership either way. Monthly is $45 and you can stop anytime. Annual is $375 up front — that’s $165 less than twelve months of monthly — for people who know they’re staying a while.',
    ],
  },
  {
    q: 'How do I pay?',
    a: [
      'We bill through Square. After you sign up, your invoice arrives by email and can be paid by bank transfer (ACH) or card. ACH is the way to go if you can — card processors take close to 3% of every charge, and ACH keeps that money in the food instead.',
    ],
  },
  {
    q: 'Can I cancel?',
    a: [
      'Yes, anytime, no hoops. Text or email us and we’ll stop your membership at the end of the period you’ve paid for. Any credit you’ve earned stays spendable.',
    ],
  },
  {
    q: 'Do waived members get the same food access?',
    a: [
      'Yes. Waived Localists get the same subscriber menus, the same pickup windows, and the same perks and treats as everyone else — plus access to an exclusive low-cost menu. The only difference is the 4% quarterly credit, which is reserved for paying members.',
    ],
  },
  {
    q: 'Why is membership required for meal prep?',
    a: [
      'We’re a workers cooperative, not a delivery app. Cooking weekly for a household is a relationship, and membership is how we keep that circle steady — it lets the co-op plan, buy from local farms with confidence, and pay our worker-owners fairly. Every meal prep customer is a Localist first.',
    ],
  },
];

const buildStructuredData = () => [
  {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Localist Membership',
    description:
      'Membership in Local Effort Cooperative, a Minneapolis workers cooperative. Localists get subscriber access to pickup menus, small perks along the way, and 4% of spending back as credit each quarter. Membership is required to become a meal prep customer, and the cost is waived for anyone who needs it.',
    url: `${SITE_URL}/localist`,
    brand: { '@type': 'Organization', name: 'Local Effort Cooperative' },
    offers: [
      {
        '@type': 'Offer',
        name: 'Localist Membership — Monthly',
        price: '45.00',
        priceCurrency: 'USD',
        url: `${SITE_URL}/localist`,
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '45.00',
          priceCurrency: 'USD',
          billingDuration: 1,
          unitCode: 'MON',
        },
      },
      {
        '@type': 'Offer',
        name: 'Localist Membership — Annual',
        price: '375.00',
        priceCurrency: 'USD',
        url: `${SITE_URL}/localist`,
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '375.00',
          priceCurrency: 'USD',
          billingDuration: 1,
          unitCode: 'ANN',
        },
      },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a.join(' ') },
    })),
  },
];

const LocalistPage = () => {
  const [tier, setTier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const formRef = useRef(null);
  const pricingRef = useRef(null);
  const waiverRef = useRef(null);

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

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const chooseTier = (nextTier) => {
    setTier(nextTier);
    scrollTo(formRef);
  };

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    Boolean(tier) &&
    name.trim().length > 0 &&
    emailLooksValid &&
    normalizePhone(phone).length === 10 &&
    status !== 'submitting';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('submitting');
    setError('');

    try {
      const response = await fetch('/api/localist/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          website,
          name: name.trim(),
          email: email.trim(),
          tier,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Signup failed.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="le-checkout-page lm-page localist-page">
      <Helmet>
        <title>Become a Localist — Membership | {SITE_NAME}</title>
        <meta
          name="description"
          content="Become a Localist: membership in a Minneapolis workers cooperative. $45/month or $375/year — waived for anyone who needs it. Members get pickup menus, perks, and 4% back as credit every quarter."
        />
        <link rel="canonical" href={`${SITE_URL}/localist`} />
        <script type="application/ld+json">
          {JSON.stringify(buildStructuredData())}
        </script>
      </Helmet>

      <nav className="le-checkout-nav">
        <a className="le-checkout-back" href="/">← Home</a>
      </nav>

      {/* Hero — mission first */}
      <section className="lm-hero">
        <div className="lm-container">
          <p className="lm-eyebrow">Local Effort Cooperative — Minneapolis</p>
          <h1 className="lm-hero-title">Become a Localist.</h1>
          <p className="lm-hero-copy">
            Localists are the members of our workers cooperative. Your membership
            keeps a small team of cooks employed at fair wages, keeps our buying
            local, and puts you at the front of the line — subscriber pickup
            menus, treats along the way, and money back every quarter. It&apos;s
            also the front door to everything else we do: membership is required
            to become a meal prep customer.
          </p>
          <div className="lm-hero-actions">
            <button type="button" className="lm-btn" onClick={() => scrollTo(pricingRef)}>
              See membership options
            </button>
            <button type="button" className="lm-btn lm-btn--ghost" onClick={() => scrollTo(waiverRef)}>
              Cost is a barrier? Join free
            </button>
          </div>
        </div>
      </section>

      {/* Pricing — SaaS-style, side by side */}
      <section className="lm-section" ref={pricingRef}>
        <div className="lm-container">
          <p className="lm-eyebrow">Membership</p>
          <h2 className="lm-section-title">One membership, two ways to pay.</h2>
          <p className="lm-section-sub">
            Same access either way. Pick the rhythm that fits.
          </p>
          <div className="lm-tiers">
            <div className="lm-tier">
              <p className="lm-tier-name">Monthly</p>
              <div className="lm-tier-price">
                <span className="lm-tier-amount">$45</span>
                <span className="lm-tier-per">/ month</span>
              </div>
              <p className="lm-tier-note">
                Full membership, month to month. Cancel anytime.
              </p>
              <button type="button" className="lm-btn" onClick={() => chooseTier('monthly')}>
                Join monthly
              </button>
            </div>
            <div className="lm-tier lm-tier--featured">
              <span className="lm-tier-badge">Save $165</span>
              <p className="lm-tier-name">Annual</p>
              <div className="lm-tier-price">
                <span className="lm-tier-amount">$375</span>
                <span className="lm-tier-per">/ year</span>
              </div>
              <p className="lm-tier-note">
                Twelve months for less than nine — $375 once instead of $540.
              </p>
              <button type="button" className="lm-btn" onClick={() => chooseTier('annual')}>
                Join annual
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="lm-section">
        <div className="lm-container">
          <p className="lm-eyebrow">What you get</p>
          <h2 className="lm-section-title">Being a Localist</h2>
          <ul className="lm-benefits">
            <li className="lm-benefit">
              <span className="lm-benefit-marker">01</span>
              <span className="lm-benefit-body">
                <strong>Subscriber access to pickup menus.</strong> Members see and
                order from our weekly pickup menus before anyone else.
              </span>
            </li>
            <li className="lm-benefit">
              <span className="lm-benefit-marker">02</span>
              <span className="lm-benefit-body">
                <strong>Small perks and treats along the way.</strong> Extras in
                the bag, first tastes of new dishes, the occasional surprise.
              </span>
            </li>
            <li className="lm-benefit">
              <span className="lm-benefit-marker">03</span>
              <span className="lm-benefit-body">
                <strong>4% back as credit, every quarter.</strong> Paying members
                earn 4% of their spending back as co-op credit each quarter.
              </span>
            </li>
            <li className="lm-benefit">
              <span className="lm-benefit-marker">04</span>
              <span className="lm-benefit-body">
                <strong>The door to meal prep.</strong> Membership is required to
                become a meal prep customer — Localists are who we cook for.
              </span>
            </li>
            <li className="lm-benefit">
              <span className="lm-benefit-marker">05</span>
              <span className="lm-benefit-body">
                <strong>A cooperative that holds up.</strong> Your dues pay
                worker-owners fairly and keep our purchasing with local farms.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Waiver — equal dignity */}
      <section className="lm-section" ref={waiverRef}>
        <div className="lm-container">
          <div className="lm-waiver">
            <p className="lm-eyebrow" style={{ marginBottom: 0 }}>Cost is a barrier?</p>
            <h2 className="lm-waiver-title">Then membership is free.</h2>
            <p className="lm-waiver-copy">
              Waived Localists get the same menus, the same pickups, and the same
              perks as everyone else, plus an exclusive low-cost menu. The only
              thing that differs is the 4% quarterly credit, which is reserved
              for paying members.
            </p>
            <button type="button" className="lm-btn" onClick={() => chooseTier('waived')}>
              Claim free membership
            </button>
            <p className="lm-waiver-fineprint">
              If you&apos;re wondering whether this is meant for you, it is.
            </p>
          </div>
        </div>
      </section>

      {/* Signup form */}
      <section className="lm-section" ref={formRef}>
        <div className="lm-container">
          <p className="lm-eyebrow">Sign up</p>
          <h2 className="lm-section-title">Become a Localist</h2>
          <p className="lm-section-sub">
            No payment is taken on this page. We bill through Square — your
            invoice can be paid by bank transfer (ACH), which keeps processing
            fees out of the food, or by card. A real person from the co-op will
            reach out within a day to confirm your membership and sort the rest.
          </p>

          <div className="lm-form-wrap">
            {status === 'success' ? (
              <div className="le-checkout-success">
                <div className="le-checkout-success-title">Welcome, Localist</div>
                <p className="le-checkout-success-copy">
                  {tier === 'waived'
                    ? 'Your free membership claim is in — no payment, no follow-up questions about it.'
                    : `Your ${tier === 'annual' ? 'annual' : 'monthly'} membership request is in. Your Square invoice follows by email — paying by bank transfer (ACH) keeps processing fees out of the food.`}{' '}
                  A real human from the co-op will text or email you within a day
                  to confirm and get you set up.
                </p>
              </div>
            ) : (
              <form className="le-checkout-form" onSubmit={handleSubmit} noValidate>
                <div className="le-checkout-section">
                  <p className="le-checkout-section-title">Membership</p>
                  <div className="lm-tier-pills" role="group" aria-label="Choose membership option">
                    {Object.entries(TIERS).map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        className={`lm-tier-pill ${tier === key ? 'is-selected' : ''}`}
                        aria-pressed={tier === key}
                        onClick={() => setTier(key)}
                        disabled={status === 'submitting'}
                      >
                        {meta.label}
                        <span className="lm-tier-pill-sub">{meta.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="le-checkout-section">
                  <p className="le-checkout-section-title">Your details</p>

                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="localist-name">Name</label>
                    <input
                      id="localist-name"
                      type="text"
                      autoComplete="name"
                      className="le-checkout-input"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={status === 'submitting'}
                    />
                  </div>

                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="localist-email">Email</label>
                    <input
                      id="localist-email"
                      type="email"
                      autoComplete="email"
                      className="le-checkout-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={status === 'submitting'}
                    />
                  </div>

                  <div className="le-checkout-field">
                    <label className="le-checkout-label" htmlFor="localist-phone">Phone number</label>
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

                  {error && <div className="le-checkout-error">{error}</div>}

                  <button type="submit" className="le-checkout-submit" disabled={!canSubmit}>
                    {status === 'submitting'
                      ? 'Sending...'
                      : tier === 'waived'
                        ? 'Claim free membership'
                        : tier === 'annual'
                          ? 'Join — $375/year'
                          : tier === 'monthly'
                            ? 'Join — $45/month'
                            : 'Choose an option above'}
                  </button>

                  <p className="le-checkout-footnote">
                    US numbers only. We&apos;ll only use this to run your
                    membership — no spam, and you can reply STOP to any text.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lm-section">
        <div className="lm-container">
          <p className="lm-eyebrow">Questions</p>
          <h2 className="lm-section-title">FAQ</h2>
          <div>
            {FAQ_ITEMS.map((item) => (
              <details className="lm-faq-item" key={item.q}>
                <summary>{item.q}</summary>
                <div className="lm-faq-answer">
                  {item.a.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lm-final">
        <div className="lm-container">
          <h2 className="lm-final-title">Eat from your cooperative.</h2>
          <p className="lm-final-copy">
            Join as a Localist and the co-op cooks for you every week — and if
            money is tight, join anyway.
          </p>
          <div className="lm-hero-actions">
            <button type="button" className="lm-btn" onClick={() => scrollTo(pricingRef)}>
              See membership options
            </button>
            <button type="button" className="lm-btn lm-btn--ghost" onClick={() => chooseTier('waived')}>
              Claim free membership
            </button>
          </div>
        </div>
      </section>

      {/* Gallery — from recent pickup menus */}
      {images.length > 0 && (
        <section className="lm-gallery" style={{ borderTop: '1px solid #e8e8e8' }}>
          <div className="lm-container">
            <p className="lm-eyebrow">From recent pickup menus</p>
          </div>
          <div className="px-6 lg:px-8 max-w-6xl mx-auto">
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
        </section>
      )}
    </div>
  );
};

export default LocalistPage;
