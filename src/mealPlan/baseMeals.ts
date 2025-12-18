import type { DayPlan, Ingredient, Meal, MealLibrary, MealOverrideMap } from './types';
import { createEmptyNutrients, NUTRIENT_KEYS, type Nutrients } from '../nutrition/nutrients';

// Legacy meal definitions are wrapped in an IIFE so we can reuse them without shipping the legacy UI.
const legacyMealData = (() => {
  const BASE_DINNER_RECIPES = {
    KB: {
      name: 'Tuscan Kale & White Bean Stew',
      color: '#2D5A27',
      ingredients: [
        { name: 'Lacinato Kale (chopped)', amount: 150, unit: 'g', calories: 50, protein: 4, carbs: 7, fat: 0.6, fiber: 4 },
        { name: 'Cannellini Beans', amount: 120, unit: 'g', calories: 145, protein: 10, carbs: 26, fat: 0.5, fiber: 7 },
        { name: 'Bone Broth (chicken)', amount: 250, unit: 'ml', calories: 40, protein: 8, carbs: 1, fat: 0.5, fiber: 0 },
        { name: 'Italian Sausage', amount: 60, unit: 'g', calories: 170, protein: 9, carbs: 1, fat: 14, fiber: 0 },
        { name: 'San Marzano Tomatoes', amount: 100, unit: 'g', calories: 26, protein: 1.3, carbs: 5, fat: 0.2, fiber: 1.5 },
        { name: 'Garlic (minced)', amount: 10, unit: 'g', calories: 15, protein: 0.6, carbs: 3, fat: 0, fiber: 0.2 },
        { name: 'Parmesan Cheese', amount: 20, unit: 'g', calories: 80, protein: 7, carbs: 0.5, fat: 5.5, fiber: 0 },
        { name: 'Extra Virgin Olive Oil', amount: 15, unit: 'ml', calories: 132, protein: 0, carbs: 0, fat: 15, fiber: 0 },
        { name: 'Sourdough Bread', amount: 50, unit: 'g', calories: 140, protein: 5, carbs: 27, fat: 1, fiber: 2 }
      ]
    },
    PB: {
      name: 'Braised Pork Belly with Cabbage',
      color: '#8B4513',
      ingredients: [
        { name: 'Pork Belly', amount: 100, unit: 'g', calories: 310, protein: 16, carbs: 0, fat: 27, fiber: 0 },
        { name: 'Napa Cabbage', amount: 150, unit: 'g', calories: 20, protein: 1.5, carbs: 3, fat: 0.2, fiber: 2 },
        { name: 'Barley (cooked)', amount: 120, unit: 'g', calories: 144, protein: 3.5, carbs: 31, fat: 0.5, fiber: 4 },
        { name: 'Kimchi', amount: 60, unit: 'g', calories: 15, protein: 1, carbs: 2, fat: 0.3, fiber: 1.5 },
        { name: 'Green Onions', amount: 20, unit: 'g', calories: 6, protein: 0.4, carbs: 1.4, fat: 0, fiber: 0.5 },
        { name: 'Ginger (fresh)', amount: 10, unit: 'g', calories: 8, protein: 0.2, carbs: 2, fat: 0, fiber: 0.2 },
        { name: 'Soy Sauce (low sodium)', amount: 15, unit: 'ml', calories: 10, protein: 1.5, carbs: 1, fat: 0, fiber: 0 },
        { name: 'Rice Vinegar', amount: 10, unit: 'ml', calories: 2, protein: 0, carbs: 0.5, fat: 0, fiber: 0 },
        { name: 'Sesame Oil', amount: 5, unit: 'ml', calories: 44, protein: 0, carbs: 0, fat: 5, fiber: 0 }
      ]
    },
    BY: {
      name: 'Roasted Beet & Yogurt Bowl',
      color: '#8B1538',
      ingredients: [
        { name: 'Roasted Beets', amount: 200, unit: 'g', calories: 110, protein: 3.2, carbs: 25, fat: 0.3, fiber: 5 },
        { name: 'Greek Yogurt', amount: 150, unit: 'g', calories: 150, protein: 15, carbs: 6, fat: 8, fiber: 0 },
        { name: 'Goat Cheese (chèvre)', amount: 40, unit: 'g', calories: 100, protein: 7, carbs: 0, fat: 8, fiber: 0 },
        { name: 'Walnuts (toasted)', amount: 25, unit: 'g', calories: 163, protein: 3.8, carbs: 3.4, fat: 16, fiber: 1.7 },
        { name: 'Fresh Orange Segments', amount: 80, unit: 'g', calories: 38, protein: 0.8, carbs: 9, fat: 0.1, fiber: 2 },
        { name: 'Arugula', amount: 40, unit: 'g', calories: 10, protein: 1, carbs: 1.5, fat: 0.3, fiber: 0.6 },
        { name: 'Fresh Dill', amount: 5, unit: 'g', calories: 2, protein: 0.2, carbs: 0.4, fat: 0, fiber: 0.2 },
        { name: 'Extra Virgin Olive Oil', amount: 15, unit: 'ml', calories: 132, protein: 0, carbs: 0, fat: 15, fiber: 0 },
        { name: 'Honey', amount: 10, unit: 'g', calories: 30, protein: 0, carbs: 8, fat: 0, fiber: 0 }
      ]
    },
    BS: {
      name: 'Hearty Bone Broth Beef Stew',
      color: '#6B4423',
      ingredients: [
        { name: 'Beef Chuck (cubed)', amount: 120, unit: 'g', calories: 270, protein: 26, carbs: 0, fat: 18, fiber: 0 },
        { name: 'Bone Broth (beef)', amount: 300, unit: 'ml', calories: 50, protein: 10, carbs: 1, fat: 0.5, fiber: 0 },
        { name: 'Carrots', amount: 100, unit: 'g', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8 },
        { name: 'Celery', amount: 60, unit: 'g', calories: 10, protein: 0.4, carbs: 2, fat: 0.1, fiber: 1 },
        { name: 'Potatoes (baby)', amount: 100, unit: 'g', calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2 },
        { name: 'Onion', amount: 60, unit: 'g', calories: 24, protein: 0.7, carbs: 5.6, fat: 0.1, fiber: 1 },
        { name: 'Fresh Thyme', amount: 5, unit: 'g', calories: 5, protein: 0.3, carbs: 1, fat: 0.1, fiber: 0.5 },
        { name: 'Red Wine', amount: 60, unit: 'ml', calories: 50, protein: 0, carbs: 2, fat: 0, fiber: 0 },
        { name: 'Butter (grass-fed)', amount: 15, unit: 'g', calories: 107, protein: 0.1, carbs: 0, fat: 12, fiber: 0 }
      ]
    },
    CC: {
      name: 'Coconut Chickpea Curry',
      color: '#D4A574',
      ingredients: [
        { name: 'Chickpeas (cooked)', amount: 150, unit: 'g', calories: 180, protein: 9.5, carbs: 30, fat: 3, fiber: 8 },
        { name: 'Coconut Milk (full-fat)', amount: 100, unit: 'ml', calories: 180, protein: 1.8, carbs: 2.8, fat: 19, fiber: 0 },
        { name: 'Spinach (fresh)', amount: 100, unit: 'g', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
        { name: 'Brown Rice (cooked)', amount: 120, unit: 'g', calories: 132, protein: 3, carbs: 28, fat: 1.1, fiber: 2 },
        { name: 'Tomatoes (diced)', amount: 100, unit: 'g', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
        { name: 'Garam Masala', amount: 5, unit: 'g', calories: 15, protein: 0.6, carbs: 2.7, fat: 0.6, fiber: 0.8 },
        { name: 'Turmeric', amount: 3, unit: 'g', calories: 9, protein: 0.3, carbs: 2, fat: 0.1, fiber: 0.5 },
        { name: 'Fresh Cilantro', amount: 10, unit: 'g', calories: 2, protein: 0.2, carbs: 0.4, fat: 0.1, fiber: 0.3 },
        { name: 'Ghee', amount: 10, unit: 'g', calories: 90, protein: 0, carbs: 0, fat: 10, fiber: 0 }
      ]
    },
    SP: {
      name: 'Loaded Sweet Potato',
      color: '#E07020',
      ingredients: [
        { name: 'Sweet Potato (large)', amount: 250, unit: 'g', calories: 215, protein: 4, carbs: 50, fat: 0.3, fiber: 7 },
        { name: 'Black Beans', amount: 100, unit: 'g', calories: 130, protein: 8.5, carbs: 23, fat: 0.5, fiber: 7 },
        { name: 'Greek Yogurt', amount: 80, unit: 'g', calories: 80, protein: 8, carbs: 3.2, fat: 4, fiber: 0 },
        { name: 'Avocado', amount: 60, unit: 'g', calories: 96, protein: 1.2, carbs: 5, fat: 9, fiber: 4 },
        { name: 'Cotija Cheese', amount: 25, unit: 'g', calories: 90, protein: 5.5, carbs: 1, fat: 7.5, fiber: 0 },
        { name: 'Pickled Red Onion', amount: 30, unit: 'g', calories: 15, protein: 0.3, carbs: 3.5, fat: 0, fiber: 0.5 },
        { name: 'Fresh Lime Juice', amount: 15, unit: 'ml', calories: 4, protein: 0.1, carbs: 1.4, fat: 0, fiber: 0 },
        { name: 'Cilantro', amount: 10, unit: 'g', calories: 2, protein: 0.2, carbs: 0.4, fat: 0.1, fiber: 0.3 },
        { name: 'Hot Sauce', amount: 5, unit: 'ml', calories: 1, protein: 0, carbs: 0.2, fat: 0, fiber: 0 }
      ]
    },
    MC: {
      name: 'Miso-Glazed Cabbage Steak',
      color: '#5A8F5A',
      ingredients: [
        { name: 'Green Cabbage (thick slices)', amount: 250, unit: 'g', calories: 63, protein: 3.2, carbs: 15, fat: 0.3, fiber: 6 },
        { name: 'White Miso Paste', amount: 30, unit: 'g', calories: 60, protein: 3.6, carbs: 7.5, fat: 2, fiber: 1 },
        { name: 'Silken Tofu', amount: 100, unit: 'g', calories: 55, protein: 5, carbs: 2, fat: 3, fiber: 0 },
        { name: 'Short Grain Rice (cooked)', amount: 130, unit: 'g', calories: 169, protein: 3.5, carbs: 37, fat: 0.4, fiber: 1 },
        { name: 'Shiitake Mushrooms', amount: 60, unit: 'g', calories: 21, protein: 1.5, carbs: 4, fat: 0.3, fiber: 1.5 },
        { name: 'Pickled Cucumber', amount: 50, unit: 'g', calories: 12, protein: 0.3, carbs: 2.8, fat: 0.1, fiber: 0.6 },
        { name: 'Nori (crumbled)', amount: 3, unit: 'g', calories: 9, protein: 1.5, carbs: 1.4, fat: 0.1, fiber: 0.4 },
        { name: 'Sesame Seeds', amount: 8, unit: 'g', calories: 46, protein: 1.4, carbs: 1.9, fat: 4, fiber: 0.9 },
        { name: 'Mirin', amount: 15, unit: 'ml', calories: 35, protein: 0, carbs: 8, fat: 0, fiber: 0 },
        { name: 'Sesame Oil', amount: 10, unit: 'ml', calories: 88, protein: 0, carbs: 0, fat: 10, fiber: 0 }
      ]
    }
  };

  const BASE_MEALS = {
    breakfast: {
      shake: {
        name: 'Morning Shake',
        ingredients: [
          { name: 'Greek Yogurt (full-fat)', amount: 150, unit: 'g', calories: 150, protein: 15, carbs: 6, fat: 8, fiber: 0 },
          { name: 'Kefir', amount: 100, unit: 'ml', calories: 65, protein: 3, carbs: 4, fat: 4, fiber: 0 },
          { name: 'Blueberries (frozen)', amount: 80, unit: 'g', calories: 46, protein: 0.6, carbs: 12, fat: 0.3, fiber: 2 },
          { name: 'Ground Flaxseed', amount: 15, unit: 'g', calories: 78, protein: 2.7, carbs: 4.3, fat: 6, fiber: 4 },
          { name: 'Chia Seeds', amount: 10, unit: 'g', calories: 49, protein: 1.6, carbs: 4.2, fat: 3, fiber: 3.4 },
          { name: 'Collagen Peptides', amount: 10, unit: 'g', calories: 35, protein: 9, carbs: 0, fat: 0, fiber: 0 },
          { name: 'Raw Honey', amount: 10, unit: 'g', calories: 30, protein: 0, carbs: 8, fat: 0, fiber: 0 },
          { name: 'Psyllium Husk', amount: 5, unit: 'g', calories: 10, protein: 0, carbs: 2, fat: 0, fiber: 4 }
        ]
      },
      chia: {
        name: 'Chia Pudding Bowl',
        ingredients: [
          { name: 'Chia Seeds', amount: 30, unit: 'g', calories: 147, protein: 5, carbs: 13, fat: 9, fiber: 10 },
          { name: 'Whole Milk', amount: 200, unit: 'ml', calories: 120, protein: 6, carbs: 10, fat: 6, fiber: 0 },
          { name: 'Greek Yogurt', amount: 100, unit: 'g', calories: 100, protein: 10, carbs: 4, fat: 5, fiber: 0 },
          { name: 'Walnuts (chopped)', amount: 20, unit: 'g', calories: 130, protein: 3, carbs: 3, fat: 13, fiber: 1.3 },
          { name: 'Fresh Berries', amount: 60, unit: 'g', calories: 25, protein: 0.5, carbs: 6, fat: 0.2, fiber: 2 },
          { name: 'Raw Honey', amount: 10, unit: 'g', calories: 30, protein: 0, carbs: 8, fat: 0, fiber: 0 }
        ]
      }
    },
    lunch: {
      salmon: {
        name: 'Salmon & Rice Bowl',
        ingredients: [
          { name: 'Wild Salmon Fillet', amount: 150, unit: 'g', calories: 280, protein: 39, carbs: 0, fat: 13, fiber: 0 },
          { name: 'Brown Rice (cooked)', amount: 150, unit: 'g', calories: 165, protein: 3.8, carbs: 35, fat: 1.4, fiber: 2.5 },
          { name: 'Natto', amount: 40, unit: 'g', calories: 80, protein: 7, carbs: 5, fat: 4, fiber: 2 },
          { name: 'Steamed Broccoli', amount: 100, unit: 'g', calories: 35, protein: 2.4, carbs: 7, fat: 0.4, fiber: 3 },
          { name: 'Pickled Ginger', amount: 20, unit: 'g', calories: 8, protein: 0.1, carbs: 2, fat: 0, fiber: 0.2 },
          { name: 'Miso Dressing', amount: 20, unit: 'g', calories: 35, protein: 2, carbs: 3, fat: 2, fiber: 0.5 },
          { name: 'Sesame Seeds', amount: 5, unit: 'g', calories: 29, protein: 0.9, carbs: 1.2, fat: 2.5, fiber: 0.6 },
          { name: 'Extra Virgin Olive Oil', amount: 10, unit: 'ml', calories: 88, protein: 0, carbs: 0, fat: 10, fiber: 0 }
        ]
      },
      trout: {
        name: 'Rainbow Trout & Quinoa',
        ingredients: [
          { name: 'Rainbow Trout Fillet', amount: 150, unit: 'g', calories: 195, protein: 33, carbs: 0, fat: 6, fiber: 0 },
          { name: 'Quinoa (cooked)', amount: 130, unit: 'g', calories: 156, protein: 5.6, carbs: 27, fat: 2.6, fiber: 3.5 },
          { name: 'Sauerkraut', amount: 60, unit: 'g', calories: 15, protein: 0.6, carbs: 3, fat: 0.1, fiber: 2 },
          { name: 'Roasted Beets', amount: 80, unit: 'g', calories: 44, protein: 1.3, carbs: 10, fat: 0.1, fiber: 2 },
          { name: 'Fresh Dill', amount: 5, unit: 'g', calories: 2, protein: 0.2, carbs: 0.4, fat: 0, fiber: 0.2 },
          { name: 'Lemon Juice', amount: 15, unit: 'ml', calories: 4, protein: 0.1, carbs: 1, fat: 0, fiber: 0 },
          { name: 'Extra Virgin Olive Oil', amount: 15, unit: 'ml', calories: 132, protein: 0, carbs: 0, fat: 15, fiber: 0 }
        ]
      }
    },
    dinner: BASE_DINNER_RECIPES,
    snacks: {
      default: {
        name: 'Afternoon Snack',
        ingredients: [
          { name: 'Dark Chocolate (85%)', amount: 20, unit: 'g', calories: 110, protein: 2.4, carbs: 8, fat: 9, fiber: 2 },
          { name: 'Mixed Nuts', amount: 25, unit: 'g', calories: 160, protein: 4, carbs: 7, fat: 14, fiber: 2 },
          { name: 'Fresh Apple', amount: 100, unit: 'g', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4 }
        ]
      }
    }
  };
  return { BASE_MEALS };
})();

const LEGACY_BASE_MEALS = legacyMealData.BASE_MEALS as LegacyMealLibrary;

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
];;

export const BASE_MEALS: MealLibrary = normalizeMealLibrary(LEGACY_BASE_MEALS);

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
  mealType: keyof MealLibrary,
  templateKey: string
): Meal => cloneMeal(BASE_MEALS[mealType]?.[templateKey]);

export const resolveBaseMealForDay = (
  mealType: keyof MealLibrary,
  day: number,
  dinnerCode: string
): { meal: Meal; instanceKey: string; templateKey: string } => {
  const templateKey = getDefaultMealKey(mealType, day, dinnerCode);
  const instanceKey = getMealInstanceKey(mealType, templateKey);
  return {
    meal: resolveBaseMeal(mealType, templateKey),
    instanceKey,
    templateKey,
  };
};

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

function normalizeMealLibrary(library: LegacyMealLibrary): MealLibrary {
  return {
    breakfast: normalizeMealRecord(library.breakfast),
    lunch: normalizeMealRecord(library.lunch),
    dinner: normalizeMealRecord(library.dinner),
    snacks: normalizeMealRecord(library.snacks),
  };
}

function normalizeMealRecord(record: Record<string, LegacyMeal>): Record<string, Meal> {
  return Object.fromEntries(
    Object.entries(record || {}).map(([key, meal]) => [key, normalizeMeal(meal)])
  );
}

function normalizeMeal(meal: LegacyMeal): Meal {
  return {
    name: meal.name,
    color: meal.color,
    ingredients: (meal.ingredients || []).map((ingredient) => convertIngredient(ingredient)),
  };
}

type LegacyIngredient = ({ name: string; amount: number; unit: string; fdcId?: number } &
  Partial<Record<keyof Nutrients, number>>);

type LegacyMeal = {
  name: string;
  color?: string;
  ingredients: LegacyIngredient[];
};

type LegacyMealLibrary = {
  breakfast: Record<string, LegacyMeal>;
  lunch: Record<string, LegacyMeal>;
  dinner: Record<string, LegacyMeal>;
  snacks: Record<string, LegacyMeal>;
};

function convertIngredient(ingredient: LegacyIngredient): Ingredient {
  const grams = Number(ingredient.amount) || 0;
  const ratio = grams ? grams / 100 : 1;
  const per100: Nutrients = createEmptyNutrients();
  NUTRIENT_KEYS.forEach((key) => {
    const value = Number((ingredient as Record<string, number>)[key] ?? 0);
    per100[key] = ratio ? value / ratio : 0;
  });

  return {
    name: ingredient.name,
    amount: grams,
    unit: 'g',
    displayAmount: ingredient.amount,
    displayUnit: ingredient.unit,
    fdcId: ingredient.fdcId,
    nutrientsPer100g: per100,
  };
}
