import { createClient } from '@supabase/supabase-js';

// Support both VITE_ prefixed (local dev) and non-prefixed (Vercel build) env vars
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY) in your environment');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : {
      // Mock object to prevent crashes when Supabase isn't configured
      auth: {
        getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: new Error('Supabase not configured') }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      }
    };

export const ADMIN_EMAILS = ['dataweston@gmail.com', 'colsen03@gmail.com'];

export const isAdmin = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
