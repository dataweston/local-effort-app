const {
  verifySupabaseToken,
  isAdminEmail,
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
  if (role === 'admin') return 'admin';
  if (role === 'staff') return 'staff';
  if (role === 'vendor') return 'vendor';
  if (role === 'volunteer') return 'volunteer';
  if (role === 'guest') return 'guest';
  return 'member';
}

function coerceHubAccess(value) {
  const access = String(value || '').toLowerCase();
  if (access === 'customer' || access === 'subscriber') return 'customer';
  if (access === 'privileged' || access === 'admin') return 'privileged';
  return 'staff';
}

function hubAccessFor(auth) {
  const accessLevel = auth?.hubProfile?.accessLevel
    ? coerceHubAccess(auth.hubProfile.accessLevel)
    : (auth?.isAdmin ? 'privileged' : null);
  return {
    accessLevel,
    hasHubAccess: !!accessLevel,
    isCustomer: accessLevel === 'customer',
    isStaff: accessLevel === 'staff' || accessLevel === 'privileged' || !!auth?.isAdmin,
    isPrivileged: accessLevel === 'privileged' || !!auth?.isAdmin,
  };
}

async function resolveHubViewer(req, prisma, { requireCustomer = false } = {}) {
  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser?.email) return { error: 'Unauthorized', status: 401 };

  const dbUser = await findUserByEmail(prisma, supabaseUser.email, { customer: true, hubProfile: true });
  const isReadOnlyAdmin = isReadOnlyAdminEmail(supabaseUser.email);
  const isAdmin = isAdminEmail(supabaseUser.email) || dbUser?.role === 'admin';
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

  const roles = unique([
    coerceRole(dbUser?.role),
    dbUser?.hubProfile ? coerceHubAccess(dbUser.hubProfile.accessLevel) : null,
    dbUser?.hubProfile ? 'staff' : null,
    customer ? 'subscriber' : null,
    isAdmin ? 'admin' : null,
  ]);
  const access = hubAccessFor({ hubProfile: dbUser?.hubProfile || null, isAdmin });

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

module.exports = { resolveHubViewer, requireHubAccess, coerceHubAccess };
