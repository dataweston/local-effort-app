import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  console.error('Need: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setAdmin() {
  console.log('Setting up admin role...');
  
  // Read and execute the migration SQL
  const sql = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20251221_set_admin_role.sql'),
    'utf-8'
  );
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    // If the RPC doesn't exist, try direct execution
    console.log('Trying direct SQL execution...');
    
    // Split SQL into statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        const { error: execError } = await supabase.rpc('exec', { query: statement + ';' });
        if (execError) {
          console.error('Error executing statement:', execError);
        }
      } catch (e) {
        console.error('Error:', e.message);
      }
    }
    
    // Fallback: Try to update the profile directly
    console.log('\nAttempting direct profile update...');
    
    // Check if user exists
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', 'dataweston@gmail.com');
    
    if (userError) {
      console.error('Cannot query auth.users (expected with client)');
    }
    
    // Try to insert/update profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        email: 'dataweston@gmail.com',
        role: 'admin'
      }, {
        onConflict: 'email'
      });
    
    if (profileError) {
      console.error('Profile update error:', profileError);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('--------------------------------------------------');
      console.log(sql);
      console.log('--------------------------------------------------');
    } else {
      console.log('✅ Profile updated successfully');
    }
    
    return;
  }
  
  console.log('✅ Admin role set successfully');
}

setAdmin().catch(console.error);
