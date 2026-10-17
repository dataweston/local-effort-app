import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import sanityClient from '../sanityClient';
import ChefDirectory from '../components/ChefDirectory';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import { SITE_URL } from '../config/siteMetadata';
import generatedChefCooperativePageData from '../store/data/generatedChefCooperativePageData.json';
import contract from '../../shared/chef-cooperative-page.json';
import { assertChefCooperativeContent } from '../../shared/chef-cooperative-content.mjs';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';
import '../styles/chef-cooperative-retired.css';

const components = createPortableTextComponents();
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const Rich = ({ value }) => <div className="chef-cooperative__copy"><PortableText value={value} components={components} /></div>;
const Terms = ({ items }) => <ul className="chef-cooperative__terms">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
const Apply = ({ label }) => <a className="chef-cooperative__apply" href="/hub/chef">{label}<span aria-hidden="true">↗</span></a>;

// Retired 2026-10: no longer routed. /chef-cooperative is the recruitment page in ChefCooperativePage.jsx.
export default function ChefCooperativePageRetired() {
  const [page, setPage] = useState(() => assertChefCooperativeContent(generatedChefCooperativePageData.page));
  useEffect(() => {
    let alive = true;
    sanityClient.fetch(contract.query)
      .then((next) => {
        const valid = assertChefCooperativeContent(next);
        if (alive) setPage(valid);
      })
      // A complete CMS-generated snapshot remains visible during a CMS outage or invalid edit.
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="fullpage-demo-scope service-page chef-cooperative">
      <Helmet>
        <title>{page.metaTitle}</title>
        <meta name="description" content={page.metaDescription} />
        <meta property="og:title" content={page.metaTitle} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={`${SITE_URL}/chef-cooperative`} />
        <link rel="canonical" href={`${SITE_URL}/chef-cooperative`} />
      </Helmet>
      <div className="ht-scope ht-scope--localist is-drawn service-page__body">
        <section className="chef-cooperative__hero" aria-labelledby="chef-cooperative-title">
          <div className="chef-cooperative__hero-copy">
            <h1 id="chef-cooperative-title">{page.title}</h1>
            <div className="chef-cooperative__intro"><Rich value={page.introduction} /></div>
          </div>
          <aside className="chef-cooperative__invitation" aria-labelledby="chef-invitation">
            <h2 id="chef-invitation">{page.application.heading}</h2>
            <Apply label={page.application.ctaLabel} />
            <p className="chef-cooperative__signup">{page.signupFeeNotice}</p>
            <Rich value={page.application.body} />
            <a className="chef-cooperative__email" href={`mailto:${page.contact.email}`}>{page.contact.label}<span aria-hidden="true"> ↗</span></a>
          </aside>
        </section>

        {page.heroImage?.url && (
          <figure className="chef-cooperative__photo">
            <img src={page.heroImage.url} alt={page.heroImage.alt} fetchPriority="high" />
            {page.heroImage.caption && <figcaption>{page.heroImage.caption}</figcaption>}
          </figure>
        )}

        <nav className="chef-cooperative__jump-links" aria-label={page.metaTitle}>
          <a href="#chef-benefits">{page.benefitsHeading}<span aria-hidden="true"> ↓</span></a>
          <a href="#chef-ownership">{page.equity.heading}<span aria-hidden="true"> ↓</span></a>
          <a href="#chef-apply">{page.application.heading}<span aria-hidden="true"> ↓</span></a>
        </nav>

        <section className="chef-cooperative__benefits" aria-labelledby="chef-benefits">
          <h2 id="chef-benefits">{page.benefitsHeading}</h2>
          <div className="chef-cooperative__ledger">
            {page.benefits.map((benefit) => (
              <article className="chef-cooperative__row" key={benefit._key}>
                <h3>{benefit.heading}</h3><Rich value={benefit.body} />
              </article>
            ))}
          </div>
          <div className="chef-cooperative__independence"><Rich value={page.independenceNotice} /></div>
        </section>

        <section className="chef-cooperative__ownership" aria-labelledby="chef-ownership">
          <h2 id="chef-ownership">{page.equity.heading}</h2>
          <div className="chef-cooperative__ownership-body">
            <Rich value={page.equity.body} />
            <details className="chef-cooperative__details">
              <summary>{page.equity.unresolvedHeading}</summary>
              <Terms items={page.equity.unresolvedTerms} />
            </details>
          </div>
        </section>

        <section className="chef-cooperative__dues chef-cooperative__section" aria-labelledby="chef-dues">
          <div>
            <h2 id="chef-dues">{page.dues.heading}</h2>
            <div className="chef-cooperative__price">
              <strong>{money.format(page.dues.recommendedMonthlyAmountCents / 100)}</strong>
              <span>{page.dues.amountLabel}</span>
            </div>
            <p className="chef-cooperative__status">{page.dues.proposalLabel}</p>
          </div>
          <div>
            <Rich value={page.dues.rationale} />
            <div className="chef-cooperative__notice"><Rich value={page.dues.collectionNotice} /></div>
            <details className="chef-cooperative__details">
              <summary>{page.dues.undecidedHeading}</summary>
              <Terms items={page.dues.undecidedTerms} />
            </details>
          </div>
        </section>

        <section className="chef-cooperative__application chef-cooperative__section" aria-labelledby="chef-apply">
          <div><h2 id="chef-apply">{page.application.heading}</h2><Apply label={page.application.ctaLabel} /></div>
          <ol className="chef-cooperative__steps">
            {page.application.nextSteps.map((step) => <li key={step._key}><h3>{step.heading}</h3><Rich value={step.body} /></li>)}
          </ol>
        </section>

        {page.directory?.enabled && <ChefDirectory />}

        <section className="chef-cooperative__fine-print" aria-labelledby="chef-privacy">
          <div className="chef-cooperative__proposal"><Rich value={page.proposalNotice} /></div>
          <details className="chef-cooperative__details">
            <summary id="chef-privacy">{page.privacy.heading}</summary>
            <Rich value={page.privacy.body} />
          </details>
          <div className="chef-cooperative__localist"><Rich value={page.localistDistinction} /></div>
        </section>

        <section className="chef-cooperative__close" aria-labelledby="chef-contact">
          <div>
            <h2 id="chef-contact">{page.contact.heading}</h2>
            <Rich value={page.contact.body} />
            <a className="chef-cooperative__email" href={`mailto:${page.contact.email}`}>{page.contact.label}<br />{page.contact.email}</a>
          </div>
          <div className="chef-cooperative__closing-slip">
            <Apply label={page.application.ctaLabel} />
            <p className="chef-cooperative__signup">{page.signupFeeNotice}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
