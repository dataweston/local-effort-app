import type { Meal, Ingredient } from '../mealPlan/types';
import {
  createEmptyNutrients,
  NUTRIENT_KEYS,
  type Nutrients,
} from './nutrients';

export const scaleNutrients = (
  nutrientsPer100g: Nutrients | undefined,
  grams: number
): Nutrients => {
  if (!nutrientsPer100g) {
    return createEmptyNutrients();
  }

  const ratio = grams ? grams / 100 : 0;
  const scaled = createEmptyNutrients();
  NUTRIENT_KEYS.forEach((key) => {
    scaled[key] = (nutrientsPer100g[key] || 0) * ratio;
  });
  return scaled;
};

export const sumIngredient = (ingredient: Ingredient): Nutrients =>
  scaleNutrients(ingredient.nutrientsPer100g, ingredient.amount);

export const sumMeal = (meal?: Meal): Nutrients => {
  if (!meal) {
    return createEmptyNutrients();
  }

  const total = createEmptyNutrients();
  (meal.ingredients || []).forEach((ingredient) => {
    const scaled = sumIngredient(ingredient);
    NUTRIENT_KEYS.forEach((key) => {
      total[key] += scaled[key] || 0;
    });
  });
  return total;
};

export const sumDay = (meals: Meal[]): Nutrients =>
  meals.reduce((acc, meal) => {
    const mealTotals = sumMeal(meal);
    NUTRIENT_KEYS.forEach((key) => {
      acc[key] += mealTotals[key] || 0;
    });
    return acc;
  }, createEmptyNutrients());
