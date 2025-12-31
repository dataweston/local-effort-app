import type { Nutrients } from '../nutrition/nutrients';
import { createEmptyNutrients } from '../nutrition/nutrients';
import { getFood, setFood, type CachedFood } from './usdaCache';

const USDA_API_KEY =
  import.meta.env.VITE_USDA_API_KEY ||
  import.meta.env.NEXT_PUBLIC_USDA_API_KEY ||
  import.meta.env.USDA_API_KEY ||
  '';

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

const nutrientIdMap: Record<number, keyof Nutrients> = {
  1008: 'calories',
  1003: 'protein',
  1005: 'carbs',
  1004: 'fat',
  1079: 'fiber',
  1292: 'ala',
  1278: 'epa',
  1272: 'dha',
  1106: 'vitA',
  1178: 'b12',
  1177: 'folate',
  1162: 'vitC',
  1114: 'vitD',
  1185: 'vitK',
  1087: 'calcium',
  1090: 'magnesium',
  1092: 'potassium',
  1095: 'zinc',
  1089: 'iron',
};

const isConfigured = Boolean(USDA_API_KEY);

type UsdaSearchResult = {
  fdcId: number;
  description: string;
  brandOwner?: string | null;
};

const withKey = (path: string) =>
  `${USDA_BASE_URL}${path}${path.includes('?') ? '&' : '?'}api_key=${USDA_API_KEY}`;

export const searchFoods = async (
  query: string
): Promise<UsdaSearchResult[]> => {
  if (!isConfigured || !query || query.length < 2) return [];

  try {
    const response = await fetch(
      withKey(
        `/foods/search?query=${encodeURIComponent(
          query
        )}&pageSize=10&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`
      )
    );
    const data = await response.json();
    return (data.foods || []).map((food: any) => ({
      fdcId: food.fdcId,
      description: food.description,
      brandOwner: food.brandOwner || null,
    }));
  } catch (error) {
    console.error('USDA search failed', error);
    return [];
  }
};

export const normalizeNutrients = (foodNutrients: any[]): Nutrients => {
  const nutrients = createEmptyNutrients();
  foodNutrients?.forEach((entry) => {
    const id = entry.nutrientId ?? entry.nutrient?.id;
    const key = id ? nutrientIdMap[id] : null;
    if (key) {
      nutrients[key] = Number(entry.value ?? entry.amount ?? 0) || 0;
    }
  });
  nutrients.epa_dha = (nutrients.epa || 0) + (nutrients.dha || 0);
  return nutrients;
};

export const getFoodDetails = async (
  fdcId: number
): Promise<CachedFood | null> => {
  if (!isConfigured) return null;

  const cached = await getFood(fdcId);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(withKey(`/food/${fdcId}`));
    if (!response.ok) {
      throw new Error(`USDA responded with ${response.status}`);
    }
    const data = await response.json();
    const nutrients = normalizeNutrients(data.foodNutrients || []);
    const payload: Omit<CachedFood, 'cachedAt'> = {
      fdcId: data.fdcId,
      description: data.description,
      brandOwner: data.brandOwner || null,
      nutrientsPer100g: nutrients,
      portions: (data.foodPortions || []).map((portion: any) => ({
        amount: portion.amount,
        unit: portion.modifier || portion.measureUnit?.name || 'serving',
        gramWeight: portion.gramWeight,
      })),
    };
    await setFood(fdcId, payload);
    return { ...payload, cachedAt: Date.now() };
  } catch (error) {
    console.error(`Failed to fetch USDA food ${fdcId}`, error);
    return null;
  }
};
