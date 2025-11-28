import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying invoice editing migration...\n');

  const migrationPath = './supabase/migrations/20250122_add_invoice_editing.sql';
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Executing SQL...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

  if (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n============================================================');
    console.log('IMPORTANT: Please apply the migration manually in Supabase SQL Editor:');
    console.log('============================================================\n');
    console.log(`1. Go to: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
    console.log(`2. Copy and paste the contents of: ${migrationPath}`);
    console.log('3. Click "Run"\n');
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!');
}

applyMigration();
