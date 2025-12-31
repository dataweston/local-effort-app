import { supabase } from '../lib/supabaseClient';
import type { MealLibrary } from './types';

let cachedLibrary: MealLibrary | null = null;

/**
 * Loads the meal library from the database
 * Falls back to empty library if database is unavailable
 */
export async function loadMealLibrary(): Promise<MealLibrary> {
  if (cachedLibrary) {
    return cachedLibrary;
  }

  if (!supabase) {
    console.warn('Supabase not configured, using empty meal library');
    return createEmptyLibrary();
  }

  try {
    const { data, error } = await supabase.rpc('get_meal_library');

    if (error) {
      console.error('Error loading meal library:', error);
      return createEmptyLibrary();
    }

    if (data) {
      cachedLibrary = data as MealLibrary;
      return cachedLibrary;
    }

    return createEmptyLibrary();
  } catch (err) {
    console.error('Failed to load meal library:', err);
    return createEmptyLibrary();
  }
}

/**
 * Clears the cached meal library
 * Call this after adding/updating/deleting recipes
 */
export function clearMealLibraryCache() {
  cachedLibrary = null;
}

function createEmptyLibrary(): MealLibrary {
  return {
    breakfast: {},
    lunch: {},
    dinner: {},
    snacks: {}
  };
}

/**
 * Saves a recipe to the database
 */
export async function saveRecipe(
  mealType: keyof MealLibrary,
  code: string,
  recipe: {
    name: string;
    color?: string;
    notes?: string;
    ingredients: Array<{
      name: string;
      fdcId: number;
      amount: number;
      unit: string;
      displayAmount?: number;
      displayUnit?: string;
      nutrientsPer100g: any;
    }>;
  }
) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Check if recipe exists
  const { data: existing } = await supabase
    .from('meal_recipes')
    .select('id')
    .eq('meal_type', mealType)
    .eq('code', code)
    .single();

  let recipeId: string;

  if (existing) {
    // Update existing recipe
    const { data, error } = await supabase
      .from('meal_recipes')
      .update({
        name: recipe.name,
        color: recipe.color,
        notes: recipe.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    recipeId = data.id;

    // Delete old ingredients
    await supabase
      .from('meal_recipe_ingredients')
      .delete()
      .eq('recipe_id', recipeId);
  } else {
    // Create new recipe
    const { data, error } = await supabase
      .from('meal_recipes')
      .insert({
        meal_type: mealType,
        code,
        name: recipe.name,
        color: recipe.color,
        notes: recipe.notes
      })
      .select()
      .single();

    if (error) throw error;
    recipeId = data.id;
  }

  // Insert ingredients
  if (recipe.ingredients.length > 0) {
    const { error } = await supabase
      .from('meal_recipe_ingredients')
      .insert(
        recipe.ingredients.map((ing, index) => ({
          recipe_id: recipeId,
          name: ing.name,
          fdc_id: ing.fdcId,
          amount: ing.amount,
          unit: ing.unit,
          display_amount: ing.displayAmount,
          display_unit: ing.displayUnit,
          nutrients_per_100g: ing.nutrientsPer100g,
          sort_order: index
        }))
      );

    if (error) throw error;
  }

  clearMealLibraryCache();
}

/**
 * Deletes a recipe from the database
 */
export async function deleteRecipe(mealType: keyof MealLibrary, code: string) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { error } = await supabase
    .from('meal_recipes')
    .delete()
    .eq('meal_type', mealType)
    .eq('code', code);

  if (error) throw error;

  clearMealLibraryCache();
}
