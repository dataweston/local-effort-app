import { supabase, isReadOnlyAdmin } from '../lib/supabaseClient';

export const getCurrentWeeklyOrderUser = async (email) => {
  if (!supabase || !email) return null;

  const { data, error } = await supabase
    .from('weekly_order_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    console.error('[WeeklyOrder] Error fetching user:', error);
    if (isReadOnlyAdmin(email)) {
      return {
        email: email.toLowerCase(),
        role: 'readonly_admin',
        name: 'Read-only admin',
      };
    }
    return null;
  }

  return data || (isReadOnlyAdmin(email)
    ? {
        email: email.toLowerCase(),
        role: 'readonly_admin',
        name: 'Read-only admin',
      }
    : null);
};
