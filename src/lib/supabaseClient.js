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

// Password-recovery links are only handled by /hub's recovery screen. If one
// lands on any other page, forward it — hash intact — before createClient's
// detectSessionInUrl consumes the token, otherwise the user ends up silently
// signed in on a random page with no way to set a new password.
if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
  const recoveryParams = new URLSearchParams(window.location.hash.substring(1));
  if (recoveryParams.get('type') === 'recovery' && window.location.pathname !== '/hub') {
    window.location.replace(`/hub${window.location.hash}`);
  }
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
