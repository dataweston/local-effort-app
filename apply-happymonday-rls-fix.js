// Script to apply Happy Monday RLS fix to Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function applyRLSFix() {
  console.log('Applying Happy Monday RLS fix...\n');

  const migrationPath = join(__dirname, 'supabase', 'migrations', '20250122_fix_happymonday_rls.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Migration SQL:');
  console.log('---');
  console.log(migrationSQL);
  console.log('---\n');

  // Execute the SQL using the rpc method
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

  if (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\nPlease run the migration manually in Supabase SQL Editor:');
    console.log('1. Go to your Supabase SQL Editor');
    console.log('2. Paste the contents from: supabase/migrations/20250122_fix_happymonday_rls.sql');
    console.log('3. Click "Run"');
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');
  console.log('\nBoth admin and client users can now see all orders in the Happy Monday portal.');
}

applyRLSFix().catch(console.error);
