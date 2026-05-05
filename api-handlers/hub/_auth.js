const {
  verifySupabaseToken,
  isAdminEmail,
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

async function resolveHubViewer(req, prisma, { requireCustomer = false } = {}) {
  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser?.email) return { error: 'Unauthorized', status: 401 };

  const dbUser = await findUserByEmail(prisma, supabaseUser.email, { customer: true });
  const isAdmin = isAdminEmail(supabaseUser.email) || dbUser?.role === 'admin';
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
    customer ? 'subscriber' : null,
    isAdmin ? 'admin' : null,
  ]);

  return {
    supabaseUser,
    dbUser,
    customer,
    isAdmin,
    roles,
    viewer: {
      supabaseUid: supabaseUser.id,
      email: supabaseUser.email,
      userId: dbUser?.id || null,
      customerId: customer?.id || null,
      roles,
      isAdmin,
    },
  };
}

module.exports = { resolveHubViewer };
