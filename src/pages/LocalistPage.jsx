import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
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

// Fixed art positions come from hardcoded Cloudinary ids, not the gallery API.
// Same pattern the About panel and .ht-hero-photo already use: the API is for
// the shuffling grid at the foot of the page, where a slow response costs
// nothing, while anything above the fold has to be there on first paint.
// Assets live in the Cloudinary `localist` folder.
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dokyhfvyd/image/upload';

const bandSrc = (id, width) =>
  `${CLOUDINARY_BASE}/c_fill,g_auto,ar_16:6,w_${width},q_auto,f_auto/${id}`;

const PHOTOS = {
  // White asparagus and spring onions on the grill. Craft, heat, no faces —
  // the hero should look like the kitchen working, not like a product shot.
  hero: {
    id: 'yjrifvbjbwxeyo0wbxvx',
    alt: 'White asparagus and spring onions charring on a kitchen grill',
    caption: 'Spring alliums, Local Effort kitchen',
  },
  // Packed pickup bowls stacked beside a slab of focaccia. This is literally
  // what arrives when you are a member, which is why it sits with the benefits.
  pickup: {
    id: 'pijucgfeegmbms89sa0l',
    alt: 'Stacked lidded pickup bowls of salad next to a tray of dimpled focaccia',
    caption: 'One week of member pickups, waiting to go out',
  },
  // Parsley, asparagus, chives in flower, tarragon. The February-farm argument
  // in a single frame — it belongs to the cooperative section, not the menu.
  produce: {
    id: 'eziwhpekv6rqjubsxhwf',
    alt: 'Bunches of parsley, asparagus, flowering chives and tarragon laid out together',
    caption: 'A Minnesota spring, bought before it was planted',
  },
};

const FAQ_ITEMS = [
  {
    q: 'What does my membership actually pay for?',
    a: [
      'Wages and seeds. It pays cooks on a predictable schedule instead of whatever this week’s sales allow, and it lets us put money down with Minnesota farms in late winter — while they are deciding what to plant, which is the only moment that decision can be influenced.',
      'Buying local in August is shopping. Paying a farm in February is agriculture. Dues are what let us do the second one.',
    ],
  },
  {
    q: 'What makes this a cooperative and not just a small business with nice values?',
    a: [
      'Paperwork, which is the part that survives us. Local Effort is organized under Minnesota Chapter 308B, the state cooperative statute, and equity ownership is offered to every person who works here.',
      'Values are a promise a founder can quietly withdraw on a bad quarter. A filing is not.',
    ],
  },
  {
    q: 'Who should take the waived membership?',
    a: [
      'Anyone for whom $45 a month is a real question. Fixed income, SNAP or EBT, a student budget, between jobs, caring for someone, or a reason you would rather not type into a form — if the fee is a barrier, it is waived. We do not ask why and we do not ask for proof.',
      'If you are wondering whether it is meant for you, it is. It takes one click and you are as much a Localist as anyone paying full freight.',
    ],
  },
  {
    q: 'What is the 4% credit, and when does it land?',
    a: [
      'Paying members earn 4% of everything they spend with the co-op back as credit. It accrues on its own and posts to your account each quarter — spend it on pickup menus, meal prep, a cake, whatever you like. It does not expire.',
      'Monthly and annual memberships earn it. Waived memberships do not, which is the only line anywhere between the two.',
    ],
  },
  {
    q: 'Monthly or annual — what’s the difference?',
    a: [
      'Only the billing. Monthly is $45 and renews until you stop it. Annual is $375 once, which is $165 under twelve months of monthly — worth it if you already know you are staying.',
    ],
  },
  {
    q: 'How does billing work?',
    a: [
      'You pay on Square when you join, and Square handles it from there. Monthly renews on the same date each month; annual renews once a year. Card, Apple Pay, Google Pay, and Cash App Pay all work.',
      'Every charge emails you a receipt, so a renewal never arrives as a surprise on a statement.',
    ],
  },
  {
    q: 'Can I cancel?',
    a: [
      'Any time, in one message — text or email and we stop the renewal. No retention call, no form designed to be tiring.',
      'You keep the rest of the period you already paid for, and any credit you have earned stays spendable after you go.',
    ],
  },
  {
    q: 'Do waived members get the same food?',
    a: [
      'The same menus, the same pickup windows, the same perks, plus a low-cost menu that only waived members see. Nobody at a pickup can tell which kind of Localist you are, and we consider that a design requirement rather than a courtesy.',
    ],
  },
  {
    q: 'Why do I have to be a member to get meal prep?',
    a: [
      'Because cooking for a household every week is a standing relationship, not a transaction, and we plan the buying months ahead. Knowing who we cook for is what lets us commit to a farm in advance and staff a kitchen honestly.',
      'So every meal prep customer is a Localist first. It is also the reason we will never have a surge price or a busy-season markup.',
    ],
  },
  {
    q: 'Can I put money into the co-op beyond dues?',
    a: [
      'Yes — members can invest directly through our 308B offerings: a kitchen equipment note, a fund that pays Minnesota farms at the front of the season, or a patronage-linked capital account that makes you part-owner of the balance sheet.',
      'They live on your membership page once you join. Nothing is ever charged from that page, and each offering states plainly what it can and cannot return.',
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
  const [membershipUrl, setMembershipUrl] = useState('/hub/membership');
  const [images, setImages] = useState([]);
  // Set when Square bounces the buyer back after a completed checkout
  // (?joined=monthly|annual). Distinguishes "you have paid" from "we have your
  // details" — two very different things to say to someone.
  const [paidTier, setPaidTier] = useState('');
  const formRef = useRef(null);
  const pricingRef = useRef(null);
  const waiverRef = useRef(null);

  useEffect(() => {
    const joined = new URLSearchParams(window.location.search).get('joined');
    if (joined === 'monthly' || joined === 'annual') {
      setPaidTier(joined);
      setTier(joined);
      setStatus('success');
      // Drop the param so a refresh or a shared link is not a false receipt.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

      // Paid tiers get a Square-hosted checkout that takes the first payment and
      // starts the subscription in one step. Leave `status` on 'submitting' so
      // the button stays disabled through the redirect — a form that flips to
      // "done" and then navigates invites a second submit.
      if (data?.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      // No checkout: waived membership, or the plans aren't configured yet.
      // The API returns the member's own membership page; fall back to the
      // relative path so the link is never missing.
      setMembershipUrl(data?.membershipUrl || '/hub/membership');
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
            Localists are the members of a worker-owned food cooperative. Every
            person who cooks here is offered equity ownership in the business —
            that is the structure, not a perk. Your membership is what makes it
            hold: it pays cooks fairly on a predictable schedule, and it lets us
            commit money to Minnesota farms early enough to change what they
            plant.
          </p>
          <p className="lm-hero-copy">
            You get the front of the line for it — member pickup menus, perks
            along the way, and 4% of your spending back every quarter. It is also
            the front door to everything else we do: membership is required to
            become a meal prep customer.
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

      {/* The kitchen, before any of the asking starts */}
      <figure className="lm-band">
        <img
          src={bandSrc(PHOTOS.hero.id, 1600)}
          srcSet={`${bandSrc(PHOTOS.hero.id, 800)} 800w, ${bandSrc(PHOTOS.hero.id, 1600)} 1600w, ${bandSrc(PHOTOS.hero.id, 2200)} 2200w`}
          sizes="100vw"
          alt={PHOTOS.hero.alt}
          width={1600}
          height={600}
          fetchPriority="high"
        />
        <figcaption className="lm-band-caption">{PHOTOS.hero.caption}</figcaption>
      </figure>

      {/* Pricing */}
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
          <div className="lm-split">
            <ul className="lm-benefits">
            <li className="lm-benefit">
              <p className="lm-benefit-title">First look at every pickup menu</p>
              <p className="lm-benefit-copy">
                Members see the week&apos;s menu and order from it before it goes
                anywhere else. The good weeks are usually spoken for by the time
                it does.
              </p>
            </li>
            <li className="lm-benefit">
              <p className="lm-benefit-title">The door to meal prep</p>
              <p className="lm-benefit-copy">
                Weekly cooking for your household is members-only. It is the one
                thing membership unlocks outright rather than improves.
              </p>
            </li>
            <li className="lm-benefit">
              <p className="lm-benefit-title">4% back, every quarter</p>
              <p className="lm-benefit-copy">
                Paying members earn 4% of everything they spend with the co-op as
                credit. It posts quarterly, it does not expire, and it spends like
                money on anything we make.
              </p>
            </li>
            <li className="lm-benefit">
              <p className="lm-benefit-title">The things that never make the menu</p>
              <p className="lm-benefit-copy">
                Something extra in the bag, the first taste of a dish we are still
                arguing about in the kitchen, the occasional unannounced surprise
                at pickup.
              </p>
            </li>
            <li className="lm-benefit">
              <p className="lm-benefit-title">A payroll where every cook is offered ownership</p>
              <p className="lm-benefit-copy">
                Under Minnesota Chapter 308B, equity is open to every person who
                works here. Your dues fund the wages that make that ownership
                worth holding rather than a line in a handbook.
              </p>
            </li>
            <li className="lm-benefit">
              <p className="lm-benefit-title">A place on the balance sheet, if you want one</p>
              <p className="lm-benefit-copy">
                Members can invest directly through our 308B offerings — including
                the fund that pays Minnesota farms at the front of the season,
                before anything is in the ground.
              </p>
            </li>
            </ul>
            <figure className="lm-split-photo">
              <img
                src={`${CLOUDINARY_BASE}/c_fill,g_auto,ar_3:4,w_700,q_auto,f_auto/${PHOTOS.pickup.id}`}
                alt={PHOTOS.pickup.alt}
                width={700}
                height={933}
                loading="lazy"
                decoding="async"
              />
              <figcaption>{PHOTOS.pickup.caption}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* The produce the argument below is actually about, ahead of the argument */}
      <figure className="lm-band">
        <img
          src={bandSrc(PHOTOS.produce.id, 1600)}
          srcSet={`${bandSrc(PHOTOS.produce.id, 800)} 800w, ${bandSrc(PHOTOS.produce.id, 1600)} 1600w`}
          sizes="100vw"
          alt={PHOTOS.produce.alt}
          width={1600}
          height={600}
          loading="lazy"
          decoding="async"
        />
        <figcaption className="lm-band-caption">{PHOTOS.produce.caption}</figcaption>
      </figure>

      {/* Why the model — the argument, made once, in the middle */}
      <section className="lm-section">
        <div className="lm-container">
          <p className="lm-eyebrow">Why a cooperative</p>
          <h2 className="lm-section-title">
            Who owns a kitchen decides what comes out of it.
          </h2>
          <div className="lm-argument">
            <p>
              Every kitchen meets the same month eventually: costs up, revenue
              flat. There are only two fast levers. Pay the people cooking less,
              or buy cheaper and hope nobody notices at the table. Both get pulled
              constantly in this industry, and both get pulled for the same
              reason — the people who own the business are not the people
              standing at the stove.
            </p>
            <p>
              We took the levers away by changing the ownership. Local Effort is
              filed under Minnesota Chapter 308B, and equity is offered to every
              person who works here. A cook with a stake in the kitchen does not
              vote to cut their own wage, and does not quietly swap the good
              butter to protect a margin they share in.
            </p>
            <p>
              It changes what we buy, too. Telling a farmer in February that we
              will take the crop is more expensive and far riskier than buying the
              same vegetable on the spot market in August. It is also the only
              version of &ldquo;local&rdquo; that changes what gets planted. The
              August version just relabels food that already exists.
            </p>
            <p>
              None of this is our invention. Cooperatives have run for a century,
              and the reason there are so few in food is that everyone is waiting
              for someone else to prove the numbers work. We would rather be the
              proof than the audience.
            </p>
          </div>
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
            Details, then payment, then you&apos;re a member — one pass, about a
            minute. Paid memberships finish on Square&apos;s checkout (card, Apple
            Pay, Google Pay, or Cash App Pay) and renew on their own until you
            stop them. Claiming the waived membership skips payment entirely.
          </p>

          <div className="lm-form-wrap">
            {status === 'success' ? (
              <div className="le-checkout-success">
                <div className="le-checkout-success-title">
                  {paidTier ? 'You’re in. Welcome, Localist.' : 'Welcome, Localist'}
                </div>
                <p className="le-checkout-success-copy">
                  {paidTier
                    ? `Payment went through and your ${paidTier === 'annual' ? 'annual' : 'monthly'} membership is live — Square has emailed the receipt, and it renews ${paidTier === 'annual' ? 'once a year' : 'on this date each month'} until you tell us to stop.`
                    : tier === 'waived'
                      ? 'Your waived membership is claimed — nothing to pay, and no follow-up questions about it. You’re a Localist on the same terms as everyone else.'
                      : 'We have your details. Someone from the co-op will reach out within a day to finish setting up your membership.'}
                </p>
                <div className="lm-success-next">
                  <p className="lm-success-next-title">Your membership page</p>
                  <p className="lm-success-next-copy">
                    Everything about your membership lives here: your perks, what
                    you&apos;ve spent and the credit it earned, notes from us, and
                    the 308B member offerings if you ever want to put capital in.
                  </p>
                  <a className="lm-btn" href={membershipUrl}>
                    Open my membership page
                  </a>
                  <p className="lm-waiver-fineprint">
                    Bookmark it. You&apos;ll sign in with the email you used above.
                  </p>
                </div>
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
                      ? tier === 'waived'
                        ? 'Claiming…'
                        : 'Taking you to checkout…'
                      : tier === 'waived'
                        ? 'Claim free membership'
                        : tier === 'annual'
                          ? 'Continue to payment — $375/year'
                          : tier === 'monthly'
                            ? 'Continue to payment — $45/month'
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
          <div className="lm-container">
            {/* No hover-scale on these. Every card lifting 2% on hover is a
                pattern, not a response — and the API already hands back real
                dimensions, so they are used to reserve space instead. */}
            <div className="lm-gallery-grid">
              {images.map((img, idx) => (
                <figure className="lm-gallery-item" key={img.asset_id || img.public_id}>
                  <img
                    src={img.thumbnail_url}
                    alt={img.context?.alt || `Food from a recent Local Effort pickup menu (${idx + 1})`}
                    width={img.width || undefined}
                    height={img.height || undefined}
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default LocalistPage;
