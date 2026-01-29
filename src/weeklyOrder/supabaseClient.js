import { supabase } from '../lib/supabaseClient';

export const getCurrentWeeklyOrderUser = async (email) => {
  if (!supabase || !email) return null;

  const { data, error } = await supabase
    .from('weekly_order_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    console.error('[WeeklyOrder] Error fetching user:', error);
    return null;
  }

  return data;
};
