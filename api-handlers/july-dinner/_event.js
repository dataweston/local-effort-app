// Shared config for the July Dinner (/julydinner).
// Content comes from Sanity (dinnerEvent doc, slug "july-dinner") with hard
// fallbacks so the page and checkout keep working if Sanity is unreachable.
// Price and capacity are ALWAYS resolved here server-side — the client never
// dictates the charge amount.

const sanity = require('@sanity/client');
const { getSupabase } = require('../../backend/api/supabaseClient');

const SLUG = 'july-dinner';
const REGISTRATIONS_TABLE = 'july_dinner_registrations';

// Must match BEVERAGE_OPTIONS in src/pages/JulyDinnerPage.jsx.
const BEVERAGE_OPTIONS = [
  'single glass of wine',
  'single beer',
  'lots of wine',
  'lots of beer',
  'liquor',
  'liquor and cocktails',
  'cocktails and wine',
  'prefer non alcoholic',
  'prefer tea',
  'prefer diet coke',
  'prefer sparkling water',
  'prefer thc',
];

const DEFAULT_EVENT = {
  title: 'Dinner in July',
  dateLabel: 'Friday, July 17, 2026',
  timeLabel: '6:30 in the evening',
  eventDateTime: '2026-07-17T18:30:00-05:00',
  location: 'The Arthouse',
  locationDetails: 'North Minneapolis — full address and arrival details come by email',
  priceCents: 7000,
  capacity: 20,
  buyoutPriceCents: 255000,
  buyoutCapacity: 30,
  maxSeatsPerOrder: 8,
  summary:
    'One long table at the Arthouse in North Minneapolis. A multi-course dinner drawn from what Minnesota farms are pulling out of the ground in the middle of July.',
  included:
    'Your seat includes the full multi-course dinner and a non-alcoholic beverage.',
  beverageNote:
    'A non-alcoholic beverage is included with every seat, and there will be plenty more to drink the night of — tell us below what you like.',
  menu: [],
  status: 'onSale',
  heroImageUrl: null,
};

const projectId =
  process.env.VITE_APP_SANITY_PROJECT_ID ||
  process.env.VITE_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID;
const dataset =
  process.env.VITE_APP_SANITY_DATASET ||
  process.env.VITE_SANITY_DATASET ||
  process.env.SANITY_DATASET;

const sanityClient =
  projectId && dataset
    ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' })
    : null;

async function getEventConfig() {
  if (!sanityClient) return { ...DEFAULT_EVENT, source: 'defaults' };
  try {
    const doc = await sanityClient.fetch(
      `*[_type == "dinnerEvent" && slug.current == $slug][0]{
        title, dateLabel, timeLabel, eventDateTime, location, locationDetails,
        priceCents, capacity, buyoutPriceCents, buyoutCapacity,
        summary, included, beverageNote,
        menu[]{course, description}, status,
        "heroImageUrl": heroImage.asset->url
      }`,
      { slug: SLUG }
    );
    if (!doc) return { ...DEFAULT_EVENT, source: 'defaults' };
    const merged = { ...DEFAULT_EVENT, source: 'sanity' };
    for (const [key, value] of Object.entries(doc)) {
      if (value !== null && value !== undefined && value !== '') merged[key] = value;
    }
    for (const moneyKey of ['priceCents', 'capacity', 'buyoutPriceCents', 'buyoutCapacity']) {
      if (!Number.isInteger(merged[moneyKey]) || merged[moneyKey] <= 0) {
        merged[moneyKey] = DEFAULT_EVENT[moneyKey];
      }
    }
    return merged;
  } catch (err) {
    console.warn('[july-dinner] sanity fetch failed, using defaults:', err?.message);
    return { ...DEFAULT_EVENT, source: 'defaults' };
  }
}

// Seats already sold, from Supabase. Returns null when storage is unavailable
// (callers decide whether to fail open or closed). A buy-out row carries
// quantity = capacity, so it zeroes the inventory like any other sale.
async function getSeatsSold() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from(REGISTRATIONS_TABLE).select('quantity');
  if (error) {
    console.warn('[july-dinner] seats query failed:', error.message);
    return null;
  }
  return (data || []).reduce((sum, row) => sum + (Number(row.quantity) || 1), 0);
}

module.exports = { getEventConfig, getSeatsSold, REGISTRATIONS_TABLE, SLUG, BEVERAGE_OPTIONS };
