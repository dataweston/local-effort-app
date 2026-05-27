function masterPlannerUid(auth) {
  return (
    process.env.HUB_MASTER_SUPABASE_UID ||
    process.env.VITE_HUB_MASTER_SUPABASE_UID ||
    auth?.viewer?.supabaseUid
  );
}

module.exports = { masterPlannerUid };
