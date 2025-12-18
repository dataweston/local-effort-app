import { supabase } from '../../lib/supabaseClient';
import type { MealOverrideMap } from '../types';

const TABLE = 'meal_plan_user';

export const fetchUserOverrides = async (
  planKey: string,
  userId: string
): Promise<MealOverrideMap> => {
  if (!supabase || !userId) return {};

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('overrides_json')
      .eq('plan_key', planKey)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Failed to fetch user plan', error);
      }
      return {};
    }

    return (data?.overrides_json as MealOverrideMap) || {};
  } catch (error) {
    console.error('Failed to fetch user plan', error);
    return {};
  }
};

export const saveUserOverrides = async (
  planKey: string,
  userId: string,
  overrides: MealOverrideMap
) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  if (!userId) {
    throw new Error('User must be signed in to save overrides');
  }

  const payload = {
    plan_key: planKey,
    user_id: userId,
    overrides_json: overrides ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'plan_key,user_id' });

  if (error) {
    throw error;
  }
};
