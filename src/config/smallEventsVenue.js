// /small-events is the FIREHOUSE page's booking sheet with the room taken out:
// the party is at the client's place, so the "venue" is the calendar of nights
// we are free to cook, and the room fee is zero.
//
// It is shaped like a venues.json entry so VenueSheet can render it, but it is
// deliberately NOT in venues.json: the backend, sitemap and /private-events all
// iterate that file for real rooms, and this is not one. The backend knows the
// same resource as the `client` calendar (backend/api/calendar/graph.js).
//
// Copy is carried over unchanged from the previous /small-events page. Prices
// are not stated here: they come from src/config/eventPricing.js, the same file
// the server prices from.

export const SMALL_EVENTS_SLUG = 'client';

export const SMALL_EVENTS_VENUE = {
  slug: SMALL_EVENTS_SLUG,
  nickname: 'Small Events',
  accent: 'apple',
  headline: 'Minnesotan food for Minnesotans',
  summary:
    'Dinner parties, showers, office and holiday parties. Seasonal menus from 100% Midwest-sourced ingredients, cooked and served at your place.',
  photos: {
    hero: 'https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/vjuesai2mxfavpq9d2df',
    heroAlt: 'Private event catering by Local Effort Cooperative in Minneapolis',
    plates: [],
  },
  capacity: null,
  roomFeeCents: null,
};
