// Single source of truth for route metadata.
// Drives: prerender, sitemap, <head> meta, vercel.json routing.

export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'Local Effort Cooperative - Minneapolis Personal Chef',
    description: 'Local Effort Cooperative is a Minneapolis personal chef team offering in-home dinners, meal prep plans, and small-event catering built around Minnesota-grown ingredients.',
    prerender: true,
  },
  {
    path: '/blog',
    title: 'Local Report - Local Effort Cooperative',
    description: 'Dispatches, updates, and kitchen notes from Local Effort Cooperative',
    prerender: true,
  },
  {
    path: '/releases',
    title: 'Press & Releases - Local Effort Cooperative',
    description: 'News, press coverage, and updates from Local Effort Cooperative',
    prerender: true,
  },
  {
    path: '/sale',
    title: 'Shop Seasonal Food Drops & Preorders - Local Effort Cooperative',
    description: 'Shop the Local Effort sale for seasonal food drops, pantry goods, and limited preorders with Minneapolis pickup and local delivery.',
    prerender: true,
  },
  {
    path: '/happymonday',
    title: 'For Happy Monday - Local Effort Cooperative',
    description: 'Local Effort menu and ordering for Happy Monday.',
    prerender: true,
  },
  {
    path: '/pizza-party',
    title: 'Pizza Party - Local Effort Cooperative',
    description: 'Book a wood-fired pizza party with Local Effort in Minneapolis-St. Paul.',
    prerender: true,
  },
  {
    path: '/julydinner',
    title: 'Local Effort Cooperative Serves Summer - July 17 Dinner at the Arthouse | Tickets',
    description: 'A summer dinner from Local Effort Cooperative: Friday, July 17, 2026 at the Arthouse, 4400 Lyndale Ave N in Camden, Minneapolis. One long table, a multi-course menu from Minnesota farms, $70 a seat. Book online.',
    prerender: true,
  },
  {
    path: '/winterdinner',
    title: 'Winter Dinner - Local Effort Cooperative',
    description: 'Seasonal winter dinner experience from Local Effort.',
    prerender: false,
  },
  {
    path: '/winterpizza',
    title: 'Winter Pizza - Local Effort Cooperative',
    description: 'Winter pizza pop-up from Local Effort.',
    prerender: false,
  },
  {
    path: '/february',
    title: 'February Menu - Local Effort Cooperative',
    description: 'February seasonal menu from Local Effort Cooperative',
    prerender: true,
  },
  {
    path: '/psyche',
    title: 'Buy Psyche Olive Oil - 3L Extra-Virgin | Local Effort Cooperative',
    description: 'Buy Psyche extra-virgin olive oil (3 L bag-in-box) from Local Effort Cooperative in Minneapolis. Single-estate koroneiki from Greece - bright, peppery, EVA-certified. $90 with free local delivery.',
    prerender: true,
  },
  {
    path: '/januarymeals',
    title: 'January Meals - Local Effort Cooperative',
    description: 'January meal prep offerings from Local Effort.',
    prerender: false,
  },
  {
    path: '/book',
    title: 'Book a Private Event - Local Effort Cooperative',
    description: 'Book a chef-led dinner party, pizza party, wedding, or small event with Local Effort Cooperative in Minneapolis-St. Paul. Get an instant estimate and hold your date with a deposit.',
    prerender: true,
  },
  {
    path: '/localist',
    title: 'Localist - Weekly Meals Text List - Local Effort Cooperative',
    description: 'Join the Localist text list: every Monday we text a limited menu of salads and hot bowls for Tuesday/Wednesday pickup in North Minneapolis.',
    prerender: false,
  },
];

// Dynamic routes - slugs resolved from Sanity at build time
export const DYNAMIC_ROUTES = [
  { pattern: '/product/:slug', sanityQuery: '*[_type == "product" && defined(slug.current) && active == true][].slug.current' },
  { pattern: '/blog/:slug', sanityQuery: '*[_type == "blogPost" && defined(slug.current)][].slug.current' },
];

// Internal routes - noindex, never prerendered
export const INTERNAL_ROUTES = [
  '/finefoods',
  '/auth',
  '/inbox',
  '/campaigns',
  '/admin/',
  '/weeklydemo',
  '/weekly-order',
  '/portal/',
  '/catherine-schedule',
  '/partners/',
  '/schedule/',
  '/hub',
  '/brain',
  '/native-mobile-hub',
  '/meal-prep-intake',
];
