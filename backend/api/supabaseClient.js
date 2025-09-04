const { createClient } = require('@supabase/supabase-js');

let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }
  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

module.exports = { getSupabase };
