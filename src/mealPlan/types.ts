import type { Nutrients } from '../nutrition/nutrients';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type Ingredient = {
  id?: string;
  name: string;
  amount: number;
  unit: 'g';
  displayAmount?: number;
  displayUnit?: string;
  fdcId?: number;
  nutrientsPer100g?: Nutrients;
};

export type Meal = {
  name: string;
  color?: string;
  notes?: string;
  ingredients: Ingredient[];
};

export type MealLibrary = Record<MealType, Record<string, Meal>>;

export type MealOverrideMap = {
  [dayKey: string]: {
    [mealInstanceKey: string]: Meal;
  };
};

export type DayPlan = {
  day: number;
  dinnerType: string;
};

export type MealInstance = {
  mealType: MealType;
  instanceKey: string;
  templateKey: string;
  meal: Meal;
};

export type EffectiveDay = {
  dayKey: string;
  plan: DayPlan;
  meals: Record<MealType, MealInstance>;
};
