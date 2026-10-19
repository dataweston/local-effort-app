import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Bulletin from '../components/Bulletin';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSpecimenReveal } from '../hooks/useSpecimenReveal';
import { CONTACT_EMAIL, SITE_URL } from '../config/siteMetadata';
import { CHEF_COOPERATIVE_FAQ } from './chefCooperativeFaq';
import { CHEF_COOPERATIVE_BENEFITS } from './chefCooperativeBenefits';
import '../styles/specimen.css';
import '../styles/chef-cooperative.css';

/*
 * Design thesis. A cooperative is many hands finishing one thing, so the page
 * borrows the Rijksmuseum sheet that shows exactly that: Nieuwenhuis's study
 * sheet (one sheet, several states of completion at once, which is also how
 * specimen.css reveals a section). Fields, frame and caption strip come from
 * specimen.css. The page uses aligned columns of paper: an introduction and study sheet,
 * then recruitment notes beside ruled benefits, followed by bulletin and questions. Nothing asks for
 * anything but a conversation.
 * Type: National Park for the headings (index.css:67), Office Code Pro for
 * data, Yomogi for the hand note, as everywhere else on the specimen pages.
 */

// IIIF ids and rights are from docs/design/REFERENCE-SET.md, row RP-T-1969-185(R).
const iiif = (id, width) => `https://iiif.micr.io/${id}/full/${width},/0/default.webp`;

const STUDY_SHEET = {
  id: 'XcYvw',
  alt: 'A study sheet of fruit, plants and flowers, some fully painted, some in outline, some in pencil',
  maker: 'Theo Nieuwenhuis, 1876–1951',
  accession: 'RP-T-1969-185(R)',
  width: 6187,
  height: 4836,
};

const PAGE_URL = `${SITE_URL}/chef-cooperative`;
const TITLE = "Join our chef's cooperative | Local Effort Cooperative";
const DESCRIPTION = "Join Local Effort’s chef-driven workers cooperative in St. Paul for shared work, kitchen access, promotion and a short path to equity ownership.";

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

export default function ChefCooperativePage() {
  const { isAdmin, accessToken } = useSupabaseAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submitInterest = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chef-cooperative',
          name: formData.get('name'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          portfolioUrl: formData.get('portfolioUrl'),
          socialMedia: formData.get('socialMedia'),
          professionalPicture: formData.get('professionalPicture'),
          website: formData.get('website'),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || 'We could not send your request. Please try again.');
      setSubmitted(true);
      form.reset();
    } catch (error) {
      setSubmitError(error.message || 'We could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
              Local Effort is a chef-driven workers cooperative aligning customer and labor incentives
              around a new business model. We bring independent chefs together to pool prep hours,
              share job leads and distribute the work. Whether you already work for yourself or want
              to grow into an independent practice, there is room to build it here.
            </p>
            <p className="chef-coop__links">
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Chef cooperative')}`}>Talk with us directly</a>
            </p>
          </div>
          <Plate work={STUDY_SHEET} sizes="(max-width: 56rem) 92vw, 34rem" eager lifted />
        </section>

        <div className="chef-coop__grid">
          <Sheet className="chef-coop__invitation specimen-sheet" aria-labelledby="chef-coop-invitation-title">
            <h2 id="chef-coop-invitation-title">We&rsquo;re not hiring, but we are recruiting.</h2>
            <p>
              <em>
                We are looking for 3–4 local chefs. Experience is awesome; less experience is
                welcome too. Everyone brings different strengths and tools to this weird game.
                What do you bring?
              </em>
            </p>
          </Sheet>

          <Sheet className="chef-coop__benefits specimen-sheet" aria-labelledby="chef-coop-benefits-title">
            <h2 id="chef-coop-benefits-title">Why join</h2>
            <ul className="chef-coop__benefit-list">
              {CHEF_COOPERATIVE_BENEFITS.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
            <button
              className="chef-coop__interest-trigger"
              type="button"
              aria-expanded={formOpen}
              aria-controls="chef-coop-interest-form"
              onClick={() => { setFormOpen((open) => !open); setSubmitError(''); }}
            >
              Send me more information
            </button>
            {formOpen && (
              <div className="chef-coop__interest-panel" id="chef-coop-interest-form">
                {submitted ? (
                  <p className="chef-coop__form-success" role="status">
                    Thanks for reaching out. Your note has been sent to Local Effort. We’ll be in touch.
                  </p>
                ) : (
                  <form className="chef-coop__form" onSubmit={submitInterest}>
                    <p className="chef-coop__form-intro">Tell us how to reach you and a little about your work.</p>
                    <div className="chef-coop__form-grid">
                      <label>Name<input name="name" autoComplete="name" required maxLength="200" /></label>
                      <label>Phone<input name="phone" type="tel" autoComplete="tel" required maxLength="80" /></label>
                      <label>Email<input name="email" type="email" autoComplete="email" required maxLength="254" /></label>
                      <label>Website <span>(optional)</span><input name="portfolioUrl" type="url" autoComplete="url" maxLength="300" /></label>
                      <label>Social media <span>(optional)</span><input name="socialMedia" maxLength="300" placeholder="Handle or profile link" /></label>
                      <label className="chef-coop__form-wide">
                        Your interest and current professional picture <span>(optional)</span>
                        <textarea name="professionalPicture" rows="4" maxLength="2000" />
                      </label>
                      <label className="chef-coop__honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label>
                    </div>
                    {submitError && <p className="chef-coop__form-error" role="alert">{submitError}</p>}
                    <button className="chef-coop__interest-submit" type="submit" disabled={submitting}>
                      {submitting ? 'Sending…' : 'Send inquiry'}
                    </button>
                    <p className="chef-coop__form-privacy">We’ll use your details to respond to this inquiry. No confirmation email will be sent.</p>
                  </form>
                )}
              </div>
            )}
          </Sheet>

          <Sheet className="chef-coop__bulletin specimen-sheet" aria-label="Bulletin">
            <Bulletin slug="chef-cooperative" isAdmin={isAdmin} accessToken={accessToken} />
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
        </div>
      </main>
    </div>
  );
}
