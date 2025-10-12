import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type ServiceRoleClient = SupabaseClient<any, 'sales', any>;

let serviceRoleClient: ServiceRoleClient | null = null;

export function getSupabaseServiceRoleClient(): ServiceRoleClient {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!serviceRoleClient) {
    serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'sales'
      }
    });
  }

  return serviceRoleClient;
}
