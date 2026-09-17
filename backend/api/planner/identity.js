const { isAdminEmail } = require('../utils/adminVerifier');

function plannerUidForUser(user, env = process.env) {
  const masterPlannerUid = env.HUB_MASTER_SUPABASE_UID || env.VITE_HUB_MASTER_SUPABASE_UID;
  if (masterPlannerUid && isAdminEmail(user?.email)) return masterPlannerUid;
  return user?.id || null;
}

module.exports = { plannerUidForUser };
