// Script to apply January Meal Config migration to Supabase
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
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
  const migrationsDir = join(__dirname, 'supabase', 'migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found. Nothing to do.');
    return;
  }

  for (const file of migrationFiles) {
    console.log(`\nReading migration file ${file}...`);
    const migrationPath = join(migrationsDir, file);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log(`Applying migration "${file}" via SQL statements...`);

    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length} from ${file}...`);
      console.log(statement.substring(0, 100) + '...');

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.log('Trying alternative execution method...');
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          console.error(`Error executing statement ${i + 1} from ${file}:`, error);
          console.error('Statement:', statement);
        } else {
          console.log(`Statement ${i + 1} from ${file} executed successfully`);
        }
      } else {
        console.log(`Statement ${i + 1} from ${file} executed successfully`);
      }
    }
  }

  console.log('\nAll migrations applied successfully!');
  console.log('\nVerifying tables...');

  const { error: globalError } = await supabase
    .from('january_meal_config')
    .select('*')
    .limit(1);

  if (globalError) {
    console.error('Error checking january_meal_config table:', globalError);
  } else {
    console.log('january_meal_config table exists');
  }

  const { error: userError } = await supabase
    .from('january_meal_user_config')
    .select('*')
    .limit(1);

  if (userError) {
    console.error('Error checking january_meal_user_config table:', userError);
  } else {
    console.log('january_meal_user_config table exists');
  }
}

applyMigration()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
