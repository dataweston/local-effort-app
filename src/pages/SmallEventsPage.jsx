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

// What each kind of event actually is, and what it starts at. Naming the three
// shapes up front stops the "is this for me?" bounce.
const EVENT_SHAPES = [
  {
    name: 'Dinner party at your home',
    guests: '4–16 guests',
    from: 'from $850',
    body: 'A chef cooks a multi-course seasonal menu in your kitchen and serves it at your table. The most common thing we do.',
  },
  {
    name: 'Showers, birthdays, celebrations',
    guests: 'up to 40 guests',
    from: 'from $1,200',
    body: 'Baby and wedding showers, milestone birthdays, graduations. Passed plates or a served table, built around the season.',
  },
  {
    name: 'Office & holiday parties',
    guests: 'up to 75 guests',
    from: 'from $1,200',
    body: 'Corporate-friendly, invoice-friendly. Holiday parties, team dinners, client events, open houses.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What happens after I request a date?',
    a: 'A chef replies within one business day to confirm the date is open and ask about your guests, the space, and what you are hoping for. Nothing is charged until the date and details are settled together.',
  },
  {
    q: 'What does it cost?',
    a: 'Dinner and pizza parties start at $850; larger events start at $1,200. Per-guest rates run roughly $35–$150 depending on the menu and service. You get a written estimate before anything is booked.',
  },
  {
    q: 'How far ahead should I book?',
    a: 'Two to four weeks is comfortable for a dinner party; six or more for a wedding, shower, or holiday party. Ask about short notice anyway — we sometimes have a week open.',
  },
  {
    q: 'Do you cook in my kitchen or bring a setup?',
    a: 'Usually your kitchen — that is the point of a private chef. For larger events and pizza parties we bring what the space needs. We walk through it with you before the day.',
  },
  {
    q: 'Can you handle allergies and dietary needs?',
    a: 'Yes, and we would rather over-plan than improvise. Tell us about every guest restriction when we confirm the menu.',
  },
  {
    q: 'What does a deposit hold?',
    a: 'A deposit holds your date on our calendar. Until you have one in place the date is not reserved, even after we have talked.',
  },
];

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
        {
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        },
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

        {/* ── Which of the three shapes is yours ── */}
        <section className="service-steps" aria-labelledby="small-events-shapes">
          <div className="service-steps__intro">
            <p className="ht-kicker">what we cook —</p>
            <h2 id="small-events-shapes">Three shapes an event takes</h2>
          </div>
          <ol className="service-steps__list service-steps__list--plain">
            {EVENT_SHAPES.map((shape) => (
              <li key={shape.name}>
                <h3>{shape.name}</h3>
                <p className="ht-facts" style={{ marginTop: '0.35rem' }}>
                  {shape.guests} · {shape.from}
                </p>
                <p>{shape.body}</p>
              </li>
            ))}
          </ol>
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

        {/* ── How it works ── */}
        <section className="service-steps" aria-labelledby="small-events-how">
          <div className="service-steps__intro">
            <p className="ht-kicker">how it works —</p>
            <h2 id="small-events-how">From a date to a dinner</h2>
          </div>
          <ol className="service-steps__list">
            <li>
              <h3>Request your date</h3>
              <p>
                One form, above. We reply within one business day to say whether
                the date is open.
              </p>
            </li>
            <li>
              <h3>We write the menu together</h3>
              <p>
                A chef talks through guests, the space, allergies, and what is in
                season, then sends a written estimate.
              </p>
            </li>
            <li>
              <h3>A deposit holds it</h3>
              <p>
                Your date is reserved once a deposit is in place. We cook, serve,
                and clean the kitchen on the day.
              </p>
            </li>
          </ol>
        </section>

        {/* ── FAQ ── */}
        <section className="service-faq" aria-labelledby="small-events-faq">
          <p className="ht-kicker">questions —</p>
          <h2 id="small-events-faq">Before you book</h2>
          <div className="service-faq__list">
            {FAQ_ITEMS.map((item) => (
              <details className="ht-recent-menu" key={item.q}>
                <summary>
                  <span>{item.q}</span>
                  <span className="ht-recent-menu__hint">answer</span>
                </summary>
                <div className="ht-recent-menu__body">
                  <p className="ht-copy" style={{ marginTop: 0 }}>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
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

        {/* ── The ask, again, at the end ── */}
        <section className="service-close">
          <div className="ht-slip">
            <p className="ht-kicker">book —</p>
            <h2 className="ht-heading">Tell us the date you&apos;re hoping for</h2>
            <span className="ht-rule-line" aria-hidden="true" />
            <p className="ht-copy">
              We confirm within one business day. No payment until the details are
              settled together.
            </p>
            <QuickEventBookForm source="small-events-page-close" ctaLabel="Request this date" />
          </div>
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
