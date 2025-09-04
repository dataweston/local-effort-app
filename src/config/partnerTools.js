// Registry of partner tools exposed via the Partner Portal.
// key: used for access control (e.g., stored on userProfiles.roles array)
// type: 'internal' uses a React page, 'iframe' embeds external or static URL

export const PARTNER_TOOLS = [
  {
    key: 'happymonday',
    name: 'Happy Monday',
    description: 'Menu management and feedback collector.',
    type: 'internal',
    route: '/partners/happy-monday',
  icon: 'ClipboardList',
  },
  {
    key: 'zafa',
    name: 'ZAFA Events',
    description: 'Events management utilities for ZAFA.',
  type: 'internal',
    route: '/partners/zafa-events',
  icon: 'Calendar',
  // Source pending: add local-effort-zafa-events/src and embed its App here.
  },
  {
    key: 'gallant',
    name: 'Gallant Hawking',
    description: 'Landing builder / micro-site utilities.',
  type: 'internal',
    route: '/partners/gallant-hawking',
  icon: 'LayoutDashboard',
  // Embedded directly via component import
  },
];

export function hasAccess(profile, toolKey) {
  const roles = (profile && (profile.roles || profile.tools || profile.apps)) || [];
  if (roles === 'all') return true;
  return Array.isArray(roles) ? roles.includes(toolKey) : false;
}
