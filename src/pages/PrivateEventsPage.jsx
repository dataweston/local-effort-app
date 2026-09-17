// /private-events — the page that sells the offer rather than a room, and
// carries both spaces behind a switch.
//
// The switch is two sheets on one mount board, not a segmented pill. Argument
// in docs/design/VENUES.md: Henstenburgh's sheet (RP-T-1898-A-3500) is hinged
// to a board, .specimen-figure--lifted already encodes "raised off the board",
// and a pill toggle is the single most generic control on the internet.
//
// The active venue is mirrored into ?venue= so an ad, an email or a Maps link
// can land someone on a specific room, and so the choice survives a share or a
// refresh. That is also why the switch is real navigation state rather than
// component state alone.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { SITE_NAME, SITE_URL } from '../config/siteMetadata';
import { VENUES, buildVenueJsonLd, isPublishable } from '../config/venues';
import VenueSheet from '../components/venues/VenueSheet';
import '../styles/fullpage-demo-theme.css';
import '../styles/home-tabs.css';
import '../styles/service-page.css';
import '../styles/venue-page.css';

const PATH = '/private-events';

const PrivateEventsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('venue');
  const initial = VENUES.find((venue) => venue.slug === requested)?.slug || VENUES[0].slug;
  const [activeSlug, setActiveSlug] = useState(initial);
  const tabRefs = useRef([]);

  // Someone pressing back should move the switch, not just the URL.
  useEffect(() => {
    if (requested && requested !== activeSlug && VENUES.some((v) => v.slug === requested)) {
      setActiveSlug(requested);
    }
  }, [requested, activeSlug]);

  const selectVenue = useCallback(
    (slug) => {
      setActiveSlug(slug);
      // replace: switching rooms is a view change, not a page someone should
      // have to press back through twice to leave.
      setSearchParams({ venue: slug }, { replace: true });
    },
    [setSearchParams],
  );

  // Roving focus across the two sheets, per the tabs pattern.
  const onKeyDown = (event) => {
    const index = VENUES.findIndex((venue) => venue.slug === activeSlug);
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % VENUES.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + VENUES.length) % VENUES.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = VENUES.length - 1;
    if (next === null) return;
    event.preventDefault();
    selectVenue(VENUES[next].slug);
    tabRefs.current[next]?.focus();
  };

  const active = VENUES.find((venue) => venue.slug === activeSlug) || VENUES[0];

  // Both venues are described here, because this page is the one that ranks for
  // the offer itself. Each venue's own page carries the canonical Place node;
  // this page references the same @ids so the two do not compete.
  const structuredData = useMemo(() => {
    const graph = [];
    for (const venue of VENUES) {
      const built = buildVenueJsonLd(venue, { siteUrl: SITE_URL, path: `/${venue.slug}` });
      graph.push(...built['@graph'].filter((node) => node['@type'] !== 'WebPage'));
    }
    graph.push({
      '@type': 'WebPage',
      '@id': `${SITE_URL}${PATH}`,
      name: `Private events at our place | ${SITE_NAME}`,
      isPartOf: { '@id': `${SITE_URL}#website` },
      about: VENUES.map((venue) => ({ '@id': `${SITE_URL}/${venue.slug}#service` })),
    });
    return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
  }, []);

  const anyPublishable = VENUES.some(isPublishable);

  return (
    <div className="fullpage-demo-scope service-page">
      <Helmet>
        <title>Private events at our place — Minneapolis | {SITE_NAME}</title>
        <meta
          name="description"
          content="Book a private event in one of Local Effort's two Minneapolis spaces. We cook, we serve, you pick the room and the night. Seasonal menus from Minnesota-grown ingredients."
        />
        <link rel="canonical" href={`${SITE_URL}${PATH}`} />
        {!anyPublishable && <meta name="robots" content="noindex,follow" />}
        <script type="application/ld+json">{structuredData}</script>
      </Helmet>

      <div className="ht-scope is-drawn service-page__body">
        <section className="venue-hero" style={{ paddingBottom: '0.5rem' }}>
          <p className="ht-kicker">private events —</p>
          <h1 className="venue-hero__name">Use our room instead of yours</h1>
          <p className="venue-hero__lede">
            The same cooking we do in your house, in one of ours. Two rooms, both
            ours, both with a kitchen behind them — pick the one that fits the
            night and we handle everything from the menu to the last plate.
          </p>
        </section>

        {/* ── The switch: two sheets on one mount ── */}
        <div style={{ marginTop: 'var(--service-rhythm)' }}>
          {/* The tablist itself is not focusable — focus lives on the tabs via
              roving tabindex, so the arrow-key handler belongs on each tab
              rather than on the container. */}
          <div
            className={`venue-switch venue-scope venue-scope--${active.accent}`}
            role="tablist"
            aria-label="Choose a space"
          >
            {VENUES.map((venue, index) => (
              <button
                key={venue.slug}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`venue-tab-${venue.slug}`}
                aria-selected={venue.slug === activeSlug}
                aria-controls={`venue-panel-${venue.slug}`}
                tabIndex={venue.slug === activeSlug ? 0 : -1}
                className={`venue-switch__sheet venue-scope--${venue.accent}`}
                onClick={() => selectVenue(venue.slug)}
                onKeyDown={onKeyDown}
              >
                {venue.nickname}
              </button>
            ))}
          </div>

          <div
            className="venue-switch__panel"
            role="tabpanel"
            id={`venue-panel-${active.slug}`}
            aria-labelledby={`venue-tab-${active.slug}`}
            // key forces a clean remount per room, so the calendar refetches and
            // a date picked at FIREHOUSE cannot survive into FOODIST's slip.
            key={active.slug}
          >
            <VenueSheet venue={active} headingLevel={2} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateEventsPage;
