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
  public: true,
  icon: 'ClipboardList',
  },
  {
    key: 'inbox',
    name: 'Inbox',
    description: 'Mailbox (Brevo) for inbound messages.',
    type: 'internal',
    route: 'https://app.brevo.com/',
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
  public: true,
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
  public: true,
  },
];

export function hasAccess(profile, toolKey) {
  const roles = (profile && (profile.roles || profile.tools || profile.apps)) || [];
  // Allow access to tools explicitly marked public in registry
  try {
    const tool = PARTNER_TOOLS.find((t) => t.key === toolKey);
    if (tool && tool.public) return true;
  } catch (e) {
    // ignore
  }
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
export function isAdminEmail(email) {
  if (!email) return false;
  const env = (import.meta && import.meta.env) ? import.meta.env : {};
  // Support multiple common env names and both single-value and CSV lists.
  const raw =
    env.VITE_ADMIN_EMAILS ||
    env.VITE_ADMIN_EMAIL ||
    env.VITE_OWNER_EMAILS ||
    env.VITE_OWNER_EMAIL ||
    env.NEXT_PUBLIC_ADMIN_EMAILS ||
    env.NEXT_PUBLIC_ADMIN_EMAIL ||
    '';

  const target = String(email).trim().toLowerCase();
  const list = String(raw)
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Exact email match
  if (list.includes(target)) return true;

  // Optional: allow domain entries like "@example.com" to match any user at that domain
  const domain = target.includes('@') ? target.split('@')[1] : '';
  if (domain && list.some((entry) => entry.startsWith('@') && entry.slice(1) === domain)) {
    return true;
  }
  // Fallback: if no admin emails configured at all, treat first logged-in email as admin (session scope only)
  if (list.length === 0 && typeof window !== 'undefined') {
    if (!window.__LE_FIRST_ADMIN_EMAIL) {
      window.__LE_FIRST_ADMIN_EMAIL = target; // ephemeral; not persisted
      return true;
    }
    return window.__LE_FIRST_ADMIN_EMAIL === target;
  }
  return false;
}
