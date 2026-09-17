// Venue registry accessors and the JSON-LD builder for /firehouse, /foodist
// and /private-events.
//
// Facts live in venues.json so the backend can require the same file; this
// module is the presentation and schema layer on top of it.
//
// The publishing gate is the important part. Google treats a name/address/phone
// mismatch against the Business Profile as a trust signal, and a wrong address
// in JSON-LD is worse than an absent one. So every Place-shaped node is gated
// on `verified`, and nothing here invents a fallback address.

import venuesData from './venues.json';

export const VENUES = venuesData.venues;

export const getVenue = (slug) => VENUES.find((venue) => venue.slug === slug) || null;

export const VENUE_SLUGS = VENUES.map((venue) => venue.slug);

/** True once every field the structured data depends on is real. */
export const isPublishable = (venue) => {
  if (!venue || venue.verified !== true) return false;
  const { address, geo, capacity } = venue;
  if (!address || Object.values(address).some((value) => !value || String(value).startsWith('TODO'))) {
    return false;
  }
  if (!geo || geo.lat == null || geo.lng == null) return false;
  if (!capacity || (capacity.seated == null && capacity.standing == null)) return false;
  return true;
};

/** Fields still holding placeholders — surfaced in the dev warning. */
export const missingFacts = (venue) => {
  const missing = [];
  const flag = (label, value) => {
    if (value == null || String(value).startsWith('TODO')) missing.push(label);
  };
  flag('name', venue.name);
  flag('headline', venue.headline);
  flag('summary', venue.summary);
  flag('address.street', venue.address?.street);
  flag('address.locality', venue.address?.locality);
  flag('address.postalCode', venue.address?.postalCode);
  flag('geo.lat', venue.geo?.lat);
  flag('geo.lng', venue.geo?.lng);
  flag('hours.earliest', venue.hours?.earliest);
  flag('hours.latest', venue.hours?.latest);
  if (venue.capacity?.seated == null && venue.capacity?.standing == null) missing.push('capacity');
  if (!venue.photos?.hero) missing.push('photos.hero');
  if (!venue.photos?.void) missing.push('photos.void');
  if (venue.roomFeeCents == null) missing.push('roomFeeCents');
  return missing;
};

const maxCapacity = (venue) =>
  Math.max(venue.capacity?.seated || 0, venue.capacity?.standing || 0) || null;

/**
 * JSON-LD for a single venue page.
 *
 * Emits, when the facts are verified:
 *   - Place        the room itself, with address + geo, so it can be matched
 *                  to the Business Profile and appear in Maps-adjacent surfaces
 *   - Service      what is actually sold: our food and service, at our room
 *   - WebPage      with a ReserveAction whose EntryPoint is the booking URL.
 *                  This is the node a Reserve-with-Google booking partner and
 *                  Google's own crawlers read to find the booking entry point.
 *
 * When the facts are not verified it emits only Service + WebPage, with no
 * address claims of any kind.
 */
export function buildVenueJsonLd(venue, { siteUrl, path }) {
  const pageUrl = `${siteUrl}${path}`;
  const publishable = isPublishable(venue);
  const graph = [];

  if (publishable) {
    graph.push({
      '@type': ['EventVenue', 'Place'],
      '@id': `${pageUrl}#venue`,
      name: venue.name,
      url: pageUrl,
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.address.street,
        addressLocality: venue.address.locality,
        addressRegion: venue.address.region,
        postalCode: venue.address.postalCode,
        addressCountry: venue.address.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: venue.geo.lat,
        longitude: venue.geo.lng,
      },
      ...(venue.phone ? { telephone: venue.phone } : {}),
      ...(maxCapacity(venue) ? { maximumAttendeeCapacity: maxCapacity(venue) } : {}),
      ...(venue.amenities?.length
        ? {
            amenityFeature: venue.amenities.map((name) => ({
              '@type': 'LocationFeatureSpecification',
              name,
              value: true,
            })),
          }
        : {}),
      isAccessibleForFree: false,
    });
  }

  // The primary home is the business's own premises, so the venue Place and the
  // site-wide LocalBusiness (index.html:41-54) describe one physical address.
  // Two unlinked nodes at one address read as duplicate entities, which is the
  // opposite of what a Business Profile match needs. Nodes sharing an @id merge
  // in a JSON-LD graph, so this fragment attaches the venue to the existing
  // business node rather than declaring a competing one.
  if (publishable && venue.isPrimaryHome) {
    graph.push({
      '@id': `${siteUrl}#business`,
      location: { '@id': `${pageUrl}#venue` },
    });
  }

  graph.push({
    '@type': 'Service',
    '@id': `${pageUrl}#service`,
    name: `Private events at ${venue.nickname} — Local Effort Cooperative`,
    serviceType: 'Private event catering at our venue',
    url: pageUrl,
    provider: { '@id': `${siteUrl}#business` },
    ...(publishable
      ? {
          areaServed: {
            '@type': 'City',
            name: venue.address.locality,
          },
          location: { '@id': `${pageUrl}#venue` },
        }
      : {}),
    ...(venue.roomFeeCents != null
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: (venue.roomFeeCents / 100).toFixed(2),
            description: 'Room fee; food and service are quoted per guest.',
            availability: 'https://schema.org/InStock',
            url: pageUrl,
          },
        }
      : {}),
  });

  graph.push({
    '@type': 'WebPage',
    '@id': pageUrl,
    name: `${venue.nickname} — private events | Local Effort Cooperative`,
    isPartOf: { '@id': `${siteUrl}#website` },
    about: { '@id': `${pageUrl}#service` },
    // The booking entry point. A ReserveAction is what a booking partner and
    // Google's crawlers look for to find where a date is actually held; the
    // urlTemplate accepts a preselected date so an ad or a Maps link can land
    // someone directly on a night.
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${pageUrl}?date={date}`,
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: {
        '@type': 'Reservation',
        name: `Event booking at ${venue.nickname}`,
      },
    },
  });

  return { '@context': 'https://schema.org', '@graph': graph };
}

export default VENUES;
