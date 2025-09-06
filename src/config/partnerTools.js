// Registry of partner tools exposed via the Partner Portal.
// key: used for access control (e.g., stored on userProfiles.roles array)
// type: 'internal' uses a React page, 'iframe' embeds external or static URL

export const PARTNER_TOOLS = [
  {
    key: 'happymonday',
    name: 'Happy Monday',
  description: 'Planning & operations app (internal partner app).',
  type: 'internal',
  route: '/partners/happymonday',
  icon: 'ClipboardList',
  },
  {
    key: 'inbox',
    name: 'Inbox',
    description: 'Mailbox (Brevo) for inbound messages.',
    type: 'internal',
    route: '/inbox',
    icon: 'Inbox',
  },
  {
    key: 'studio',
    name: 'Sanity Studio',
  description: 'Content management studio (opens in new tab).',
  type: 'external',
  href: 'https://www.sanity.io/@oz5yeSAiw/studio/q4scncd6uaeyzxo567jir45u/default',
    icon: 'FileText',
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
  // Treat 'admin' and 'owner' as having access to all tools
  if (Array.isArray(roles) && (roles.includes('admin') || roles.includes('owner'))) return true;
  return Array.isArray(roles) ? roles.includes(toolKey) : false;
}

// Convenience helper to determine if a profile should see all tools
export function isAdminProfile(profile) {
  const roles = (profile && (profile.roles || profile.tools || profile.apps)) || [];
  if (roles === 'all') return true;
  return Array.isArray(roles) && (roles.includes('admin') || roles.includes('owner'));
}

// Treat configured emails as administrators (comma or space separated)
export function getAdminEmails() {
  const env = (import.meta && import.meta.env) ? import.meta.env : {};
  const sources = [
    env.VITE_ADMIN_EMAILS,
    env.VITE_ADMIN_EMAIL,
    env.VITE_OWNER_EMAILS,
    env.VITE_OWNER_EMAIL,
    env.NEXT_PUBLIC_ADMIN_EMAILS,
    env.NEXT_PUBLIC_ADMIN_EMAIL,
  ].filter(Boolean);
  if (!sources.length) return [];
  return sources
    .join(',')
    .split(/[\s,;,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  const target = String(email).trim().toLowerCase();
  const list = getAdminEmails();
  // Exact match
  if (list.includes(target)) return true;
  // Domain match entries like @example.com
  const domain = target.split('@')[1];
  if (domain && list.some((entry) => entry.startsWith('@') && entry.slice(1) === domain)) return true;
  // Fallback ephemeral first-login admin if none configured
  if (list.length === 0 && typeof window !== 'undefined') {
    if (!window.__LE_FIRST_ADMIN_EMAIL) {
      window.__LE_FIRST_ADMIN_EMAIL = target;
      return true;
    }
    return window.__LE_FIRST_ADMIN_EMAIL === target;
  }
  return false;
}
