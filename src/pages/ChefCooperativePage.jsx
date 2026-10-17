import React from 'react';
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
 * specimen.css. The page is one quiet column of paper: a note, then the
 * reasons to join as plain ruled lines, then questions. Nothing asks for
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
const DESCRIPTION = "Reasons to join Local Effort's chef cooperative, or talk with the team directly.";

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
              <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Chef cooperative')}`}>Talk with us directly</a>
            </p>
          </div>
          <Plate work={STUDY_SHEET} sizes="(max-width: 56rem) 92vw, 46vw" eager lifted />
        </section>

        <Sheet className="chef-coop__bulletin specimen-sheet" aria-label="Bulletin">
          <Bulletin slug="chef-cooperative" isAdmin={isAdmin} accessToken={accessToken} />
        </Sheet>

        <Sheet className="chef-coop__benefits specimen-sheet" aria-labelledby="chef-coop-benefits-title">
          <h2 id="chef-coop-benefits-title">Why join</h2>
          <ul className="chef-coop__benefit-list">
            {CHEF_COOPERATIVE_BENEFITS.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
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
