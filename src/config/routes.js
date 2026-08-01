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
    title: 'Become a Localist — Membership | Local Effort Cooperative',
    description: 'Become a Localist: membership in a worker-owned Minneapolis food cooperative. Every staff member is offered equity. $45/month or $375/year — waived for anyone who needs it. Members get pickup menus, perks, and 4% back as credit every quarter.',
    prerender: true,
  },
  {
    path: '/weekly-meals',
    title: 'Weekly Meal Prep Delivery in Minneapolis–St. Paul | Local Effort Cooperative',
    description: 'Weekly personal-chef meal prep delivered across Minneapolis–St. Paul. Home-cooked dinners from $18 a person, breakfasts from $13.50, from Minnesota-grown ingredients. Sign up in under a minute.',
    prerender: true,
  },
  {
    path: '/small-events',
    title: 'Private Event Catering in Minneapolis–St. Paul | Local Effort Cooperative',
    description: 'Private chef catering for dinner parties, showers, weddings, and office parties across Minneapolis–St. Paul. Seasonal menus from 100% Midwest ingredients, 4–75 guests. Dinner parties from $850.',
    prerender: true,
  },
  {
    path: '/308b-member',
    title: '308B Member Offerings — Invest in the Cooperative | Local Effort Cooperative',
    description: 'Local Effort Cooperative is raising from its members under Minnesota Chapter 308B. Three member offerings: a kitchen equipment note, a local-farm purchasing fund, and patronage-linked member capital.',
    prerender: true,
  },
  {
    path: '/office-catering',
    title: 'Office Catering Minneapolis - Sandwich Trays, Salads & Baked Goods | Local Effort Cooperative',
    description: 'Order office catering in Minneapolis-St. Paul: sandwich trays, big-bowl salads that feed 8-10, and baked goods by the dozen from Local Effort Cooperative. $150 minimum, 48-hour lead time, $40 delivery - free at $750+. Invoice-friendly.',
    prerender: true,
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
];
