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

export default function VenuePage({ slug, path, displayName }) {
  const venue = getVenue(slug);

  const displayVenue = useMemo(() => {
    if (!venue || !displayName) return venue;
    return {
      ...venue,
      nickname: displayName,
      kicker: 'local kitchen —',
      headline: displayName,
      summary:
        'Book Local Kitchen, a private event space from Local Effort Cooperative in Minneapolis–St. Paul. Our room, our kitchen, seasonal menus from Minnesota-grown ingredients.',
    };
  }, [displayName, venue]);

  const structuredData = useMemo(
    () =>
      (displayVenue ? JSON.stringify(buildVenueJsonLd(displayVenue, { siteUrl: SITE_URL, path })) : null),
    [displayVenue, path],
  );

  if (!displayVenue) return null;

  const locality =
    displayVenue.address?.locality && !String(displayVenue.address.locality).startsWith('TODO')
      ? displayVenue.address.locality
      : 'Minneapolis–St. Paul';
  const title = `${displayVenue.nickname} — private events in ${locality} | ${SITE_NAME}`;
  const description =
    displayVenue.summary && !String(displayVenue.summary).startsWith('TODO')
      ? displayVenue.summary
      : `Book ${displayVenue.nickname}, an event space from Local Effort Cooperative in Minneapolis–St. Paul. Our kitchen, our room, seasonal menus from Minnesota-grown ingredients.`;

  return (
    <div className="fullpage-demo-scope service-page">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${SITE_URL}${path}`} />
        {displayVenue.photos?.hero && (
          <meta property="og:image" content={`${SITE_URL}${displayVenue.photos.hero}`} />
        )}
        {/* Subscribers and crawlers can discover the feed without reading the
            page body. */}
        <link
          rel="alternate"
          type="text/calendar"
          href={`${SITE_URL}/api/venues/${displayVenue.slug}/calendar.ics`}
          title={`${displayVenue.nickname} availability`}
        />
        {/* An unverified venue must not be indexed: the page is real but its
            address, capacity and rate are still placeholders, and an indexed
            placeholder is worse than a page Google has not seen yet. */}
        {!isPublishable(displayVenue) && <meta name="robots" content="noindex,follow" />}
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope is-drawn service-page__body">
        <VenueSheet
          venue={displayVenue}
          headingLevel={1}
          showWordmark={displayName === 'Local Kitchen'}
        />
      </div>
    </div>
  );
}

VenuePage.propTypes = {
  slug: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  displayName: PropTypes.string,
};

VenuePage.defaultProps = {
  displayName: null,
};
