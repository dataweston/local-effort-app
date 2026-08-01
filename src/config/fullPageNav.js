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
// Each item carries the accent colour of the destination it leads to (the same
// accents as .ht-scope--* in home-tabs.css — olive for the vegetable week, rose
// for the celebration, hearth for the pizza oven, ink for the price sheet).
// That is what differentiates the titles: seven destinations, seven identities,
// instead of seven interchangeable words in one mono row.
//
// The one-word descriptors that used to sit under each label were removed
// (client direction, 2026-07-31) — the row reads as navigation now, not as a
// glossary. `description` survives them but is not a second line of nav: it is
// rendered as the anchor's `title`, so it lands in the markup for crawlers and
// language models without adding anything to look at.
//
// `pageIndex` means "this is a panel on the home page" and is the index into
// FULLPAGE_PAGES above. Items without it are ordinary routes.
export const HEADER_NAV = [
  {
    id: 'weekly-meals',
    label: 'Weekly Meals',
    description: 'Weekly personal-chef meal prep delivered across Minneapolis–St. Paul',
    href: '/weekly-meals',
    accent: 'var(--brand-olive)',
  },
  {
    id: 'small-events',
    label: 'Small Events',
    description: 'Private chef catering for dinner parties, showers, and weddings',
    href: '/small-events',
    accent: 'var(--brand-rose)',
  },
  {
    id: 'chez-garage',
    label: 'Chez Garage',
    description: 'Hyper-casual dining: a Local Effort pop-up in an Edina garage',
    href: '/chez-garage',
    accent: 'var(--accent-poppy)',
  },
  {
    id: 'local-pizza',
    label: 'Local Pizza',
    description: 'Wood-fired pizza parties across the Twin Cities',
    href: '/#local-pizza',
    pageIndex: 1,
    accent: 'var(--brand-hearth)',
  },
  {
    id: 'for-businesses',
    label: 'For Business',
    description: 'Wholesale and office catering from a worker-owned kitchen',
    href: '/#for-businesses',
    pageIndex: 2,
    accent: 'var(--brand-ink)',
  },
  {
    id: 'sale',
    label: 'Shop',
    description: 'Seasonal food drops, pantry goods, and limited preorders',
    href: '/sale',
    accent: 'var(--brand-neutral-1)',
  },
  {
    id: 'about',
    label: 'About',
    description: 'A worker-owned Minneapolis food cooperative',
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
  description: 'Membership in a worker-owned Minneapolis food cooperative',
  href: '/localist',
};

// The home panel is the photo wall and nothing else — no headline, no offer
// cards, nothing above the photographs (client direction, 2026-07-26). The
// header nav carries the routes to each offer.
