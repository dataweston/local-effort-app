// Apply RLS policy fix to Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('Applying RLS policy fix...\n');

  const sql = readFileSync('./fix-rls-policies.sql', 'utf-8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Extract policy name for logging
    let policyName = 'unknown';
    if (stmt.includes('DROP POLICY')) {
      const match = stmt.match(/DROP POLICY\s+(?:IF EXISTS\s+)?"([^"]+)"/);
      if (match) policyName = match[1];
    } else if (stmt.includes('CREATE POLICY')) {
      const match = stmt.match(/CREATE POLICY\s+"([^"]+)"/);
      if (match) policyName = match[1];
    }

    console.log(`[${i + 1}/${statements.length}] ${policyName}...`);

    try {
      // Execute via PostgREST using a raw query
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: stmt + ';'
        })
      });

      if (response.ok) {
        console.log(`  ✓ Success`);
      } else {
        const text = await response.text();
        console.log(`  ⚠ Status ${response.status}: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('IMPORTANT: The SQL execution via API may not work.');
  console.log('Please apply the fix manually in Supabase SQL Editor:');
  console.log('='.repeat(60));
  console.log('\n1. Go to: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt/sql/new');
  console.log('2. Copy and paste the contents of: fix-rls-policies.sql');
  console.log('3. Click "Run"');
  console.log('\nThis will fix the case-sensitivity issue in RLS policies.');
}

applyFix();
