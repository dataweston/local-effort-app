import { createClient } from '@supabase/supabase-js';

// Support Vite (VITE_), Next (NEXT_PUBLIC_), and raw SUPABASE_ env var prefixes
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing. Set SUPABASE_URL/SUPABASE_ANON_KEY with either VITE_ or NEXT_PUBLIC_ prefixes (or without) in your environment');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // Enable automatic OAuth callback handling
        flowType: 'implicit', // Use implicit flow for hash-based OAuth
      }
    })
  : null; // Return null instead of mock object

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

export const ADMIN_EMAILS = ['dataweston@gmail.com', 'colsen03@gmail.com'];

export const isAdmin = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
