import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[verify] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'sales' }
  });

  console.log('[verify] Checking sales.order_totals...');
  const { data, error } = await supabase
    .from('order_totals')
    .select('sale_slug, sold_count, revenue_cents')
    .limit(1);

  if (error) {
    // Common misconfig: PGRST106 if the schema isn't exposed in API settings
    if ((error as any).code === 'PGRST106') {
      console.error(
        '[verify] Supabase API is not exposing the "sales" schema. Fix: Dashboard → Project Settings → API → Exposed schemas → add "sales"'
      );
    } else {
      console.error('[verify] Query failed:', error);
    }
    process.exit(1);
  }

  console.log('[verify] Success. Example row:', data?.[0] ?? '(none)');
}

main().catch((e) => {
  console.error('[verify] Unexpected error', e);
  process.exit(1);
});
