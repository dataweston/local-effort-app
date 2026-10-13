// Single source of truth for route metadata.
// Drives: prerender, sitemap, <head> meta, vercel.json routing.

import { VENUES, getVenue, isPublishable } from './venues';

export const PUBLIC_ROUTES = [
  {
    path: '/pizza-on-smith',
    title: 'Pizza on Smith | Local Effort Cooperative',
    description: 'Limited-time drops of Neapolitan-inspired frozen pizza made with Midwest ingredients. Pickup in West St. Paul, metro delivery, or shipping after each order window closes.',
    prerender: true,
  },
  {
    path: '/',
    title: 'Local Effort Cooperative - Minneapolis Personal Chef',
    description: 'Local Effort Cooperative is a Minneapolis personal chef team offering in-home dinners, meal prep plans, and small-event catering built around Minnesota-grown ingredients.',
    prerender: true,
  },
  {
    path: '/blog',
    title: 'Local Report: Kitchen Stories | Local Effort Cooperative',
    description: 'Read kitchen stories, cooperative updates, and dispatches from Local Effort, a Minneapolis personal chef team cooking with Minnesota-grown ingredients.',
    prerender: true,
  },
  {
    path: '/releases',
    title: 'Press & Releases - Local Effort Cooperative',
    description: 'Find Local Effort Cooperative press releases, business updates, media contacts, and resources for coverage of our Minneapolis food cooperative.',
    prerender: true,
  },
  {
    path: '/sale',
    title: 'Shop Seasonal Food Drops & Preorders - Local Effort Cooperative',
    description: 'Shop the Local Effort sale for seasonal food drops, pantry goods, and limited preorders with Minneapolis pickup and local delivery.',
    prerender: true,
  },
  {
    path: '/gift-cards',
    title: 'Gift Cards - Local Effort Cooperative',
    description: 'Send a Local Effort gift card for private dinners, pizza parties, weekly meals, and other chef-made experiences in Minneapolis-St. Paul.',
    prerender: true,
  },
  {
    path: '/chez-garage',
    title: 'Chez Garage - Hyper-Casual Dining Pop-Up in Edina | Local Effort Cooperative',
    description: 'Chez Garage is hyper-casual dining from Local Effort Cooperative: a pop-up in Edina, Minnesota serving pub pizza, smoked and braised meats, and pantry goods. Order online for pickup or local delivery, or book Chez Garage at your own house for up to 40 guests.',
    prerender: true,
    // The catalogue and the Product/FoodEvent/FAQ JSON-LD come from the page's
    // Helmet, which only reaches the prerendered HTML because the route is
    // SSR-rendered in src/ssr/StaticApp.jsx — keep both entries in sync.
  },
  {
    path: '/return-policy',
    title: 'Return & Exchange Policy - Local Effort Cooperative',
    description: 'Return and exchange policy for Local Effort Cooperative products: five-day window, free return shipping by mail, and no restocking fees.',
    prerender: true,
  },
  {
    path: '/happymonday',
    title: 'Happy Monday Coffee Menu | Local Effort Cooperative',
    description: 'Explore Local Effort food at Happy Monday Coffee in Roseville, including local pizza, menu details, and ingredient lists from our Minneapolis cooperative.',
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
    description: 'A summer dinner from Local Effort Cooperative: Friday, July 17, 2026 at the Arthouse, 4400 Lyndale Ave N in Minneapolis. One long table, a multi-course menu from Minnesota farms, $70 a seat. Book online.',
    prerender: true,
    // FoodEvent JSON-LD comes from the page's Helmet (buildEventJsonLd in
    // JulyDinnerPage.jsx), which reaches the prerendered HTML because the page
    // is SSR-rendered in src/ssr/StaticApp.jsx — keep that route entry.
  },
  {
    path: '/winterdinner',
    title: 'Winter Dinner - Local Effort Cooperative',
    description: 'Seasonal winter dinner experience from Local Effort.',
    prerender: true,
  },
  {
    path: '/winterpizza',
    title: 'Winter Pizza - Local Effort Cooperative',
    description: 'Winter pizza pop-up from Local Effort.',
    prerender: true,
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
    prerender: true,
  },
  {
    path: '/book',
    title: 'Book a Private Event - Local Effort Cooperative',
    description: 'Book a chef-led dinner party, pizza party, wedding, or small event with Local Effort Cooperative in Minneapolis-St. Paul. Get an instant estimate and hold your date with a deposit.',
    prerender: true,
  },
  {
    path: '/localist',
    title: 'Become a Localist — Membership | Local Effort Cooperative',
    description: 'Become a Localist: membership in a worker-owned Minneapolis food cooperative. Every staff member is offered equity. $45/month or $375/year — waived for anyone who needs it. Members get pickup menus, perks, and 4% back as credit every quarter.',
    prerender: true,
  },
  {
    path: '/weekly-meals',
    title: 'Twin Cities Weekly Meal Prep | Local Effort Cooperative',
    description: 'Weekly chef-made meals delivered across Minneapolis–St. Paul. Dinners from $18 per person and breakfasts from $13.50, made with Minnesota-grown ingredients.',
    prerender: true,
  },
  {
    path: '/small-events',
    title: 'Twin Cities Private Catering | Local Effort Cooperative',
    description: 'Book private chef catering for dinners, showers, weddings, and office parties in Minneapolis–St. Paul. Seasonal Midwest menus for gatherings of 4–75.',
    prerender: true,
  },
  {
    path: '/308b-member',
    title: '308B Member Offerings — Invest in the Cooperative | Local Effort Cooperative',
    description: 'Local Effort Cooperative is raising from its members under Minnesota Chapter 308B. Three member offerings: a kitchen equipment note, a local-farm purchasing fund, and patronage-linked member capital.',
    prerender: true,
    sitemap: false, // Member investment information intentionally remains noindex.
  },
  {
    path: '/office-catering',
    title: 'Twin Cities Office Catering | Local Effort Cooperative',
    description: 'Order sandwich trays, salads, and baked goods for Minneapolis–St. Paul offices. Local Effort catering has a $150 minimum and needs 48 hours’ notice.',
    prerender: true,
  },
  // The two event spaces and the offer page that carries both.
  //
  // Prerendered because these are Google Ads landing pages: a client-rendered
  // landing page is scored on whatever the crawler sees, which is an empty
  // div. The pages additionally emit noindex from the component while
  // src/config/venues.json still holds placeholders, so prerendering them now
  // is safe — the HTML exists for ads, and the index stays clean until the
  // owner verifies the addresses.
  {
    path: '/firehouse',
    title: 'FIREHOUSE — Private Event Space in St. Paul | Local Effort Cooperative',
    description: 'Book FIREHOUSE, an event space from Local Effort Cooperative. Our room, our kitchen, seasonal menus from Minnesota-grown ingredients. Check the calendar and request a date.',
    prerender: true,
    sitemap: isPublishable(getVenue('firehouse')),
  },
  {
    path: '/localkitchen',
    title: 'Local Kitchen — Private Event Space in Minneapolis | Local Effort Cooperative',
    description: 'Book Local Kitchen, an event space from Local Effort Cooperative. Our room, our kitchen, seasonal menus from Minnesota-grown ingredients. Check the calendar and request a date.',
    prerender: true,
    sitemap: isPublishable(getVenue('foodist')),
  },
  {
    path: '/private-events',
    title: 'Private Events at Our Place — Two Minneapolis Spaces | Local Effort Cooperative',
    description: 'Host your private event in one of Local Effort Cooperative’s two Minneapolis spaces. We cook and serve; you pick the room and the night. Seasonal menus from 100% Minnesota-grown ingredients.',
    prerender: true,
    sitemap: VENUES.some(isPublishable),
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
  '/planner',
  '/weekly-order',
  '/portal/',
  '/catherine-schedule',
  '/partners/',
  '/schedule/',
  '/hub',
  '/brain',
  '/native-mobile-hub',
  '/meal-prep-intake',
  '/annual-report',
];
