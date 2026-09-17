// The shell for a single-venue page (/firehouse, /foodist).
//
// Google-first, concretely, means three things here and they are all in this
// file rather than spread across the pages:
//
//   1. The route is prerendered (src/config/routes.js + src/ssr/StaticApp.jsx +
//      vercel.json), so an ad click and a crawler both get HTML, not an empty
//      div waiting on React. A Google Ads landing page that renders client-side
//      is a landing page that gets scored on a blank screen.
//   2. The JSON-LD carries a ReserveAction whose EntryPoint accepts a date, so
//      a booking partner or a Maps surface has a documented way in.
//   3. Nothing about the address is claimed until the facts are verified. See
//      buildVenueJsonLd in src/config/venues.js.

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_URL } from '../../config/siteMetadata';
import { getVenue, buildVenueJsonLd, isPublishable } from '../../config/venues';
import VenueSheet from './VenueSheet';
import '../../styles/fullpage-demo-theme.css';
import '../../styles/home-tabs.css';
import '../../styles/service-page.css';
import '../../styles/venue-page.css';

export default function VenuePage({ slug, path }) {
  const venue = getVenue(slug);

  const structuredData = useMemo(
    () => (venue ? JSON.stringify(buildVenueJsonLd(venue, { siteUrl: SITE_URL, path })) : null),
    [venue, path],
  );

  if (!venue) return null;

  const title = `${venue.nickname} — private events in Minneapolis | ${SITE_NAME}`;
  const description =
    venue.summary && !String(venue.summary).startsWith('TODO')
      ? venue.summary
      : `Book ${venue.nickname}, an event space from Local Effort Cooperative in Minneapolis–St. Paul. Our kitchen, our room, seasonal menus from Minnesota-grown ingredients.`;

  return (
    <div className="fullpage-demo-scope service-page">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}${path}`} />
        {/* Subscribers and crawlers can discover the feed without reading the
            page body. */}
        <link
          rel="alternate"
          type="text/calendar"
          href={`${SITE_URL}/api/venues/${venue.slug}/calendar.ics`}
          title={`${venue.nickname} availability`}
        />
        {/* An unverified venue must not be indexed: the page is real but its
            address, capacity and rate are still placeholders, and an indexed
            placeholder is worse than a page Google has not seen yet. */}
        {!isPublishable(venue) && <meta name="robots" content="noindex,follow" />}
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope is-drawn service-page__body">
        <VenueSheet venue={venue} headingLevel={1} />
      </div>
    </div>
  );
}

VenuePage.propTypes = {
  slug: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
};
