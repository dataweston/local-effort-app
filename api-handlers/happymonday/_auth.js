/**
 * Happy Monday portal authentication.
 *
 * The portal signs in through Supabase Auth and its membership table is
 * `happymonday_users`. Endpoints that move money must resolve the caller from
 * the bearer token and never from a body field: an unauthenticated `userId`
 * lets anyone charge a card against another account and probe which accounts
 * exist.
 */

const { verifySupabaseToken } = require('../weekly-order/_auth');

const ADMIN_ROLES = new Set(['admin', 'readonly_admin']);

async function resolveHappyMondayCaller(req, supabase) {
  if (!supabase) return { error: 'Portal directory unavailable', status: 503 };

  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser?.email) return { error: 'Unauthorized', status: 401 };

  const { data, error } = await supabase
    .from('happymonday_users')
    .select('id, email, name, role')
    .eq('email', String(supabaseUser.email).toLowerCase())
    .maybeSingle();

  if (error) return { error: 'Unable to verify portal access', status: 503 };
  // A valid Supabase session that is not a portal member is a denial, not a
  // lookup miss to report back.
  if (!data) return { error: 'Forbidden', status: 403 };

  const role = String(data.role || '').toLowerCase();
  return {
    user: data,
    role,
    isAdmin: ADMIN_ROLES.has(role),
    isReadOnly: role === 'readonly_admin',
  };
}

/**
 * Which account this request may charge. Members pay their own balance; a full
 * admin may pay on a member's behalf; read-only admins may not move money.
 */
function resolvePaymentTarget(caller, requestedUserId) {
  if (caller.isReadOnly) return { error: 'Read-only admin access', status: 403 };
  const requested = requestedUserId ? String(requestedUserId) : null;
  if (!requested || requested === String(caller.user.id)) {
    return { userId: String(caller.user.id) };
  }
  if (caller.isAdmin) return { userId: requested, onBehalfOf: true };
  return { error: 'Forbidden', status: 403 };
}

module.exports = { resolveHappyMondayCaller, resolvePaymentTarget };
