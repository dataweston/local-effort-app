const crypto = require('crypto');
const { createAdminVerifier, extractBearerToken } = require('../../../backend/api/utils/adminVerifier');
const { getSupabase } = require('../../../backend/api/supabaseClient');

const ADMIN_TOKEN = process.env.WEEKLY_ORDER_ADMIN_TOKEN || '';
const verifyAdminRequest = createAdminVerifier();

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function hasLegacyAdminToken(req) {
  if (!ADMIN_TOKEN) return false;
  const header = String(req?.headers?.['x-admin-token'] || '');
  const bearer = extractBearerToken(req);
  return safeEqual(header, ADMIN_TOKEN) || safeEqual(bearer, ADMIN_TOKEN);
}

async function requireWeeklyOrderAdmin(req, res) {
  if (hasLegacyAdminToken(req)) {
    return { authType: 'legacy-token' };
  }

  const supabase = getSupabase();
  const token = extractBearerToken(req);
  if (supabase && token) {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (!error && user?.email) {
        const email = String(user.email).trim().toLowerCase();
        const { data: weeklyOrderUser, error: lookupError } = await supabase
          .from('weekly_order_users')
          .select('email, role')
          .eq('email', email)
          .maybeSingle();

        if (!lookupError) {
          if (weeklyOrderUser?.role === 'admin') {
            return { authType: 'weekly-order-supabase', user, weeklyOrderUser };
          }
          if (res) {
            res.status(401).json({ error: 'Unauthorized' });
          }
          return null;
        }
      }
    } catch (_err) {
      // Fall through to the broader admin verifier if the table lookup is unavailable.
    }
  }

  const user = await verifyAdminRequest(req);
  if (user) {
    return { authType: 'supabase-admin', user };
  }

  if (res) {
    res.status(401).json({ error: 'Unauthorized' });
  }
  return null;
}

module.exports = {
  requireWeeklyOrderAdmin,
};
