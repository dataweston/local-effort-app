// Script to apply Happy Monday migration to Supabase
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
  db: { schema: 'public' }
});

async function applyMigration() {
  console.log('Checking if admin user exists...');

  // First, check if the user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('happymonday_users')
    .select('*')
    .eq('email', 'dataweston@gmail.com')
    .maybeSingle();

  if (checkError) {
    console.log('Tables may not exist yet. Will create them.');
  } else if (existingUser) {
    console.log('✓ Admin user already exists:', existingUser);
    console.log('\nYour admin account is already in the database. Try logging in again.');
    console.log('If you still have issues, check:');
    console.log('1. Google OAuth is configured in Supabase');
    console.log('2. Your email matches exactly: dataweston@gmail.com');
    return;
  }

  console.log('\nReading migration file...');
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20250122_happymonday_portal.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration manually via SQL statements...');

  // Split the SQL into individual statements and execute them
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.includes('CREATE TABLE') ||
        statement.includes('CREATE INDEX') ||
        statement.includes('CREATE POLICY') ||
        statement.includes('ALTER TABLE') ||
        statement.includes('CREATE OR REPLACE FUNCTION') ||
        statement.includes('CREATE TRIGGER') ||
        statement.includes('DROP TRIGGER') ||
        statement.includes('INSERT INTO')) {

      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        // Use the Supabase management API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ query: statement + ';' })
        });

        if (!response.ok && response.status !== 404) {
          const errorText = await response.text();
          console.log(`Statement ${i + 1} - Status: ${response.status}`);
          // Don't fail on errors, some statements might already exist
        }
      } catch (err) {
        console.log(`Statement ${i + 1} - Error (continuing):`, err.message);
      }
    }
  }

  console.log('\nAttempting to create admin user directly...');

  // Try to insert the admin user directly
  const { data: newUser, error: insertError } = await supabase
    .from('happymonday_users')
    .upsert([
      { email: 'dataweston@gmail.com', role: 'admin', name: 'Weston' }
    ], { onConflict: 'email' })
    .select();

  if (insertError) {
    console.error('Error creating user:', insertError);
    console.log('\nPlease run the migration SQL manually in Supabase SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt/sql/new');
    console.log('2. Paste the contents of: supabase/migrations/20250122_happymonday_portal.sql');
    console.log('3. Click "Run"');
  } else {
    console.log('✓ Admin user created successfully!');
    console.log(newUser);
    console.log('\nYou should now be able to log in with dataweston@gmail.com');
  }
}

applyMigration();
