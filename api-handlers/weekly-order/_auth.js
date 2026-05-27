const { createClient } = require('@supabase/supabase-js');

let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

async function verifySupabaseToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !supabase) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch { return null; }
}

function parseAdminEmails(value) {
  return String(value || '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function readOnlyAdminEmails() {
  const configured = parseAdminEmails(
    process.env.READ_ONLY_ADMIN_EMAILS ||
      process.env.VITE_READ_ONLY_ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_READ_ONLY_ADMIN_EMAILS
  );
  if (configured.length > 0) return configured;
  return ['hurdlezachary@gmail.com'];
}

function isReadOnlyMethod(method) {
  return ['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
}

function isReadOnlyAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return readOnlyAdminEmails().includes(normalized);
}

function isAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  const configured = parseAdminEmails(
    process.env.ADMIN_EMAILS ||
      process.env.VITE_ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_ADMIN_EMAILS
  );
  const adminEmails = configured.length > 0
    ? configured
    : ['dataweston@gmail.com', 'colsen03@gmail.com'];
  return adminEmails.includes(normalized) || isReadOnlyAdminEmail(normalized) || normalized.endsWith('@localeffortfood.com');
}

async function findUserByEmail(prisma, email, include = {}) {
  const normalized = String(email || '').trim();
  if (!normalized) return null;
  const query = {
    where: { email: { equals: normalized, mode: 'insensitive' } },
  };
  if (include && Object.keys(include).length > 0) query.include = include;
  return prisma.user.findFirst(query);
}

async function resolveAuthorizedCustomer(req, prisma, { requireCustomer = true } = {}) {
  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser?.email) return { error: 'Unauthorized', status: 401 };

  const requestedSlug = req.query?.customerSlug || req.body?.customerSlug || null;
  const dbUser = await findUserByEmail(prisma, supabaseUser.email, { customer: true });
  const isReadOnlyAdmin = isReadOnlyAdminEmail(supabaseUser.email);
  const isAdmin = isAdminEmail(supabaseUser.email) || dbUser?.role === 'admin';
  if (isReadOnlyAdmin && !isReadOnlyMethod(req.method)) {
    return { error: 'Read-only admin access', status: 403 };
  }

  let customer = dbUser?.customer || null;
  if (requestedSlug) {
    const requestedCustomer = await prisma.customer.findFirst({ where: { slug: String(requestedSlug) } });
    if (!requestedCustomer) return { error: 'No customer found', status: 404 };
    if (!isAdmin && requestedCustomer.id !== dbUser?.customerId) {
      return { error: 'Forbidden', status: 403 };
    }
    customer = requestedCustomer;
  }

  if (requireCustomer && !customer) {
    return { error: 'No customer profile found', status: 404 };
  }

  return { supabaseUser, dbUser, customer, isAdmin, isReadOnlyAdmin };
}

module.exports = {
  verifySupabaseToken,
  isAdminEmail,
  isReadOnlyAdminEmail,
  isReadOnlyMethod,
  findUserByEmail,
  resolveAuthorizedCustomer,
};
