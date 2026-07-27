// src/pages/SmallEventsPage.jsx
//
// /small-events — broken out of the home page's horizontal tab format so the
// private-event offer has its own indexable URL, canonical, and JSON-LD. The
// home page now teases this page instead of duplicating it.
//
// Material system: .ht-scope--events in src/styles/home-tabs.css (rose accent,
// hand-ruled slip). Direction: src/components/fullpage/HOME-TABS-DESIGN.md
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PhotoGrid from '../components/common/PhotoGrid';
import SmallEventsWizard from '../components/smallEvents/SmallEventsWizard';
import { QuickEventBookForm } from '../components/services/slipForms';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';

// The "Before you book" FAQ and the closing second booking form were removed on
// client direction (2026-07-26). The page is now hero+form → testimonial →
// photos, with exactly one ask on it. FAQ_ITEMS went with the section rather
// than being left orphaned; git history has the six answers if they come back.

const SmallEventsPage = () => {
  const [wizardOpen, setWizardOpen] = useState(false);

  const structuredData = useMemo(
    () => JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'FoodService',
          '@id': `${SITE_URL}/small-events#service`,
          name: 'Local Effort Cooperative — Private Event Catering',
          url: `${SITE_URL}/small-events`,
          description: 'Private chef catering for intimate dinners, weddings, showers, corporate events, and holiday parties in Minneapolis–St. Paul. Farm-to-table menus with 100% Minnesota-sourced ingredients. 4–75 guests.',
          provider: { '@id': `${SITE_URL}#business` },
          areaServed: [
            { '@type': 'City', name: 'Minneapolis' },
            { '@type': 'City', name: 'Saint Paul' },
            { '@type': 'Place', name: 'Twin Cities Metro, Minnesota' },
          ],
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Private Catering Services',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Private Dinner Party at Your Home',
                  description: 'In-home private chef dinner party for 4–16 guests. Seasonal, locally sourced multi-course menus tailored to your preferences, dietary needs, and occasion. Includes chef, ingredients, cooking, and service.',
                  serviceType: 'Private chef dinner',
                  category: 'Event Catering',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  price: '85',
                  unitText: 'per guest (estimated starting rate)',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Wedding & Shower Catering',
                  description: 'Farm-to-table wedding and shower catering for up to 50 guests. Custom menus, professional staffing, and full service built around Minnesota-grown ingredients. Deposit holds your date.',
                  serviceType: 'Wedding catering',
                  category: 'Event Catering',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  price: '45',
                  unitText: 'per guest (estimated starting rate)',
                },
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Small Events & Holiday Parties',
                  description: 'Catering for holiday parties, corporate events, birthdays, and gatherings up to 75 guests. Seasonal menus, professional service, and locally sourced ingredients throughout.',
                  serviceType: 'Event catering',
                  category: 'Event Catering',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  price: '45',
                  unitText: 'per guest (estimated starting rate)',
                },
              },
            ],
          },
        },
        {
          '@type': 'WebPage',
          '@id': `${SITE_URL}/small-events`,
          name: 'Private Event Catering — Dinners, Weddings & Parties | Local Effort Cooperative',
          description: 'Book private chef catering for intimate dinners, weddings, showers, and holiday parties in Minneapolis–St. Paul. Locally sourced, seasonal menus for 4–75 guests.',
          isPartOf: { '@id': `${SITE_URL}#website` },
          about: { '@id': `${SITE_URL}/small-events#service` },
        },
        // The FAQPage entry was removed with the on-page FAQ (2026-07-26):
        // Google requires the answers to be visible on the page that claims
        // them, so schema outliving the section would be a violation.
      ],
    }),
    [],
  );

  return (
    <div className="fullpage-demo-scope service-page">
      <Helmet>
        <title>Private Event Catering in Minneapolis–St. Paul | {SITE_NAME}</title>
        <meta
          name="description"
          content="Private chef catering for dinner parties, showers, weddings, and office parties across Minneapolis–St. Paul. Seasonal menus from 100% Midwest ingredients, 4–75 guests. Dinner parties from $850 — request your date."
        />
        <link rel="canonical" href={`${SITE_URL}/small-events`} />
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope ht-scope--events is-drawn service-page__body">
        {/* ── The offer + the form, above the fold ── */}
        <section className="service-hero">
          <div className="ht-slip">
            <p className="ht-kicker">small events —</p>
            <h1 className="ht-heading">Minnesotan food for Minnesotans</h1>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              Dinner parties, showers, office and holiday parties for 4–75 guests. Seasonal
              menus from 100% Midwest-sourced ingredients, cooked and served at your place.
            </p>
            <p className="ht-facts">
              dinner &amp; pizza parties from $850 · larger events from $1,200
            </p>
            <QuickEventBookForm source="small-events-page" ctaLabel="Request this date" />
            <div className="ht-side-links">
              <button type="button" className="ht-side-link" onClick={() => setWizardOpen(true)}>
                Want an instant estimate first? Open the detailed planner
              </button>
            </div>
          </div>
          <div className="ht-hero-photo ht-hero-photo--events service-hero__photo">
            <img
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/vjuesai2mxfavpq9d2df"
              alt="Private event catering by Local Effort Cooperative in Minneapolis"
              loading="eager"
            />
          </div>
        </section>

        {/* ── Proof ── */}
        <section className="service-quote">
          <figure className="ht-quote m-0">
            <blockquote className="m-0">&ldquo;Local Effort is truly top tier.&rdquo;</blockquote>
            <figcaption className="ht-quote-attr">
              —{' '}
              <a href="https://soupsistersmn.com" target="_blank" rel="noreferrer">
                Alyssa Andes
              </a>
            </figcaption>
          </figure>
        </section>

        {/* ── Photos ── */}
        <section className="service-gallery">
          <PhotoGrid
            tags={['event', 'dinner']}
            perPage={12}
            layout="masonry"
            className="small-events-gallery"
          />
        </section>
      </div>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="fullpage-demo-scope small-events-dialog max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
          <SmallEventsWizard initialType="dinner" onClose={() => setWizardOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmallEventsPage;
