// src/pages/LocalistPage.jsx
//
// /localist — membership in the cooperative. One job: become a Localist, and
// pay for it in the same pass.
//
// Material system: .ht-scope--localist in src/styles/home-tabs.css (olive
// accent, hand-ruled slip), vertical rhythm from src/styles/service-page.css,
// same as /small-events and /weekly-meals. Direction:
// src/components/fullpage/HOME-TABS-DESIGN.md
//
// This page was previously off-system: mono all-caps eyebrows over every
// heading, SaaS pricing cards with a "Save $165" badge, boxed le-checkout
// inputs, and 01–06 markers on the benefits list. All of those are the exact
// patterns HOME-TABS-DESIGN.md records as removed everywhere else.
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';
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
export const getLocalistReturnState = (search = '') => {
  const params = new URLSearchParams(search);
  const joined = params.get('joined');
  const invite = params.get('invite') || '';
  const validInvite = /^[A-Za-z0-9_-]{20,200}$/.test(invite) ? invite : '';
  const confirmationTier = joined === 'monthly' || joined === 'annual' ? joined : '';
  return {
    confirmationTier,
    status: confirmationTier ? 'confirmation' : 'idle',
    membershipUrl: `/hub/membership${validInvite ? `?invite=${encodeURIComponent(validInvite)}` : ''}`,
  };
};

// Fixed art positions come from hardcoded Cloudinary ids, not the gallery API.
// Same pattern as .ht-hero-photo elsewhere: the API is for the shuffling grid at
// the foot of the page, where a slow response costs nothing, while anything
// above the fold has to be there on first paint. Assets: Cloudinary `localist`.
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dokyhfvyd/image/upload';

const bandSrc = (id, width) =>
  `${CLOUDINARY_BASE}/c_fill,g_auto,ar_16:6,w_${width},q_auto,f_auto/${id}`;

const PHOTOS = {
  hero: {
    id: 'yjrifvbjbwxeyo0wbxvx',
    alt: 'White asparagus and spring onions charring on a kitchen grill',
  },
  pickup: {
    id: 'pijucgfeegmbms89sa0l',
    alt: 'Stacked lidded pickup bowls of salad next to a tray of dimpled focaccia',
    caption: 'One week of member pickups, waiting to go out',
  },
  produce: {
    id: 'eziwhpekv6rqjubsxhwf',
    alt: 'Bunches of parsley, asparagus, flowering chives and tarragon laid out together',
    caption: 'Parsley, asparagus, chives in flower, tarragon',
  },
};

const BENEFITS = [
  {
    title: 'First look at every pickup menu',
    copy: 'Members see the week’s menu and order from it before it goes anywhere else. The good weeks are usually spoken for by the time it does.',
  },
  {
    title: 'The door to meal prep',
    copy: 'Weekly cooking for your household is members-only. It is the one thing membership unlocks outright rather than improves.',
  },
  {
    title: '4% back, every quarter',
    copy: 'Paying members earn 4% of everything they spend with the co-op as credit. It posts quarterly, it does not expire, and it spends like money on anything we make.',
  },
  {
    title: 'The things that never make the menu',
    copy: 'Something extra in the bag, the first taste of a dish we are still arguing about in the kitchen, the occasional unannounced surprise at pickup.',
  },
  {
    title: 'A payroll where every cook is offered ownership',
    copy: 'Under Minnesota Chapter 308B, equity is open to every person who works here. Your dues fund the wages that make that ownership worth holding rather than a line in a handbook.',
  },
  {
    title: 'A place on the balance sheet, if you want one',
    copy: 'Separate from dues, members can put capital in directly through our 308B offerings — a kitchen equipment note, a growers fund, a patronage-linked capital account. Entirely optional.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What does my membership actually pay for?',
    a: [
      'Wages, mostly. Dues are revenue we can count on, which is what lets us pay cooks on a set schedule instead of whatever a given week of sales allows, and staff the kitchen for the work ahead rather than the work already booked.',
      'The rest is planning. Knowing roughly how many people we are cooking for lets us order further out and waste less, which is unglamorous and is most of what running a kitchen well actually is.',
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
      'Monthly and annual memberships earn it. Waived memberships do not; waived Localists receive their own low-cost menu instead. Every other membership benefit is shared.',
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
      'Because cooking for a household every week is a standing arrangement rather than a one-off order. Knowing who we are cooking for, and roughly how many, is what lets us order ingredients and schedule cooks with any accuracy.',
      'So every meal prep customer is a Localist first. It is also why we will never run a surge price or a busy-season markup.',
    ],
  },
  {
    q: 'Can I put money into the co-op beyond dues?',
    a: [
      'Yes, and this is the part that is actually an investment — dues are not. Members can put capital in directly through our 308B offerings: a kitchen equipment note, a fund that pays Minnesota growers earlier in the year than we otherwise could, or a patronage-linked capital account.',
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
  // A Square redirect is only evidence that checkout returned to this page.
  // The verified webhook, not these query parameters, activates membership.
  const [confirmationTier, setConfirmationTier] = useState('');
  const formRef = useRef(null);
  const pricingRef = useRef(null);
  const waiverRef = useRef(null);

  useEffect(() => {
    const returned = getLocalistReturnState(window.location.search);
    setMembershipUrl(returned.membershipUrl);
    if (returned.confirmationTier) {
      setConfirmationTier(returned.confirmationTier);
      setTier(returned.confirmationTier);
      setStatus(returned.status);
      const preservedInvite = new URL(returned.membershipUrl, window.location.origin).search;
      window.history.replaceState({}, '', `${window.location.pathname}${preservedInvite}`);
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
      setMembershipUrl(data?.membershipUrl || '/hub/membership');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Something went wrong. Please try again.');
    }
  };

  const submitLabel = () => {
    if (status === 'submitting') return tier === 'waived' ? 'Claiming…' : 'Taking you to checkout…';
    if (tier === 'waived') return 'Claim free membership';
    if (tier === 'annual') return 'Continue to payment — $375/year';
    if (tier === 'monthly') return 'Continue to payment — $45/month';
    return 'Choose an option above';
  };

  return (
    <div className="fullpage-demo-scope service-page localist-page">
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

      <div className="ht-scope ht-scope--localist is-drawn service-page__body">
        {/* ── The offer, beside one big print ── */}
        <section className="service-hero">
          <div className="ht-slip">
            <p className="ht-kicker">membership —</p>
            <h1 className="ht-heading">Become a Localist</h1>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              Localists are the members of a worker-owned food cooperative. Every
              person who cooks here is offered equity ownership in the business —
              that is the structure, not a perk. Membership is what makes it hold:
              steady revenue is what lets us pay cooks fairly, on a schedule they
              can plan a life around.
            </p>
            <p className="ht-copy">
              You get the front of the line for it — member pickup menus and perks
              along the way. Paying members also accrue 4% of tracked spending as
              quarterly credit. Membership is the front door to everything else we
              do: it is required to become a meal prep customer.
            </p>
            <p className="ht-facts">$45 / month · $375 / year · waived if you need it</p>
            <div className="ht-side-links">
              <button type="button" className="ht-side-link" onClick={() => scrollTo(pricingRef)}>
                See membership options
              </button>
              <button type="button" className="ht-side-link" onClick={() => scrollTo(waiverRef)}>
                Cost is a barrier? Join free
              </button>
            </div>
          </div>
          <div className="ht-hero-photo service-hero__photo">
            <img src={bandSrc(PHOTOS.hero.id, 1400)} alt={PHOTOS.hero.alt} loading="eager" />
          </div>
        </section>

        {/* ── Pricing: a ledger, not a pair of pricing cards ── */}
        <section className="service-pricing" ref={pricingRef}>
          <p className="ht-kicker">what it costs —</p>
          <h2>One membership, three ways to hold it</h2>
          <div className="ht-ledger localist-ledger">
            <div className="ht-ledger-row">
              <span>Monthly — full membership, renews until you stop it</span>
              <span className="ht-ledger-price">$45 / mo</span>
            </div>
            <div className="ht-ledger-row">
              <span>Annual — twelve months for the price of about nine</span>
              <span className="ht-ledger-price">$375 / yr</span>
            </div>
            <div className="ht-ledger-row">
              <span>Cost waived — same membership, no questions asked</span>
              <span className="ht-ledger-price">$0</span>
            </div>
          </div>
          <p className="ht-footnote">
            Monthly and annual memberships earn the 4% quarterly credit. Cost-waived
            membership instead includes its waived-only low-cost menu; everything else is shared.
          </p>
          <div className="ht-side-links">
            <button type="button" className="ht-side-link" onClick={() => chooseTier('monthly')}>
              Join monthly
            </button>
            <button type="button" className="ht-side-link" onClick={() => chooseTier('annual')}>
              Join annual
            </button>
          </div>
        </section>

        {/* ── What membership actually gets you ── */}
        <section className="service-benefits">
          <p className="ht-kicker">what you get —</p>
          <h2>Being a Localist</h2>
          <div className="localist-split">
            <ul className="localist-benefits">
              {BENEFITS.map((benefit) => (
                <li className="localist-benefit" key={benefit.title}>
                  <h3>{benefit.title}</h3>
                  <p className="ht-copy">{benefit.copy}</p>
                </li>
              ))}
            </ul>
            <figure className="ht-polaroid localist-split__photo">
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
        </section>

        {/* ── The argument, made once ── */}
        <section className="service-argument">
          <figure className="localist-band">
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
            <figcaption>{PHOTOS.produce.caption}</figcaption>
          </figure>
          <p className="ht-kicker">why a cooperative —</p>
          <h2>Who owns a kitchen decides what comes out of it</h2>
          <div className="localist-argument">
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
              We buy from Minnesota growers we know by name, and it costs more
              than the alternative. That is a preference we pay for because we
              think the food is better and we would rather the money stay here.
              It is not a moral claim about anyone else&apos;s supply chain.
            </p>
            <p>
              None of this is our invention. Cooperatives have run for a century,
              and the reason there are so few in food is that everyone is waiting
              for someone else to prove the numbers work. We would rather be the
              proof than the audience.
            </p>
          </div>
        </section>

        {/* ── The waiver, given the same weight as the price ── */}
        <section className="service-waiver" ref={waiverRef}>
          <div className="ht-slip localist-waiver">
            <p className="ht-kicker">cost is a barrier? —</p>
            <h2>Then membership is free</h2>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              Waived Localists get the same menus, the same pickups, and the same
              perks as everyone else, plus a low-cost menu only they see. The one
              thing that differs is the 4% quarterly credit, which is reserved for
              paying members.
            </p>
            <div className="ht-side-links">
              <button type="button" className="ht-side-link" onClick={() => chooseTier('waived')}>
                Claim free membership
              </button>
            </div>
            <p className="ht-footnote ht-footnote--tight">
              If you&apos;re wondering whether this is meant for you, it is.
            </p>
          </div>
        </section>

        {/* ── Sign up and pay, one pass ── */}
        <section className="service-close" ref={formRef}>
          <div className="ht-slip">
            <p className="ht-kicker">join —</p>
            <h2>Become a Localist</h2>
            <span className="ht-rule-line" aria-hidden="true" />

            {status === 'success' || status === 'confirmation' ? (
              <div className="ht-success">
                <p className="ht-success-lead">
                  {status === 'confirmation' ? 'confirmation pending —' : tier === 'waived' ? 'welcome —' : 'received —'}
                </p>
                <p className="ht-copy" style={{ marginTop: 0 }}>
                  {status === 'confirmation'
                    ? `Square checkout returned for your ${confirmationTier === 'annual' ? 'annual' : 'monthly'} membership. Square confirmation is being processed; this page is not a payment receipt, and your roster will become active only after Square confirms the completed payment.`
                    : tier === 'waived'
                      ? 'Your waived membership is claimed — nothing to pay, and no follow-up questions about it. You’re a Localist with the same core membership plus the waived-only low-cost menu.'
                      : 'We have your details. Someone from the co-op will reach out within a day to finish setting up your membership.'}
                </p>
                <div className="ht-side-links">
                  <a className="ht-side-link" href={membershipUrl}>
                    Set up my invited Hub membership
                  </a>
                </div>
                <p className="ht-footnote ht-footnote--tight">
                  Your perks, tracked pickup purchases, and estimated accrued credit
                  live there. You&apos;ll sign in with the email you used above.
                </p>
              </div>
            ) : (
              <form className="ht-form" onSubmit={handleSubmit} noValidate>
                <p className="ht-copy" style={{ marginTop: 0 }}>
                  Details, then payment, then you&apos;re a member — one pass, about
                  a minute. Paid memberships finish on Square&apos;s checkout and
                  renew on their own until you stop them.
                </p>

                <div className="ht-chips" role="group" aria-label="Choose membership option">
                  {Object.entries(TIERS).map(([key, meta]) => (
                    <button
                      key={key}
                      type="button"
                      className="ht-chip"
                      aria-pressed={tier === key}
                      onClick={() => setTier(key)}
                      disabled={status === 'submitting'}
                    >
                      {meta.label} · {meta.sub}
                    </button>
                  ))}
                </div>

                <div className="ht-row">
                  <div>
                    <label className="ht-label" htmlFor="localist-name">your name</label>
                    <input
                      id="localist-name"
                      type="text"
                      autoComplete="name"
                      className="ht-input"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={status === 'submitting'}
                    />
                  </div>
                  <div>
                    <label className="ht-label" htmlFor="localist-email">email</label>
                    <input
                      id="localist-email"
                      type="email"
                      autoComplete="email"
                      className="ht-input"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={status === 'submitting'}
                    />
                  </div>
                </div>

                <div>
                  <label className="ht-label" htmlFor="localist-phone">phone</label>
                  <input
                    id="localist-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="ht-input"
                    placeholder="(612) 555-0100"
                    value={formatPhone(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={status === 'submitting'}
                  />
                </div>

                <input
                  type="text"
                  name="website"
                  className="ht-hp"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                />

                {error && <p className="ht-error">{error}</p>}

                <button type="submit" className="ht-submit" disabled={!canSubmit}>
                  {submitLabel()}
                </button>

                <p className="ht-footnote">
                  US numbers only. We&apos;ll only use this to run your membership —
                  no spam, and you can reply STOP to any text.
                </p>
              </form>
            )}
          </div>
        </section>

        {/* ── FAQ: same details/summary material as the service pages ── */}
        <section className="service-faq" aria-labelledby="localist-faq">
          <p className="ht-kicker">questions —</p>
          <h2 id="localist-faq">Before you join</h2>
          <div className="service-faq__list">
            {FAQ_ITEMS.map((item) => (
              <details className="ht-recent-menu" key={item.q}>
                <summary>
                  <span>{item.q}</span>
                  <span className="ht-recent-menu__hint">answer</span>
                </summary>
                <div className="ht-recent-menu__body">
                  {item.a.map((paragraph) => (
                    <p className="ht-copy" style={{ marginTop: 0 }} key={paragraph.slice(0, 40)}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Photos ── */}
        {images.length > 0 && (
          <section className="service-gallery">
            <p className="ht-kicker">from recent pickup menus —</p>
            {/* No hover-scale on these. Every card lifting 2% on hover is a
                pattern, not a response — and the API already hands back real
                dimensions, so they are used to reserve space instead. */}
            <div className="localist-gallery">
              {images.map((img, idx) => (
                <figure className="ht-polaroid" key={img.asset_id || img.public_id}>
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
          </section>
        )}
      </div>
    </div>
  );
};

export default LocalistPage;
