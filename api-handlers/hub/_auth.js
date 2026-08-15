const {
  verifySupabaseToken,
  isReadOnlyAdminEmail,
  isReadOnlyMethod,
  findUserByEmail,
} = require('../weekly-order/_auth');

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function coerceRole(value) {
  const role = String(value || '').toLowerCase();
  if (role === 'subscriber') return 'subscriber';
  if (role === 'vendor') return 'vendor';
  if (role === 'volunteer') return 'volunteer';
  if (role === 'guest') return 'guest';
  return 'member';
}

function configuredAdminEmails() {
  const configured = String(
    process.env.ADMIN_EMAILS ||
      process.env.VITE_ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
      ''
  )
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return configured.length > 0
    ? configured
    : ['dataweston@gmail.com', 'colsen03@gmail.com'];
}

function isExplicitHubAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return !!normalized && (configuredAdminEmails().includes(normalized) || isReadOnlyAdminEmail(normalized));
}

function coerceHubAccess(value) {
  const access = String(value || '').trim().toLowerCase();
  if (access === 'localist') return 'localist';
  if (access === 'customer' || access === 'subscriber') return 'customer';
  if (access === 'staff') return 'staff';
  if (access === 'privileged' || access === 'admin') return 'privileged';
  return null;
}

function hubAccessFor(auth) {
  const profile = auth?.hubProfile || null;
  const profileIsActive = String(profile?.status || '').trim().toLowerCase() === 'active';
  const accessLevel = profile
    ? (profileIsActive ? coerceHubAccess(profile.accessLevel) : null)
    : (auth?.isAdmin ? 'privileged' : null);
  return {
    accessLevel,
    hasHubAccess: !!accessLevel,
    isLocalist: accessLevel === 'localist',
    isCustomer: accessLevel === 'customer',
    isStaff: accessLevel === 'staff' || accessLevel === 'privileged',
    isPrivileged: accessLevel === 'privileged',
  };
}

async function resolveHubViewer(req, prisma, { requireCustomer = false } = {}) {
  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser?.email) return { error: 'Unauthorized', status: 401 };

  const dbUser = await findUserByEmail(prisma, supabaseUser.email, { customer: true, hubProfile: true });
  const isReadOnlyAdmin = isReadOnlyAdminEmail(supabaseUser.email);
  const explicitAdmin = isExplicitHubAdminEmail(supabaseUser.email);
  const access = hubAccessFor({
    hubProfile: dbUser?.hubProfile || null,
    isAdmin: explicitAdmin && !dbUser?.hubProfile,
  });
  const isAdmin = access.isPrivileged;
  if (isReadOnlyAdmin && !isReadOnlyMethod(req.method)) {
    return { error: 'Read-only admin access', status: 403 };
  }
  const requestedSlug = req.query?.customerSlug || req.body?.customerSlug || null;

  let customer = dbUser?.customer || null;
  if (requestedSlug) {
    const requestedCustomer = await prisma.customer.findFirst({
      where: { slug: String(requestedSlug) },
    });
    if (!requestedCustomer) return { error: 'No customer found', status: 404 };
    if (!isAdmin && requestedCustomer.id !== dbUser?.customerId) {
      return { error: 'Forbidden', status: 403 };
    }
    customer = requestedCustomer;
  }

  if (requireCustomer && !customer) {
    return { error: 'No customer profile found', status: 404 };
  }

  const accountRole = coerceRole(dbUser?.role);
  const roles = unique([
    accountRole,
    access.accessLevel,
    customer ? 'subscriber' : null,
    access.isPrivileged ? 'admin' : null,
  ]);
  return {
    supabaseUser,
    dbUser,
    customer,
    hubProfile: dbUser?.hubProfile || null,
    isAdmin,
    isReadOnlyAdmin,
    ...access,
    roles,
    viewer: {
      supabaseUid: supabaseUser.id,
      email: supabaseUser.email,
      userId: dbUser?.id || null,
      customerId: customer?.id || null,
      hubProfileId: dbUser?.hubProfile?.id || null,
      accessLevel: access.accessLevel,
      roles,
      isAdmin,
      isReadOnlyAdmin,
      isPrivileged: access.isPrivileged,
    },
  };
}

function requireHubAccess(auth, { privileged = false, allowedAccess = ['staff', 'privileged'] } = {}) {
  if (auth.error) return auth;
  if (!auth.hasHubAccess) return { error: 'Hub access required', status: 403 };
  if (privileged && !auth.isPrivileged) return { error: 'Privileged access required', status: 403 };
  if (!privileged && Array.isArray(allowedAccess) && !allowedAccess.includes(auth.accessLevel) && !auth.isPrivileged) {
    return { error: 'Hub access level not allowed', status: 403 };
  }
  return null;
}

module.exports = {
  resolveHubViewer,
  requireHubAccess,
  coerceHubAccess,
  hubAccessFor,
  isExplicitHubAdminEmail,
};
