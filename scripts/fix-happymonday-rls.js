const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyRlsFix() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const sqlPath = path.join(__dirname, '..', 'fix-rls-policies.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('🔧 Fixing Happy Monday RLS policies...');
  console.log('📁 SQL file size:', sql.length, 'bytes');
  console.log('');
  
  try {
    // Execute the SQL directly using Supabase client
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Failed to execute via RPC. Trying direct connection...\n');
      
      // Alternative: Execute via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Migration failed via REST API too.');
        console.error('Error:', errorText);
        console.log('');
        console.log('📋 Please apply the fix manually:');
        console.log('   1. Go to: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt/sql/new');
        console.log('   2. Copy contents from: fix-rls-policies.sql');
        console.log('   3. Paste and run in SQL Editor');
        process.exit(1);
      }
      
      const result = await response.json();
      console.log('✅ RLS policies fixed successfully via REST API!');
      console.log(result);
    } else {
      console.log('✅ RLS policies fixed successfully!');
      console.log(data);
    }
    
    console.log('');
    console.log('🎉 Fixed issues:');
    console.log('   • Infinite recursion error resolved');
    console.log('   • Case-insensitive email matching enabled');
    console.log('   • Admin policies now use secure SECURITY DEFINER function');
    console.log('');
    console.log('🔄 Please refresh your browser to test the fix.');
    
  } catch (err) {
    console.error('❌ Error executing fix:', err.message);
    console.log('');
    console.log('📋 Please apply the fix manually:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt/sql/new');
    console.log('   2. Copy contents from: fix-rls-policies.sql');
    console.log('   3. Paste and run in SQL Editor');
    process.exit(1);
  }
}

applyRlsFix();
