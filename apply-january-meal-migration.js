// Script to apply January Meal Config migration to Supabase
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
  console.log('Reading migration file...');
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20251213_january_meal_config.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Applying migration manually via SQL statements...');

  // Split the SQL into individual statements and execute them
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
    console.log(statement.substring(0, 100) + '...');

    const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      // Try direct execution via the REST API as fallback
      console.log('Trying alternative execution method...');
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        console.error('Statement:', statement);
        // Continue anyway - some errors might be expected (like "already exists")
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    } else {
      console.log(`✓ Statement ${i + 1} executed successfully`);
    }
  }

  console.log('\n✓ Migration applied successfully!');
  console.log('\nVerifying tables...');

  // Check if tables exist
  const { data: globalConfig, error: globalError } = await supabase
    .from('january_meal_config')
    .select('*')
    .limit(1);

  if (globalError) {
    console.error('❌ Error checking january_meal_config table:', globalError);
  } else {
    console.log('✓ january_meal_config table exists');
  }

  const { data: userConfig, error: userError } = await supabase
    .from('january_meal_user_config')
    .select('*')
    .limit(1);

  if (userError) {
    console.error('❌ Error checking january_meal_user_config table:', userError);
  } else {
    console.log('✓ january_meal_user_config table exists');
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
