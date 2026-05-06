declare const process: {
  env?: Record<string, string | undefined>;
};

const env = process?.env || {};

export const hubConfig = {
  apiBaseUrl: env.EXPO_PUBLIC_HUB_API_BASE_URL || "",
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_VITE_SUPABASE_URL || "",
  supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_VITE_SUPABASE_ANON_KEY || "",
};

export const isHubApiConfigured = Boolean(hubConfig.apiBaseUrl);
export const isSupabaseConfigured = Boolean(hubConfig.supabaseUrl && hubConfig.supabaseAnonKey);
