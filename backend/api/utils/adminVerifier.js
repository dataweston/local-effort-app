const { getSupabase } = require('../supabaseClient');

function parseAdminEmails(value) {
  return String(value || '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function resolveAdminEmails() {
  const configured = parseAdminEmails(
    process.env.ADMIN_EMAILS ||
      process.env.VITE_ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_ADMIN_EMAILS
  );
  if (configured.length > 0) return configured;
  return ['dataweston@gmail.com', 'colsen03@gmail.com'];
}

function isAdminEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  if (resolveAdminEmails().includes(normalized)) return true;
  return normalized.endsWith('@localeffortfood.com');
}

function extractBearerToken(req) {
  const header = String(req?.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function createAdminVerifier({ getSupabaseImpl = getSupabase } = {}) {
  return async function verifyAdminRequest(req) {
    const supabase = getSupabaseImpl();
    const token = extractBearerToken(req);
    if (!supabase || !token) {
      return null;
    }

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user?.email || !isAdminEmail(user.email)) {
        return null;
      }
      return user;
    } catch (_err) {
      return null;
    }
  };
}

module.exports = {
  createAdminVerifier,
  extractBearerToken,
  isAdminEmail,
  resolveAdminEmails,
};
