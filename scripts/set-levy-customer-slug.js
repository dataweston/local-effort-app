/**
 * One-off script: sets customer_slug: 'levy-family' in user_metadata
 * for both Levy family Supabase Auth accounts.
 *
 * Usage: node scripts/set-levy-customer-slug.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGET_EMAILS = ['davelevy3@gmail.com', 'allisonlevy627@gmail.com'];
const CUSTOMER_SLUG = 'levy-family';

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  for (const email of TARGET_EMAILS) {
    const found = data.users.find((u) => u.email === email);
    if (!found) {
      console.warn(`⚠️  ${email} not found in Supabase Auth — skipping`);
      continue;
    }

    const existing = found.user_metadata || {};
    if (existing.customer_slug === CUSTOMER_SLUG) {
      console.log(`✅ ${email} already has customer_slug=${CUSTOMER_SLUG}`);
      continue;
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(found.id, {
      user_metadata: { ...existing, customer_slug: CUSTOMER_SLUG },
    });

    if (updateErr) {
      console.error(`❌ Failed to update ${email}: ${updateErr.message}`);
    } else {
      console.log(`✅ Updated ${email} (id: ${found.id}) → customer_slug=${CUSTOMER_SLUG}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
