// src/pages/SmallEventsPage.jsx
//
// /small-events — the FIREHOUSE page's instrument without the room. The party is
// at the client's own place, so "the room" is the calendar of nights we are free
// to cook, and picking one and paying the deposit is the whole page.
//
// Everything below the title is src/components/venues/VenueSheet.jsx, the same
// body /firehouse and /localkitchen use, so the three booking pages cannot drift
// apart. This file only supplies the Small Events facts (src/config/smallEventsVenue.js),
// the head, and the structured data.
//
// Availability is the universal calendar's `client` resource
// (docs/design/UNIVERSAL-CALENDAR.md): open unless a FIREHOUSE or Local Kitchen
// booking, an owner block or the shared Foodist calendar takes the date. An
// Airbnb block does not close it, because Airbnb only governs the FIREHOUSE.
import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import VenueSheet from '../components/venues/VenueSheet';
import { SMALL_EVENTS_VENUE } from '../config/smallEventsVenue';
import { SERVICE_STYLES, MIN_GUESTS, MAX_GUESTS } from '../config/eventPricing';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';
import '../styles/venue-page.css';

const PATH = '/small-events';
const TITLE = `Private event catering — book a date | ${SITE_NAME}`;
const DESCRIPTION =
  `Book a Local Effort chef for your own place: dinner parties, showers, office and holiday ` +
  `parties for ${MIN_GUESTS}–${MAX_GUESTS} guests in Minneapolis–St. Paul. Pick an open date and ` +
  `pay the deposit online. Seasonal menus from Midwest-sourced ingredients.`;

const SmallEventsPage = () => {
  // Offers are generated from the same table the server prices from, so the
  // markup cannot advertise a rate the checkout will not charge.
  const structuredData = useMemo(
    () =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'FoodService',
            '@id': `${SITE_URL}${PATH}#service`,
            name: 'Local Effort Cooperative — Private Event Catering',
            url: `${SITE_URL}${PATH}`,
            description: DESCRIPTION,
            provider: { '@id': `${SITE_URL}#business` },
            areaServed: [
              { '@type': 'City', name: 'Minneapolis' },
              { '@type': 'City', name: 'Saint Paul' },
              { '@type': 'Place', name: 'Twin Cities Metro, Minnesota' },
            ],
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Private event catering by service style',
              itemListElement: SERVICE_STYLES.map((style) => ({
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: style.label,
                  serviceType: 'Event catering',
                  category: 'Event Catering',
                },
                priceSpecification: {
                  '@type': 'PriceSpecification',
                  priceCurrency: 'USD',
                  minPrice: String(style.minCents / 100),
                  maxPrice: String(style.maxCents / 100),
                  unitText: 'per guest',
                },
              })),
            },
            potentialAction: {
              '@type': 'ReserveAction',
              name: 'Book a date',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}${PATH}?date={date}`,
                actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'],
              },
            },
          },
          {
            '@type': 'WebPage',
            '@id': `${SITE_URL}${PATH}`,
            name: TITLE,
            description: DESCRIPTION,
            isPartOf: { '@id': `${SITE_URL}#website` },
            about: { '@id': `${SITE_URL}${PATH}#service` },
          },
        ],
      }),
    [],
  );

  return (
    <div className="fullpage-demo-scope service-page">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}${PATH}`} />
        <meta property="og:image" content={SMALL_EVENTS_VENUE.photos.hero} />
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope is-drawn service-page__body">
        <VenueSheet venue={SMALL_EVENTS_VENUE} headingLevel={1} />
      </div>
    </div>
  );
};

export default SmallEventsPage;
