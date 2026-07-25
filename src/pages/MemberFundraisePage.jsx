// src/pages/MemberFundraisePage.jsx
//
// /308b-member — member capital offerings for Local Effort Cooperative, a
// Minnesota Chapter 308B cooperative association. Linked from a member's Hub
// membership page.
//
// Design: deliberately the *receipt* material from .ht-scope--business (straight
// 2px edges, one heavy ink rule, mono ledger rows, no wobble) rather than the
// hand-drawn slip. A capital offering is a financial document and should read
// like one. Direction: src/components/fullpage/HOME-TABS-DESIGN.md
//
// IMPORTANT: this page collects non-binding expressions of interest only. It is
// not an offer to sell securities and takes no money. Every offering below is
// framed that way on purpose — see DISCLOSURE at the foot of the page.
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import { trackEvent } from '../lib/trackEvent';
import { formatPhone, isValidEmailAddress } from '../components/services/slipForms';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';
import '../styles/member-fundraise.css';

const OFFERINGS = [
  {
    id: 'kitchen-note',
    name: 'Kitchen Note',
    range: '$500 – $5,000',
    terms: [
      ['instrument', 'member loan (promissory note)'],
      ['return', '4% simple interest'],
      ['term', '36 months'],
      ['repayment', 'quarterly, principal at maturity'],
    ],
    what: 'Production equipment we own outright instead of rent: a second deck oven, a walk-in upgrade, and the packaging line that lets wholesale grow without more hours.',
    why: 'Equipment is the constraint on every line at once. The same oven serves meal prep, pizza, and the wholesale case.',
  },
  {
    id: 'farm-fund',
    name: 'Farm Fund',
    range: '$250 – $2,500',
    terms: [
      ['instrument', 'prepaid co-op credit'],
      ['return', '110% in food credit'],
      ['term', 'redeem over 12 months'],
      ['repayment', 'as food, not cash'],
    ],
    what: 'Cash at the front of the season, when Minnesota farms need commitments and we are least able to give them. You get 110% of it back as credit against anything we make.',
    why: 'Buying early and in volume is how we hold prices and how growers plan their year. This is the offering that most directly changes what we can promise a farm.',
  },
  {
    id: 'member-capital',
    name: 'Member Capital',
    range: '$1,000 and up',
    terms: [
      ['instrument', '308B member capital account'],
      ['return', 'patronage-linked, when there is surplus'],
      ['term', 'open-ended, redeemable by request'],
      ['repayment', 'no fixed return, no guarantee'],
    ],
    what: 'A capital account in the cooperative itself, under Minnesota Chapter 308B. Patronage-linked: you share in surplus in the years there is surplus, in proportion to your participation.',
    why: 'The most patient money we can take, and the only one that makes you an owner of the balance sheet rather than a creditor of it. Also the one that can return nothing.',
  },
];

const MemberFundraisePage = () => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', offering: '', amount: '', notes: '', website: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validationMessage = () => {
    if (!form.offering) return 'Pick which offering you want to hear more about.';
    if (!form.name.trim()) return 'Add your name so we know who to reply to.';
    if (!isValidEmailAddress(form.email)) return 'Add your email — the offering documents land there.';
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
      const offering = OFFERINGS.find((o) => o.id === form.offering);
      const lines = [
        '308B member offering — expression of interest (non-binding).',
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone || '(not provided)'}`,
        `Offering: ${offering?.name || form.offering}`,
        `Indicative amount: ${form.amount || '(not stated)'}`,
        `Notes: ${form.notes || '(none)'}`,
      ];
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim(),
          phone: form.phone,
          subject: `308B member interest — ${offering?.name || form.offering}`,
          type: '308b-member-interest',
          website: form.website,
          message: lines.join('\n'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to send');
      trackEvent('contact.completed', { store: 'member-capital', leadType: `308b_${form.offering}` });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to send. Please try again.');
    }
  };

  const structuredData = useMemo(
    () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${SITE_URL}/308b-member`,
      name: '308B Member Offerings — Local Effort Cooperative',
      description: 'Member capital offerings for Local Effort Cooperative, a Minnesota Chapter 308B cooperative association: a kitchen equipment note, a local-farm purchasing fund, and patronage-linked member capital.',
      isPartOf: { '@id': `${SITE_URL}#website` },
    }),
    [],
  );

  return (
    <div className="fullpage-demo-scope service-page mf-page">
      <Helmet>
        <title>308B Member Offerings — Invest in the Cooperative | {SITE_NAME}</title>
        <meta
          name="description"
          content="Local Effort Cooperative is raising member capital under Minnesota Chapter 308B. Three offerings: a kitchen equipment note, a local-farm purchasing fund, and patronage-linked member capital."
        />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={`${SITE_URL}/308b-member`} />
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope ht-scope--business is-drawn service-page__body">
        <section className="service-hero mf-hero">
          <div className="ht-slip">
            <p className="ht-kicker">308B member offerings — for members only</p>
            <h1 className="ht-heading">Put capital into the cooperative that cooks for you</h1>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              Local Effort is a Minnesota Chapter 308B cooperative association. That
              statute is what lets us take capital from the people we already feed
              and the people who already work here, instead of from someone who
              wants the kitchen sold in five years.
            </p>
            <p className="ht-copy">
              Three ways in, below. One is a loan, one is prepaid food, one makes you
              an owner of the balance sheet. They are not equally safe and we have
              said so in each one.
            </p>
            <p className="ht-facts">
              raising to $50,000 · members only · no money is taken on this page
            </p>
            <div className="ht-side-links">
              <a className="ht-side-link" href="#mf-interest">
                Skip to the interest form
              </a>
              <a className="ht-side-link" href="/hub">
                Back to your membership page
              </a>
            </div>
          </div>
        </section>

        <section className="mf-offerings" aria-labelledby="mf-offerings-title">
          <p className="ht-kicker">the offerings —</p>
          <h2 id="mf-offerings-title">Three ways to put money in</h2>
          <div className="mf-grid">
            {OFFERINGS.map((offering) => (
              <article className="mf-card" key={offering.id}>
                <header className="mf-card__head">
                  <h3>{offering.name}</h3>
                  <p className="mf-card__range">{offering.range}</p>
                </header>
                <div className="ht-ledger mf-card__terms">
                  {offering.terms.map(([label, value]) => (
                    <div className="ht-ledger-row" key={label}>
                      <span>{label}</span>
                      <span className="ht-ledger-price">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="mf-card__what"><strong>What it buys.</strong> {offering.what}</p>
                <p className="mf-card__why"><strong>Why this one.</strong> {offering.why}</p>
                <button
                  type="button"
                  className="ht-submit mf-card__cta"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, offering: offering.id }));
                    document.getElementById('mf-interest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  I&apos;m interested in {offering.name}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mf-why" aria-labelledby="mf-why-title">
          <p className="ht-kicker">why member money —</p>
          <h2 id="mf-why-title">Who this money answers to</h2>
          <div className="mf-why__cols">
            <p>
              Every staff member at Local Effort is offered equity ownership in the
              business. That is not a perk bolted onto a normal restaurant — it is
              the reason the cooperative exists in this legal form. Outside capital
              that expects an exit eventually asks us to sell the thing the workers
              own.
            </p>
            <p>
              Member capital does not ask that. It comes from households who eat our
              food and from the people who cook it, and it is repaid in interest, in
              food, or in patronage — never by selling the kitchen. It is slower
              money and it is the only kind that fits.
            </p>
          </div>
        </section>

        <section className="mf-interest" id="mf-interest" aria-labelledby="mf-interest-title">
          <div className="ht-slip">
            <p className="ht-kicker">expression of interest —</p>
            <h2 id="mf-interest-title">Tell us which one, and roughly how much</h2>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              This is non-binding and takes no payment. We send the offering
              documents for the one you pick, and a worker-owner follows up to walk
              through the risks with you before anything is signed.
            </p>

            {status === 'success' ? (
              <div className="ht-success" role="status">
                <span className="ht-success-lead">received —</span>
                We&apos;ll send the offering documents and follow up personally. Nothing
                is committed and no money has been taken.
              </div>
            ) : (
              <form className="ht-form" onSubmit={handleSubmit} noValidate>
                <div>
                  <span className="ht-label" id="mf-offering-label">which offering?</span>
                  <div className="ht-chips" role="group" aria-labelledby="mf-offering-label">
                    {OFFERINGS.map((offering) => (
                      <button
                        key={offering.id}
                        type="button"
                        className="ht-chip"
                        aria-pressed={form.offering === offering.id}
                        onClick={() => setForm((prev) => ({ ...prev, offering: offering.id }))}
                      >
                        {offering.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="ht-label" htmlFor="mf-name">your name</label>
                  <input
                    id="mf-name"
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
                    <label className="ht-label" htmlFor="mf-email">email</label>
                    <input
                      id="mf-email"
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
                    <label className="ht-label" htmlFor="mf-phone">phone <span aria-hidden="true">·</span> optional</label>
                    <input
                      id="mf-phone"
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
                  <label className="ht-label" htmlFor="mf-amount">indicative amount <span aria-hidden="true">·</span> optional</label>
                  <input
                    id="mf-amount"
                    className="ht-input"
                    value={form.amount}
                    onChange={update('amount')}
                    placeholder="$1,000"
                    inputMode="numeric"
                  />
                  <p className="ht-footnote ht-footnote--tight">
                    a range is fine — nothing here is a commitment
                  </p>
                </div>
                <div>
                  <label className="ht-label" htmlFor="mf-notes">anything you want to ask <span aria-hidden="true">·</span> optional</label>
                  <textarea
                    id="mf-notes"
                    className="ht-input"
                    rows={3}
                    value={form.notes}
                    onChange={update('notes')}
                  />
                </div>
                {/* Honeypot — real users never see or fill this. */}
                <div className="ht-hp" aria-hidden="true">
                  <label htmlFor="mf-website">Website</label>
                  <input
                    id="mf-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={update('website')}
                  />
                </div>
                {status === 'error' && <p className="ht-error" role="alert">{error}</p>}
                <button type="submit" className="ht-submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending…' : 'Send my expression of interest'}
                </button>
                <p className="ht-footnote">
                  Non-binding. No payment is taken here and no offering is closed by
                  this form.
                </p>
              </form>
            )}
          </div>
        </section>

        <section className="mf-disclosure" aria-labelledby="mf-disclosure-title">
          <h2 id="mf-disclosure-title" className="mf-disclosure__title">Disclosure</h2>
          <p>
            This page is a description of member capital offerings under
            consideration by Local Effort Cooperative, a Minnesota Chapter 308B
            cooperative association. It is <strong>not</strong> an offer to sell, or
            a solicitation of an offer to buy, any security, and it takes no money.
            Submitting the form above creates no obligation on either side.
          </p>
          <p>
            Any actual offering will be made only to eligible members, only through
            written offering documents, and only in compliance with applicable
            federal and Minnesota securities law. Returns described above are
            targets, not promises. Member capital in particular may return nothing,
            and you could lose the entire amount. Repayment of the Kitchen Note
            depends on the cooperative&apos;s ability to pay. Farm Fund credit is
            redeemable in food, not cash.
          </p>
          <p>
            Talk to your own financial or legal advisor before committing money to a
            small business, including this one.
          </p>
        </section>
      </div>
    </div>
  );
};

export default MemberFundraisePage;
