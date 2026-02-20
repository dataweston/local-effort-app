// Single source of truth for route metadata.
// Drives: prerender, sitemap, <head> meta, vercel.json routing.

export const PUBLIC_ROUTES = [
  {
    path: '/',
    title: 'Local Effort Food Co. — Minneapolis Personal Chef',
    description: 'Local Effort Food Co. is a Minneapolis personal chef team offering in-home dinners, meal prep plans, and small-event catering built around Minnesota-grown ingredients.',
    prerender: true,
  },
  {
    path: '/releases',
    title: 'Press & Releases — Local Effort Food Co.',
    description: 'News, press coverage, and updates from Local Effort Food Co.',
    prerender: true,
  },
  {
    path: '/sale',
    title: 'Shop — Local Effort Food Co.',
    description: 'Order from Local Effort Food Co. Fresh, local, Minneapolis-made.',
    prerender: true,
  },
  {
    path: '/weekly',
    title: 'Weekly Updates — Local Effort Food Co.',
    description: 'Weekly menus, stories, and updates from the Local Effort kitchen.',
    prerender: true,
  },
  {
    path: '/happymonday',
    title: 'For Happy Monday — Local Effort Food Co.',
    description: 'Local Effort menu and ordering for Happy Monday.',
    prerender: true,
  },
  {
    path: '/pizza-party',
    title: 'Pizza Party — Local Effort Food Co.',
    description: 'Book a wood-fired pizza party with Local Effort in Minneapolis-St. Paul.',
    prerender: true,
  },
  {
    path: '/winterdinner',
    title: 'Winter Dinner — Local Effort Food Co.',
    description: 'Seasonal winter dinner experience from Local Effort.',
    prerender: false,
  },
  {
    path: '/winterpizza',
    title: 'Winter Pizza — Local Effort Food Co.',
    description: 'Winter pizza pop-up from Local Effort.',
    prerender: false,
  },
  {
    path: '/february',
    title: 'February Menu — Local Effort Food Co.',
    description: 'February seasonal menu from Local Effort Food Co.',
    prerender: false,
  },
  {
    path: '/psyche',
    title: 'Psyche — Local Effort Food Co.',
    description: 'Psyche experience by Local Effort Food Co.',
    prerender: false,
  },
  {
    path: '/januarymeals',
    title: 'January Meals — Local Effort Food Co.',
    description: 'January meal prep offerings from Local Effort.',
    prerender: false,
  },
  {
    path: '/calendar',
    title: 'Calendar — Local Effort Food Co.',
    description: 'Event and booking calendar for Local Effort Food Co.',
    prerender: false,
  },
];

// Dynamic routes — slugs resolved from Sanity at build time
export const DYNAMIC_ROUTES = [
  { pattern: '/product/:slug', sanityQuery: '*[_type == "product" && defined(slug.current) && active == true][].slug.current' },
  { pattern: '/weekly/:slug', sanityQuery: '*[_type == "weeklyPost" && defined(slug.current)][].slug.current' },
];

// Internal routes — noindex, never prerendered
export const INTERNAL_ROUTES = [
  '/finefoods',
  '/auth',
  '/inbox',
  '/campaigns',
  '/admin/',
  '/weeklydemo',
  '/weekly-order',
  '/catherine-schedule',
  '/partners/',
  '/schedule/',
];
