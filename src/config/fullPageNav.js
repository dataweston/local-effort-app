// Home page panels + header navigation.
//
// FULLPAGE_PAGES drives the horizontal scroll-snap container on `/`. Its order
// and length MUST match the FullPageSection children in FullPageDemoPage.jsx —
// FullPageContainer zips them together by index.
//
// Weekly Meals and Small Events used to be panels here. They are now standalone
// indexable pages (/weekly-meals, /small-events) so each offer has its own URL,
// canonical, and JSON-LD; the home panel teases them instead of duplicating
// them. See src/pages/WeeklyMealsPage.jsx and src/pages/SmallEventsPage.jsx.
export const FULLPAGE_PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'local-pizza', label: 'Local Pizza' },
  { id: 'for-businesses', label: 'For Business' },
  { id: 'about', label: 'About' },
];

// Header navigation.
//
// Every item carries two things the old row lacked: a one-word descriptor of
// what it is, and the accent colour of the destination it leads to (the same
// accents as .ht-scope--* in home-tabs.css — olive for the vegetable week, rose
// for the celebration, hearth for the pizza oven, ink for the price sheet).
// That is what differentiates the titles: six destinations, six identities,
// instead of six interchangeable words in one mono row.
//
// `pageIndex` means "this is a panel on the home page" and is the index into
// FULLPAGE_PAGES above. Items without it are ordinary routes.
export const HEADER_NAV = [
  {
    id: 'weekly-meals',
    label: 'Weekly Meals',
    note: 'meal prep',
    href: '/weekly-meals',
    accent: 'var(--brand-olive)',
  },
  {
    id: 'small-events',
    label: 'Small Events',
    note: 'catering',
    href: '/small-events',
    accent: 'var(--brand-rose)',
  },
  {
    id: 'local-pizza',
    label: 'Local Pizza',
    note: 'parties',
    href: '/#local-pizza',
    pageIndex: 1,
    accent: '#F35C2B',
  },
  {
    id: 'for-businesses',
    label: 'For Business',
    note: 'wholesale',
    href: '/#for-businesses',
    pageIndex: 2,
    accent: 'var(--brand-ink)',
  },
  {
    id: 'sale',
    label: 'Shop',
    note: 'food drops',
    href: '/sale',
    accent: 'var(--brand-neutral-1)',
  },
  {
    id: 'about',
    label: 'About',
    note: 'the co-op',
    href: '/#about',
    pageIndex: 3,
    accent: 'var(--brand-bridge)',
  },
];

// The membership funnel is the one destination we push, so it is the only item
// in the header that reads as an action rather than a place.
export const HEADER_CTA = {
  id: 'localist',
  label: 'Become a Localist',
  note: 'membership',
  href: '/localist',
};

// The three offers the home page's intro band sends people to, in the order we
// want them chosen. Shared with the home panel so the copy cannot drift.
export const HOME_OFFERS = [
  {
    id: 'weekly-meals',
    href: '/weekly-meals',
    kicker: 'weekly meals',
    title: 'A week of real food, cooked for you',
    fact: 'dinners from $18 a person',
    accent: 'var(--brand-olive)',
  },
  {
    id: 'small-events',
    href: '/small-events',
    kicker: 'small events',
    title: 'Dinner parties, showers, office parties',
    fact: 'from $850 · 4–75 guests',
    accent: 'var(--brand-rose)',
  },
  {
    id: 'local-pizza',
    href: '/#local-pizza',
    pageIndex: 1,
    kicker: 'local pizza',
    title: '100% Midwest pizza, cooked at your place',
    fact: 'from $55 a guest',
    accent: '#F35C2B',
  },
];
