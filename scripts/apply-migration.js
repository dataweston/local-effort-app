const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241027_calendar_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Applying calendar system migration...');
  console.log('Migration file size:', sql.length, 'bytes');
  console.log('');
  
  try {
    // Use postgREST to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Migration failed:');
      console.error(error);
      
      // Let's try executing via the database connection directly
      console.log('');
      console.log('⚠️  Please copy the migration file contents and paste it into the Supabase SQL Editor manually.');
      console.log('📁 File location: supabase/migrations/20241027_calendar_system.sql');
      console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt/sql/new');
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('✅ Migration applied successfully!');
    console.log('Result:', result);
  } catch (err) {
    console.error('❌ Error executing migration:', err.message);
    console.log('');
    console.log('⚠️  Please apply the migration manually via Supabase SQL Editor.');
    console.log('📁 File location: supabase/migrations/20241027_calendar_system.sql');
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt/sql/new');
    process.exit(1);
  }
}

applyMigration();
