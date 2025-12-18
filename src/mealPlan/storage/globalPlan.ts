import { supabase } from '../../../lib/supabaseClient.js';
import type { MealOverrideMap } from '../types';

const TABLE = 'meal_plan_global';

export const fetchGlobalOverrides = async (
  planKey: string
): Promise<MealOverrideMap> => {
  if (!supabase) return {};

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('overrides_json')
      .eq('plan_key', planKey)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch global meal plan', error);
      return {};
    }

    return (data?.overrides_json as MealOverrideMap) || {};
  } catch (error) {
    console.error('Failed to fetch global meal plan', error);
    return {};
  }
};

export const saveGlobalOverrides = async (
  planKey: string,
  overrides: MealOverrideMap,
  userId?: string | null
) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const payload = {
    plan_key: planKey,
    overrides_json: overrides ?? {},
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null,
  };

  const { error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'plan_key' });

  if (error) {
    throw error;
  }
};
