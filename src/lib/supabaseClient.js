import { createClient } from '@supabase/supabase-js';

// Browser code must only use explicitly public Supabase env vars.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration missing. Set VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment');
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
export const READ_ONLY_ADMIN_EMAILS = ['hurdlezachary@gmail.com'];

export const isReadOnlyAdmin = (email) => {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return READ_ONLY_ADMIN_EMAILS.includes(normalized);
};

export const isAdmin = (email) => {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (ADMIN_EMAILS.includes(normalized)) return true;
  if (isReadOnlyAdmin(normalized)) return true;
  return normalized.endsWith('@localeffortfood.com');
};
