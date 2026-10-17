import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Bulletin from '../components/Bulletin';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSpecimenReveal } from '../hooks/useSpecimenReveal';
import { isValidEmailAddress } from '../components/services/slipForms';
import { trackEvent } from '../lib/trackEvent';
import { CONTACT_EMAIL, SITE_URL } from '../config/siteMetadata';
import { CHEF_COOPERATIVE_FAQ } from './chefCooperativeFaq';
import '../styles/specimen.css';
import '../styles/chef-cooperative.css';

/*
 * Design thesis. A cooperative is many hands finishing one thing, so the page
 * borrows the two Rijksmuseum sheets that show exactly that: Nieuwenhuis's
 * study sheet (one sheet, several states of completion at once, which is also
 * how specimen.css reveals a section) and Avercamp's ice (a whole town on one
 * surface, none of them the subject). Fields, frame, caption strip and the
 * single dark void come from specimen.css; the only dark field is the join
 * form, because that is the one moment the page asks for something.
 * Type: National Park for the headings (index.css:67), Office Code Pro for
 * data, Yomogi for the hand note, as everywhere else on the specimen pages.
 */

// IIIF ids and rights are from docs/design/REFERENCE-SET.md, rows RP-T-1969-185(R) and SK-A-1718.
const iiif = (id, width) => `https://iiif.micr.io/${id}/full/${width},/0/default.webp`;

const STUDY_SHEET = {
  id: 'XcYvw',
  alt: 'A study sheet of fruit, plants and flowers, some fully painted, some in outline, some in pencil',
  maker: 'Theo Nieuwenhuis, 1876–1951',
  accession: 'RP-T-1969-185(R)',
  width: 6187,
  height: 4836,
};
const ICE = {
  id: 'aXnzA',
  alt: 'A frozen canal crowded with skaters, sledges and townspeople',
  maker: 'Hendrick Avercamp, c. 1608',
  accession: 'SK-A-1718',
  width: 6337,
  height: 3674,
};

const PAGE_URL = `${SITE_URL}/chef-cooperative`;
const TITLE = "Join our chef's cooperative | Local Effort Cooperative";
const DESCRIPTION = "Join the list for more information about Local Effort's chef cooperative, or talk with us directly.";

function Plate({ work, sizes, eager = false, lifted = false }) {
  return (
    <figure className="chef-coop__plate">
      <img
        className={`specimen-figure${lifted ? ' specimen-figure--lifted' : ''}`}
        src={iiif(work.id, 1200)}
        srcSet={`${iiif(work.id, 800)} 800w, ${iiif(work.id, 1200)} 1200w, ${iiif(work.id, 1600)} 1600w`}
        sizes={sizes}
        width={work.width}
        height={work.height}
        alt={work.alt}
        loading={eager ? 'eager' : 'lazy'}
      />
      <figcaption className="specimen-caption" style={{ '--sp-caption-cells': 2 }}>
        <span className="specimen-caption__data">{work.maker}</span>
        <span className="specimen-caption__data">Rijksmuseum {work.accession}</span>
      </figcaption>
    </figure>
  );
}

// Each section finishes the first time it is scrolled to (useSpecimenReveal).
function Sheet({ className = '', children, ...props }) {
  const { ref, finish } = useSpecimenReveal();
  return (
    <section ref={ref} data-finish={finish} className={`specimen-reveal ${className}`} {...props}>
      {children}
    </section>
  );
}

function JoinForm() {
  const [form, setForm] = useState({ name: '', email: '', website: '' });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (status === 'sending') return;
    if (!form.name.trim()) { setStatus('error'); setError('Add your name so we know who to write back to.'); return; }
    if (!isValidEmailAddress(form.email)) { setStatus('error'); setError('Add an email address we can write to.'); return; }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chef-cooperative-interest',
          name: form.name.trim(),
          email: form.email.trim(),
          subject: "Chef cooperative: send me more information",
          message: `${form.name.trim()} asked to be on the list for more information about the chef cooperative.`,
          website: form.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error === 'rate-limit-exceeded' ? 'Too many tries. Please wait a minute and try again.' : data?.error || 'Unable to send');
      trackEvent('contact.completed', { store: 'chef-cooperative', leadType: 'chef_cooperative_interest' });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to send. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <p className="chef-coop__thanks" role="status">
        Thank you, {form.name.trim()}. We have your email and will write to {form.email.trim()} with more information.
      </p>
    );
  }

  return (
    <form className="chef-coop__form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="cc-name">Your name</label>
      <input id="cc-name" type="text" autoComplete="name" value={form.name} onChange={update('name')} required />
      <label htmlFor="cc-email">Email</label>
      <input id="cc-email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={update('email')} required />
      {/* Honeypot: real people never see or fill this. messages.js drops the submission if it has a value. */}
      <div className="chef-coop__hp" aria-hidden="true">
        <label htmlFor="cc-website">Website</label>
        <input id="cc-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={update('website')} />
      </div>
      {status === 'error' && <p className="chef-coop__error" role="alert">{error}</p>}
      <button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send me more information'}</button>
    </form>
  );
}

export default function ChefCooperativePage() {
  const { isAdmin, accessToken } = useSupabaseAuth();

  return (
    <div className="fullpage-demo-scope specimen chef-coop">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={PAGE_URL} />
        <link rel="canonical" href={PAGE_URL} />
      </Helmet>

      <main>
        {/* Above the fold, so it never waits to reveal. */}
        <section className="chef-coop__hero specimen-sheet" aria-labelledby="chef-coop-title">
          <div className="chef-coop__hero-copy">
            <h1 id="chef-coop-title">Join our chef&rsquo;s cooperative</h1>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute
              irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
            <p className="chef-coop__links">
              <a href="#join">Join the list</a>
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Chef cooperative")}`}>Talk with us directly</a>
            </p>
          </div>
          <Plate work={STUDY_SHEET} sizes="(max-width: 56rem) 92vw, 46vw" eager lifted />
        </section>

        <Sheet className="chef-coop__bulletin specimen-sheet" aria-label="Bulletin">
          <Bulletin slug="chef-cooperative" isAdmin={isAdmin} accessToken={accessToken} />
          <Plate work={ICE} sizes="(max-width: 56rem) 92vw, 40vw" />
        </Sheet>

        <Sheet id="join" className="chef-coop__join specimen-void" aria-labelledby="chef-coop-join-title">
          <span className="specimen-void__light" aria-hidden="true" />
          <div className="chef-coop__join-copy">
            <h2 id="chef-coop-join-title">Get more information</h2>
            <p>Leave your name and email and we will send more information as it is ready.</p>
            <p>
              Rather talk it through?{' '}
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Chef cooperative')}`}>Talk with us directly</a>
              {' '}at {CONTACT_EMAIL}.
            </p>
          </div>
          <JoinForm />
        </Sheet>

        <Sheet className="chef-coop__faq specimen-sheet" aria-labelledby="chef-coop-faq-title">
          <h2 id="chef-coop-faq-title">Questions</h2>
          <div className="chef-coop__faq-list">
            {CHEF_COOPERATIVE_FAQ.map((entry) => (
              <details key={entry.question} className="chef-coop__faq-item">
                <summary>{entry.question}</summary>
                {entry.answer.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </details>
            ))}
          </div>
        </Sheet>
      </main>
    </div>
  );
}
