/**
 * Base Meals - Rotation Schedule & Utilities
 * 
 * Architecture:
 * - Recipes are stored in DB (meal_recipes table) and loaded via useMealLibrary()
 * - This file defines ONLY the rotation schedule (which day gets which meal)
 * - All hardcoded recipe data has been removed - DB is the single source of truth
 * 
 * Data Flow:
 * 1. useMealLibrary() fetches recipes from DB → mealLibrary
 * 2. DAILY_PLAN + MEAL_ROTATION defines which meals appear on which days
 * 3. resolveBaseMealForDay() combines library + rotation → base meals per day
 * 4. Overrides (global/user/anon) are applied on top → effectiveDays
 */

import type { DayPlan, Ingredient, Meal, MealLibrary, MealOverrideMap, MealType } from './types';

// ============================================================================
// ROTATION SCHEDULE - Defines which meal template appears on each day
// ============================================================================

const MEAL_ROTATION = {
  breakfast: (day: number) => (day % 2 === 0 ? 'chia' : 'shake'),
  lunch: (day: number) => (day % 2 === 0 ? 'trout' : 'salmon'),
  snacks: () => 'default'
} as const;

export const DAILY_PLAN: DayPlan[] = [
  { day: 1, dinnerType: 'KB' },
  { day: 2, dinnerType: 'PB' },
  { day: 3, dinnerType: 'BY' },
  { day: 4, dinnerType: 'BS' },
  { day: 5, dinnerType: 'CC' },
  { day: 6, dinnerType: 'SP' },
  { day: 7, dinnerType: 'MC' },
  { day: 8, dinnerType: 'KB' },
  { day: 9, dinnerType: 'PB' },
  { day: 10, dinnerType: 'BY' },
  { day: 11, dinnerType: 'BS' },
  { day: 12, dinnerType: 'CC' },
  { day: 13, dinnerType: 'SP' },
  { day: 14, dinnerType: 'MC' },
  { day: 15, dinnerType: 'KB' },
  { day: 16, dinnerType: 'PB' },
  { day: 17, dinnerType: 'BY' },
  { day: 18, dinnerType: 'BS' },
  { day: 19, dinnerType: 'CC' },
  { day: 20, dinnerType: 'SP' },
  { day: 21, dinnerType: 'MC' },
  { day: 22, dinnerType: 'KB' },
  { day: 23, dinnerType: 'PB' },
  { day: 24, dinnerType: 'BY' },
  { day: 25, dinnerType: 'BS' },
  { day: 26, dinnerType: 'CC' },
  { day: 27, dinnerType: 'SP' },
  { day: 28, dinnerType: 'MC' },
  { day: 29, dinnerType: 'KB' },
  { day: 30, dinnerType: 'PB' }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getDayKey = (day: number) => `day-${day}`;

export const getDefaultMealKey = (
  mealType: keyof MealLibrary,
  day: number,
  dinnerCode: string
): string => {
  if (mealType === 'dinner') return dinnerCode;
  if (mealType === 'snacks') return 'default';
  return MEAL_ROTATION[mealType]?.(day) || 'default';
};

export const getMealInstanceKey = (
  mealType: keyof MealLibrary,
  templateKey: string
) => (mealType === 'snacks' ? 'snacks' : `${mealType}-${templateKey}`);

export const resolveBaseMeal = (
  library: MealLibrary,
  mealType: keyof MealLibrary,
  templateKey: string
): Meal => cloneMeal(library[mealType]?.[templateKey]);

export const resolveBaseMealForDay = (
  library: MealLibrary,
  mealType: keyof MealLibrary,
  day: number,
  dinnerCode: string
): { meal: Meal; instanceKey: string; templateKey: string } => {
  const templateKey = getDefaultMealKey(mealType, day, dinnerCode);
  const instanceKey = getMealInstanceKey(mealType, templateKey);
  return {
    meal: resolveBaseMeal(library, mealType, templateKey),
    instanceKey,
    templateKey,
  };
};

// ============================================================================
// CLONE UTILITIES - Deep copy meals to prevent mutation
// ============================================================================

export const cloneMeal = (meal?: Meal): Meal => ({
  name: meal?.name || 'Custom Meal',
  color: meal?.color,
  notes: meal?.notes,
  ingredients: (meal?.ingredients || []).map((ingredient) => ({
    ...ingredient,
    nutrientsPer100g: ingredient.nutrientsPer100g ? { ...ingredient.nutrientsPer100g } : undefined,
  })),
});

export const cloneMealLibrary = (library: MealLibrary): MealLibrary => ({
  breakfast: cloneMealRecord(library.breakfast),
  lunch: cloneMealRecord(library.lunch),
  dinner: cloneMealRecord(library.dinner),
  snacks: cloneMealRecord(library.snacks),
});

const cloneMealRecord = (record: Record<string, Meal> = {}) =>
  Object.fromEntries(Object.entries(record || {}).map(([key, meal]) => [key, cloneMeal(meal)]));

export const cloneOverrides = (overrides: MealOverrideMap = {}): MealOverrideMap =>
  Object.fromEntries(
    Object.entries(overrides || {}).map(([dayKey, meals]) => [
      dayKey,
      Object.fromEntries(
        Object.entries(meals || {}).map(([mealKey, meal]) => [mealKey, cloneMeal(meal)])
      ),
    ])
  );

export const mergeOverrideMaps = (
  ...maps: MealOverrideMap[]
): MealOverrideMap => {
  const result: MealOverrideMap = {};
  maps.forEach((map) => {
    Object.entries(map || {}).forEach(([dayKey, meals]) => {
      if (!result[dayKey]) result[dayKey] = {};
      Object.entries(meals || {}).forEach(([mealKey, meal]) => {
        result[dayKey][mealKey] = cloneMeal(meal);
      });
    });
  });
  return result;
};
