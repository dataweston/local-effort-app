import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const SUPABASE_MEAL_SYNC_ENABLED = (
  import.meta.env.VITE_ENABLE_MEAL_CUSTOMIZATIONS ||
  import.meta.env.NEXT_PUBLIC_ENABLE_MEAL_CUSTOMIZATIONS ||
  ''
).toString().toLowerCase() === 'true';

// ============================================================================
// CONFIGURATION - Uses existing env vars inside the app shell
// ============================================================================

const USDA_API_KEY =
  import.meta.env.VITE_USDA_API_KEY ||
  import.meta.env.NEXT_PUBLIC_USDA_API_KEY ||
  import.meta.env.USDA_API_KEY ||
  '';

const isUsdaConfigured = Boolean(USDA_API_KEY);

// ============================================================================
// USDA FoodData Central API Integration
// ============================================================================

const searchFoods = async (query) => {
  if (!query || query.length < 2 || !isUsdaConfigured) return [];
  
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=10&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`
    );
    const data = await response.json();
    
    return (data.foods || []).map(food => ({
      fdcId: food.fdcId,
      name: food.description,
      brandOwner: food.brandOwner || null,
      nutrients: extractNutrients(food.foodNutrients || []),
      servingSize: food.servingSize || 100,
      servingUnit: food.servingSizeUnit || 'g'
    }));
  } catch (error) {
    console.error('USDA API error:', error);
    return [];
  }
};

const getFoodDetails = async (fdcId) => {
  if (!isUsdaConfigured) return null;
  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_API_KEY}`
    );
    const food = await response.json();
    
    return {
      fdcId: food.fdcId,
      name: food.description,
      nutrients: extractNutrients(food.foodNutrients || []),
      servingSize: food.servingSize || 100,
      servingUnit: food.servingSizeUnit || 'g',
      portions: (food.foodPortions || []).map(p => ({
        amount: p.amount,
        unit: p.modifier || p.measureUnit?.name || 'serving',
        gramWeight: p.gramWeight
      }))
    };
  } catch (error) {
    console.error('USDA API error:', error);
    return null;
  }
};

const extractNutrients = (foodNutrients) => {
  const nutrientMap = {
    1008: 'calories',    // Energy (kcal)
    1003: 'protein',     // Protein
    1005: 'carbs',       // Carbohydrate
    1004: 'fat',         // Total lipid (fat)
    1079: 'fiber',       // Fiber, total dietary
    1292: 'ala',         // 18:3 n-3 c,c,c (ALA)
    1278: 'epa',         // 20:5 n-3 (EPA)
    1272: 'dha',         // 22:6 n-3 (DHA)
    1106: 'vitA',        // Vitamin A, RAE
    1178: 'b12',         // Vitamin B-12
    1177: 'folate',      // Folate, total
    1162: 'vitC',        // Vitamin C
    1114: 'vitD',        // Vitamin D (D2 + D3)
    1185: 'vitK',        // Vitamin K
    1087: 'calcium',     // Calcium
    1090: 'magnesium',   // Magnesium
    1092: 'potassium',   // Potassium
    1095: 'zinc',        // Zinc
    1089: 'iron'         // Iron
  };
  
  const nutrients = {};
  foodNutrients.forEach(n => {
    const id = n.nutrientId || n.nutrient?.id;
    const key = nutrientMap[id];
    if (key) {
      nutrients[key] = n.value || n.amount || 0;
    }
  });
  
  // Combine EPA and DHA
  nutrients.epa_dha = (nutrients.epa || 0) + (nutrients.dha || 0);
  
  // Set defaults for missing values
  Object.values(nutrientMap).forEach(key => {
    if (!(key in nutrients)) nutrients[key] = 0;
  });
  
  return nutrients;
};

// ============================================================================
// INGREDIENT ENRICHMENT - Fetch USDA data for all ingredients
// ============================================================================

const USDA_CACHE_KEY = 'january-meals-usda-cache';
const CACHE_VERSION = 1;

// Load cached USDA data from localStorage
const loadUsdaCache = () => {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(USDA_CACHE_KEY);
    if (!cached) return {};
    const parsed = JSON.parse(cached);
    if (parsed.version !== CACHE_VERSION) return {};
    return parsed.data || {};
  } catch (e) {
    console.error('Error loading USDA cache:', e);
    return {};
  }
};

// Save USDA cache to localStorage
const saveUsdaCache = (cache) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USDA_CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      data: cache
    }));
  } catch (e) {
    console.error('Error saving USDA cache:', e);
  }
};

// We treat USDA as the single source of truth for micronutrients.
// An ingredient is considered "complete" only if it already has an fdcId
// (i.e., it was populated from USDA or cache previously).
const hasCompleteNutrition = (ingredient) => !!ingredient.fdcId;

// Enrich a single ingredient with USDA data
const enrichIngredient = async (ingredient, cache) => {
  // If ingredient already has fdcId (USDA-backed), return as-is
  if (hasCompleteNutrition(ingredient)) {
    return ingredient;
  }

  // Check cache first
  const cacheKey = ingredient.name.toLowerCase().trim();
  if (cache[cacheKey]) {
    const ratio = ingredient.amount / 100;
    const nutrients = cache[cacheKey];
    return {
      ...ingredient,
      fdcId: nutrients.fdcId,
      calories: Math.round((nutrients.calories || 0) * ratio * 10) / 10,
      protein: Math.round((nutrients.protein || 0) * ratio * 10) / 10,
      carbs: Math.round((nutrients.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((nutrients.fat || 0) * ratio * 10) / 10,
      fiber: Math.round((nutrients.fiber || 0) * ratio * 10) / 10,
      ala: Math.round((nutrients.ala || 0) * ratio * 100) / 100,
      epa: Math.round((nutrients.epa || 0) * ratio * 100) / 100,
      dha: Math.round((nutrients.dha || 0) * ratio * 100) / 100,
      epa_dha: Math.round((nutrients.epa_dha || 0) * ratio * 100) / 100,
      vitA: Math.round((nutrients.vitA || 0) * ratio),
      b12: Math.round((nutrients.b12 || 0) * ratio * 10) / 10,
      folate: Math.round((nutrients.folate || 0) * ratio),
      vitC: Math.round((nutrients.vitC || 0) * ratio),
      vitD: Math.round((nutrients.vitD || 0) * ratio * 10) / 10,
      vitK: Math.round((nutrients.vitK || 0) * ratio),
      calcium: Math.round((nutrients.calcium || 0) * ratio),
      magnesium: Math.round((nutrients.magnesium || 0) * ratio),
      potassium: Math.round((nutrients.potassium || 0) * ratio),
      zinc: Math.round((nutrients.zinc || 0) * ratio * 10) / 10,
      iron: Math.round((nutrients.iron || 0) * ratio * 10) / 10
    };
  }

  // Fetch from USDA API
  if (!isUsdaConfigured) {
    return ingredient;
  }

  try {
    const foods = await searchFoods(ingredient.name);
    if (!foods || foods.length === 0) {
      console.warn(`No USDA data found for: ${ingredient.name}`);
      return ingredient;
    }

    // Use the first result
    const food = foods[0];
    const nutrients = food.nutrients;

    // Cache the per-100g nutrients
    cache[cacheKey] = {
      fdcId: food.fdcId,
      ...nutrients
    };

    // Apply to this ingredient
    const ratio = ingredient.amount / 100;
    return {
      ...ingredient,
      fdcId: food.fdcId,
      calories: Math.round((nutrients.calories || 0) * ratio * 10) / 10,
      protein: Math.round((nutrients.protein || 0) * ratio * 10) / 10,
      carbs: Math.round((nutrients.carbs || 0) * ratio * 10) / 10,
      fat: Math.round((nutrients.fat || 0) * ratio * 10) / 10,
      fiber: Math.round((nutrients.fiber || 0) * ratio * 10) / 10,
      ala: Math.round((nutrients.ala || 0) * ratio * 100) / 100,
      epa: Math.round((nutrients.epa || 0) * ratio * 100) / 100,
      dha: Math.round((nutrients.dha || 0) * ratio * 100) / 100,
      epa_dha: Math.round((nutrients.epa_dha || 0) * ratio * 100) / 100,
      vitA: Math.round((nutrients.vitA || 0) * ratio),
      b12: Math.round((nutrients.b12 || 0) * ratio * 10) / 10,
      folate: Math.round((nutrients.folate || 0) * ratio),
      vitC: Math.round((nutrients.vitC || 0) * ratio),
      vitD: Math.round((nutrients.vitD || 0) * ratio * 10) / 10,
      vitK: Math.round((nutrients.vitK || 0) * ratio),
      calcium: Math.round((nutrients.calcium || 0) * ratio),
      magnesium: Math.round((nutrients.magnesium || 0) * ratio),
      potassium: Math.round((nutrients.potassium || 0) * ratio),
      zinc: Math.round((nutrients.zinc || 0) * ratio * 10) / 10,
      iron: Math.round((nutrients.iron || 0) * ratio * 10) / 10
    };
  } catch (error) {
    console.error(`Error enriching ingredient ${ingredient.name}:`, error);
    return ingredient;
  }
};

// Enrich all ingredients in meal recipes
const enrichMealRecipes = async (recipes, onProgress) => {
  const cache = loadUsdaCache();
  let enriched = 0;
  let total = 0;

  // Count total ingredients
  for (const mealType of Object.values(recipes)) {
    for (const meal of Object.values(mealType)) {
      total += (meal.ingredients || []).length;
    }
  }

  const enrichedRecipes = {};

  for (const [mealTypeKey, mealType] of Object.entries(recipes)) {
    enrichedRecipes[mealTypeKey] = {};
    
    for (const [mealKey, meal] of Object.entries(mealType)) {
      const enrichedIngredients = [];
      
      for (const ingredient of (meal.ingredients || [])) {
        const enrichedIngredient = await enrichIngredient(ingredient, cache);
        enrichedIngredients.push(enrichedIngredient);
        enriched++;
        
        if (onProgress) {
          onProgress(enriched, total);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      enrichedRecipes[mealTypeKey][mealKey] = {
        ...meal,
        ingredients: enrichedIngredients
      };
    }
  }

  // Save updated cache
  saveUsdaCache(cache);

  return enrichedRecipes;
};

// ============================================================================
// DATA: Complete meal plan with recipes, ingredients, and nutrition
// ============================================================================

const GOALS_STORAGE_KEY = 'january-meal-plan-goals';
const MEAL_RECIPES_STORAGE_KEY = 'january-meal-plan-recipes';

const DEFAULT_DIET_GOALS = {
  calories: { min: 1500, max: 1800, label: 'Calories', unit: 'kcal' },
  protein: { min: 90, max: 100, label: 'Protein', unit: 'g' },
  carbs: { min: 140, max: 170, label: 'Carbs', unit: 'g' },
  fat: { min: 65, max: 75, label: 'Fat', unit: 'g' },
  fiber: { min: 40, max: 60, label: 'Fiber', unit: 'g' },
  omega3: { min: 2, max: 3, label: 'Omega-3', unit: 'g' }
};

const NUTRIENT_FIELDS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'ala',
  'epa',
  'dha',
  'epa_dha',
  'vitA',
  'b12',
  'folate',
  'vitC',
  'vitD',
  'vitK',
  'calcium',
  'magnesium',
  'potassium',
  'zinc',
  'iron'
];

const createEmptyNutrition = () =>
  NUTRIENT_FIELDS.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {}
  );

const sumNutrition = (ingredients = []) => {
  const totals = createEmptyNutrition();
  ingredients.forEach((ingredient) => {
    NUTRIENT_FIELDS.forEach((key) => {
      const value = Number(ingredient?.[key] ?? 0);
      if (!Number.isNaN(value)) {
        totals[key] += value;
      }
    });
  });
  return totals;
};

const NUTRITION_CSV_FIELDS = [
  { key: 'day', label: 'Day' },
  { key: 'dinnerType', label: 'Dinner Code' },
  { key: 'dinnerName', label: 'Dinner Name' },
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'ala', label: 'ALA (g)' },
  { key: 'epa_dha', label: 'EPA + DHA (g)' },
  { key: 'vitA', label: 'Vitamin A (mcg)' },
  { key: 'b12', label: 'Vitamin B12 (mcg)' },
  { key: 'folate', label: 'Folate (mcg)' },
  { key: 'vitC', label: 'Vitamin C (mg)' },
  { key: 'vitD', label: 'Vitamin D (mcg)' },
  { key: 'vitK', label: 'Vitamin K (mcg)' },
  { key: 'calcium', label: 'Calcium (mg)' },
  { key: 'magnesium', label: 'Magnesium (mg)' },
  { key: 'potassium', label: 'Potassium (mg)' },
  { key: 'zinc', label: 'Zinc (mg)' },
  { key: 'iron', label: 'Iron (mg)' },
];

const MEAL_DETAIL_FIELDS = [
  { key: 'day', label: 'Day' },
  { key: 'dinnerType', label: 'Dinner Code' },
  { key: 'mealType', label: 'Meal Type' },
  { key: 'mealName', label: 'Meal Name' },
  { key: 'ingredientName', label: 'Ingredient' },
  { key: 'amount', label: 'Amount' },
  { key: 'unit', label: 'Unit' },
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'ala', label: 'ALA (g)' },
  { key: 'epa_dha', label: 'EPA + DHA (g)' },
  { key: 'vitA', label: 'Vitamin A (mcg)' },
  { key: 'b12', label: 'Vitamin B12 (mcg)' },
  { key: 'folate', label: 'Folate (mcg)' },
  { key: 'vitC', label: 'Vitamin C (mg)' },
  { key: 'vitD', label: 'Vitamin D (mcg)' },
  { key: 'vitK', label: 'Vitamin K (mcg)' },
  { key: 'calcium', label: 'Calcium (mg)' },
  { key: 'magnesium', label: 'Magnesium (mg)' },
  { key: 'potassium', label: 'Potassium (mg)' },
  { key: 'zinc', label: 'Zinc (mg)' },
  { key: 'iron', label: 'Iron (mg)' },
];

const buildNutritionCsv = (dailyEntries, mealRecipes) => {
  const rows = dailyEntries.map((entry) =>
    NUTRITION_CSV_FIELDS.map((field) => {
      if (field.key === 'dinnerName') {
        return mealRecipes?.dinner?.[entry.dinnerType]?.name || '';
      }
      return entry[field.key] ?? '';
    })
  );

  const allRows = [NUTRITION_CSV_FIELDS.map((field) => field.label), ...rows];

  return allRows
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    )
    .join('\r\n');
};

const escapeXml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const buildExcelXml = (dailyEntries, mealRecipes, customMeals) => {
  // Worksheet 1: Daily summary (aggregated nutrition)
  const summaryRows = dailyEntries.map((entry) =>
    NUTRITION_CSV_FIELDS.map((field) => {
      if (field.key === 'dinnerName') {
        return mealRecipes?.dinner?.[entry.dinnerType]?.name || '';
      }
      return entry[field.key] ?? '';
    })
  );

  const summaryHeaderRow = `<Row>${NUTRITION_CSV_FIELDS.map(
    (field) => `<Cell><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
  ).join('')}</Row>`;

  const summaryBodyRows = summaryRows
    .map(
      (row) =>
        `<Row>${row
          .map((value) => {
            const isNumber = typeof value === 'number' && !Number.isNaN(value);
            const type = isNumber ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');

  // Worksheet 2: Meals & ingredients detail
  const detailRows = [];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

  DAILY_PLAN.forEach(({ day, dinnerType }) => {
    mealTypes.forEach((mealType) => {
      const meal = getMealForDay(mealType, day, mealRecipes, customMeals || {}, dinnerType);
      const mealName = meal?.name || '';
      (meal?.ingredients || []).forEach((ingredient) => {
        const rowObj = {
          day,
          dinnerType,
          mealType,
          mealName,
          ingredientName: ingredient.name || '',
          amount: ingredient.amount ?? '',
          unit: ingredient.unit || '',
          calories: ingredient.calories ?? '',
          protein: ingredient.protein ?? '',
          carbs: ingredient.carbs ?? '',
          fat: ingredient.fat ?? '',
          fiber: ingredient.fiber ?? '',
          ala: ingredient.ala ?? '',
          epa_dha: ingredient.epa_dha ?? '',
          vitA: ingredient.vitA ?? '',
          b12: ingredient.b12 ?? '',
          folate: ingredient.folate ?? '',
          vitC: ingredient.vitC ?? '',
          vitD: ingredient.vitD ?? '',
          vitK: ingredient.vitK ?? '',
          calcium: ingredient.calcium ?? '',
          magnesium: ingredient.magnesium ?? '',
          potassium: ingredient.potassium ?? '',
          zinc: ingredient.zinc ?? '',
          iron: ingredient.iron ?? '',
        };

        detailRows.push(
          MEAL_DETAIL_FIELDS.map((field) => rowObj[field.key] ?? '')
        );
      });
    });
  });

  const detailHeaderRow = `<Row>${MEAL_DETAIL_FIELDS.map(
    (field) => `<Cell><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
  ).join('')}</Row>`;

  const detailBodyRows = detailRows
    .map((row) =>
      `<Row>${row
        .map((value) => {
          const isNumber = typeof value === 'number' && !Number.isNaN(value);
          const type = isNumber ? 'Number' : 'String';
          return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
        })
        .join('')}</Row>`
    )
    .join('');

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="January Meals Summary">
    <Table>
      ${summaryHeaderRow}
      ${summaryBodyRows}
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Meals &amp; Ingredients">
    <Table>
      ${detailHeaderRow}
      ${detailBodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
};

const THEME = {
  background: '#F8FAFC',
  panel: '#D9EAFD',
  card: '#BCCCDC',
  accent: '#9AA6B2',
  text: '#0F172A',
  mutedText: '#475569',
};

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

const cloneMealRecipes = (recipes) =>
  Object.fromEntries(
    Object.entries(recipes).map(([mealType, entries]) => [
      mealType,
      Object.fromEntries(
        Object.entries(entries).map(([code, recipe]) => [
          code,
          {
            ...recipe,
            ingredients: (recipe.ingredients || []).map((ingredient) => ({ ...ingredient })),
          },
        ])
      ),
    ])
  );

const mergeMealRecipesWithDefaults = (recipes) => {
  if (!recipes) return cloneMealRecipes(BASE_MEALS);
  const merged = {};
  Object.keys(BASE_MEALS).forEach((mealType) => {
    merged[mealType] = {
      ...BASE_MEALS[mealType],
      ...(recipes[mealType] || {}),
    };
  });
  return cloneMealRecipes(merged);
};

const MEAL_ROTATION = {
  breakfast: (day) => (day % 2 === 0 ? 'chia' : 'shake'),
  lunch: (day) => (day % 2 === 0 ? 'trout' : 'salmon'),
  snacks: () => 'default',
};

const getDefaultMealKey = (mealType, day, dinnerCode) => {
  if (mealType === 'dinner') return dinnerCode;
  if (mealType === 'snacks') return 'default';
  return MEAL_ROTATION[mealType]?.(day);
};

// Dinner rotation template (30 days)
const DAILY_PLAN = [
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

const getMealForDay = (mealType, day, mealRecipes, customMeals, dinnerCode) => {
  const dayKey = `day-${day}`;
  const dayCustomizations = customMeals?.[dayKey] || {};
  const templateKey = getDefaultMealKey(mealType, day, dinnerCode);
  const customKey = mealType === 'snacks' ? 'snacks' : `${mealType}-${templateKey}`;

  return (
    dayCustomizations[customKey] ||
    mealRecipes?.[mealType]?.[templateKey] ||
    { name: 'Custom Meal', ingredients: [] }
  );
};

const buildDailyNutritionEntry = (day, dinnerType, mealRecipes, customMeals) => {
  const totals = createEmptyNutrition();
  ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((mealType) => {
    const meal = getMealForDay(mealType, day, mealRecipes, customMeals, dinnerType);
    const nutrition = sumNutrition(meal?.ingredients || []);
    NUTRIENT_FIELDS.forEach((key) => {
      totals[key] += nutrition[key];
    });
  });
  return { day, dinnerType, ...totals };
};

const buildPlanNutrition = (mealRecipes, customMeals) =>
  DAILY_PLAN.map(({ day, dinnerType }) =>
    buildDailyNutritionEntry(day, dinnerType, mealRecipes, customMeals)
  );

// ============================================================================
// ICON COMPONENTS
// ============================================================================

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4l-6 6 6 6"/>
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 4l6 6-6 6"/>
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4l10 10M14 4L4 14"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M3 8l3 3 7-7"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M13 5v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1h6l3 3z"/>
    <path d="M10 2v3h3M6 9h4M6 12h4"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="6"/>
    <path d="M8 11V7M8 5h.01"/>
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 4.5A1.5 1.5 0 014.5 3H13v10H4.5A1.5 1.5 0 013 11.5V4.5z"/>
    <path d="M8 3v10"/>
  </svg>
);

const SheetsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/>
    <path d="M10 2v3h3"/>
    <path d="M5 8h6M5 11h6"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 3v7"/>
    <path d="M5.5 7.5L8 10l2.5-2.5"/>
    <path d="M3 13h10"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="6"/>
    <circle cx="8" cy="8" r="3"/>
    <circle cx="8" cy="8" r="1"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7" cy="7" r="4"/>
    <path d="M10 10l3 3"/>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="9" cy="5" r="3"/>
    <path d="M3 15c0-3 3-5 6-5s6 2 6 5"/>
  </svg>
);

const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M7 2v10M2 7h10"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 4h10M5 4V2h4v2M6 6v5M8 6v5M3 4l1 8h6l1-8"/>
  </svg>
);

const LoaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <circle cx="8" cy="8" r="6" strokeOpacity="0.25"/>
    <path d="M8 2a6 6 0 016 6" strokeLinecap="round"/>
  </svg>
);

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const CircularProgress = ({ value, max, color, size = 64, strokeWidth = 6, label, unit }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1a1a1a" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-slate-800">{Math.round(percentage)}%</span>
        </div>
      </div>
      <span className="mt-1.5 text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-700">{value}{unit}</span>
    </div>
  );
};

const MicroBar = ({ label, value, max, unit, color }) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-700 font-medium">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-[#BCCCDC] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ============================================================================
// INGREDIENT SEARCH COMPONENT
// ============================================================================

const IngredientSearch = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [amount, setAmount] = useState(100);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const foods = await searchFoods(query);
      setResults(foods);
      setLoading(false);
    }, 300);
    
    return () => clearTimeout(debounceRef.current);
  }, [query]);
  
  const handleSelect = (food) => {
    setSelectedFood(food);
    setAmount(food.servingSize || 100);
  };
  
  const handleConfirm = () => {
    if (!selectedFood) return;
    
    const ratio = amount / 100;
    const nutrients = selectedFood.nutrients;
    
    const ingredient = {
      name: selectedFood.name,
      fdcId: selectedFood.fdcId,
      amount,
      unit: 'g',
      calories: Math.round(nutrients.calories * ratio),
      protein: Math.round(nutrients.protein * ratio * 10) / 10,
      carbs: Math.round(nutrients.carbs * ratio * 10) / 10,
      fat: Math.round(nutrients.fat * ratio * 10) / 10,
      fiber: Math.round(nutrients.fiber * ratio * 10) / 10,
      ala: Math.round(nutrients.ala * ratio * 100) / 100,
      epa: Math.round(nutrients.epa * ratio * 100) / 100,
      dha: Math.round(nutrients.dha * ratio * 100) / 100,
      epa_dha: Math.round(nutrients.epa_dha * ratio * 100) / 100,
      vitA: Math.round(nutrients.vitA * ratio),
      b12: Math.round(nutrients.b12 * ratio * 10) / 10,
      folate: Math.round(nutrients.folate * ratio),
      vitC: Math.round(nutrients.vitC * ratio),
      vitD: Math.round(nutrients.vitD * ratio * 10) / 10,
      vitK: Math.round(nutrients.vitK * ratio),
      calcium: Math.round(nutrients.calcium * ratio),
      magnesium: Math.round(nutrients.magnesium * ratio),
      potassium: Math.round(nutrients.potassium * ratio),
      zinc: Math.round(nutrients.zinc * ratio * 10) / 10,
      iron: Math.round(nutrients.iron * ratio * 10) / 10
    };
    
    onSelect(ingredient);
  };
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#D9EAFD] rounded-xl border border-[#9AA6B2] overflow-hidden">
        <div className="p-4 border-b border-[#9AA6B2]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900">Search Ingredient</h3>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-[#BCCCDC] text-slate-600">
              <XIcon />
            </button>
          </div>
          <div className="relative">
            <SearchIcon />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search USDA database..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#BCCCDC] border border-[#9AA6B2] rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#9AA6B2]"
              style={{ paddingLeft: '2.5rem' }}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <SearchIcon />
            </div>
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA6B2]">
                <LoaderIcon />
              </div>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Data from USDA FoodData Central</p>
        </div>
        
        {selectedFood ? (
          <div className="p-4">
            <div className="p-3 bg-[#BCCCDC] rounded-lg mb-4">
              <p className="font-medium text-slate-900 text-sm">{selectedFood.name}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                <div className="text-center p-2 bg-[#D9EAFD] rounded">
                  <p className="text-[#9AA6B2] font-medium">{Math.round(selectedFood.nutrients.calories * amount / 100)}</p>
                  <p className="text-slate-500">kcal</p>
                </div>
                <div className="text-center p-2 bg-[#D9EAFD] rounded">
                  <p className="text-blue-400 font-medium">{Math.round(selectedFood.nutrients.protein * amount / 100 * 10) / 10}g</p>
                  <p className="text-slate-500">protein</p>
                </div>
                <div className="text-center p-2 bg-[#D9EAFD] rounded">
                  <p className="text-green-400 font-medium">{Math.round(selectedFood.nutrients.carbs * amount / 100 * 10) / 10}g</p>
                  <p className="text-slate-500">carbs</p>
                </div>
                <div className="text-center p-2 bg-[#D9EAFD] rounded">
                  <p className="text-rose-400 font-medium">{Math.round(selectedFood.nutrients.fat * amount / 100 * 10) / 10}g</p>
                  <p className="text-slate-500">fat</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-slate-600">Amount:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-24 px-3 py-2 bg-[#BCCCDC] border border-[#9AA6B2] rounded-lg text-slate-900 text-center focus:outline-none focus:border-[#9AA6B2]"
              />
              <span className="text-sm text-slate-500">grams</span>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedFood(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2]"
              >
                Back to Search
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-900 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2]"
              >
                Add Ingredient
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !loading && (
              <p className="p-4 text-center text-slate-500 text-sm">No results found</p>
            )}
            {results.map((food) => (
              <button
                key={food.fdcId}
                onClick={() => handleSelect(food)}
                className="w-full p-3 text-left hover:bg-[#BCCCDC] border-b border-[#9AA6B2]/50 last:border-0 transition-colors"
              >
                <p className="text-sm text-slate-900 truncate">{food.name}</p>
                <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span>{Math.round(food.nutrients.calories)} kcal</span>
                  <span>{Math.round(food.nutrients.protein)}g P</span>
                  <span>{Math.round(food.nutrients.carbs)}g C</span>
                  <span>{Math.round(food.nutrients.fat)}g F</span>
                  <span className="text-slate-500">per 100g</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// INGREDIENT ROW COMPONENT
// ============================================================================

const IngredientRow = ({ ingredient, index, onAmountChange, onRemove, isEditing }) => {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#9AA6B2]/50 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 truncate">{ingredient.name}</p>
        <div className="flex gap-3 mt-0.5 text-[10px] text-slate-500">
          <span>{ingredient.calories} kcal</span>
          <span>{ingredient.protein}g P</span>
          <span>{ingredient.carbs}g C</span>
          <span>{ingredient.fat}g F</span>
          {ingredient.fiber > 0 && <span>{ingredient.fiber}g fiber</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        {isEditing ? (
          <>
            <input
              type="number"
              value={ingredient.amount}
              onChange={(e) => onAmountChange(index, parseFloat(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-sm text-right bg-[#BCCCDC] border border-[#9AA6B2] rounded text-slate-800 focus:outline-none focus:border-[#9AA6B2]"
            />
            <span className="text-xs text-slate-500 w-6">{ingredient.unit}</span>
            <button
              onClick={() => onRemove(index)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <TrashIcon />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-700 font-medium">{ingredient.amount}</span>
            <span className="text-xs text-slate-500 w-6">{ingredient.unit}</span>
          </>
        )}
      </div>
    </div>
  );
};

const DinnerIngredientRow = ({ ingredient, onChange, onRemove }) => {
  return (
    <div className="grid grid-cols-12 gap-3 items-center py-2 border-b border-[#9AA6B2]/40 last:border-0">
      <div className="col-span-5">
        <input
          type="text"
          value={ingredient.name}
          onChange={(e) => onChange({ ...ingredient, name: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg text-slate-800 focus:outline-none focus:border-[#9AA6B2]"
        />
      </div>
      <div className="col-span-3">
        <input
          type="number"
          value={ingredient.amount || ''}
          onChange={(e) => onChange({ ...ingredient, amount: parseFloat(e.target.value) || 0 })}
          className="w-full px-3 py-2 text-sm bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg text-slate-800 text-right focus:outline-none focus:border-[#9AA6B2]"
        />
      </div>
      <div className="col-span-3">
        <input
          type="text"
          value={ingredient.unit || ''}
          onChange={(e) => onChange({ ...ingredient, unit: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg text-slate-800 focus:outline-none focus:border-[#9AA6B2]"
        />
      </div>
      <div className="col-span-1 flex justify-end">
        <button
          onClick={onRemove}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MEAL CARD COMPONENT
// ============================================================================

const MealCard = ({ title, meal, mealKey, dayKey, onUpdate, isEditing, setIsEditing }) => {
  const [localMeal, setLocalMeal] = useState(meal);
  const [expanded, setExpanded] = useState(false);
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  
  useEffect(() => {
    setLocalMeal(meal);
  }, [meal]);
  
  const handleAmountChange = (ingredientIndex, newAmount) => {
    const originalAmount = meal.ingredients[ingredientIndex].amount;
    const ratio = newAmount / originalAmount;
    
    const updatedIngredients = localMeal.ingredients.map((ing, idx) => {
      if (idx === ingredientIndex) {
        const orig = meal.ingredients[idx];
        return {
          ...ing,
          amount: newAmount,
          calories: Math.round(orig.calories * ratio),
          protein: Math.round(orig.protein * ratio * 10) / 10,
          carbs: Math.round(orig.carbs * ratio * 10) / 10,
          fat: Math.round(orig.fat * ratio * 10) / 10,
          fiber: Math.round((orig.fiber || 0) * ratio * 10) / 10
        };
      }
      return ing;
    });
    setLocalMeal({ ...localMeal, ingredients: updatedIngredients });
  };
  
  const handleRemoveIngredient = (index) => {
    const updatedIngredients = localMeal.ingredients.filter((_, idx) => idx !== index);
    setLocalMeal({ ...localMeal, ingredients: updatedIngredients });
  };
  
  const handleAddIngredient = (ingredient) => {
    setLocalMeal({
      ...localMeal,
      ingredients: [...localMeal.ingredients, ingredient]
    });
    setShowIngredientSearch(false);
  };
  
  const handleSave = () => {
    onUpdate(dayKey, mealKey, localMeal);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setLocalMeal(meal);
    setIsEditing(false);
  };
  
  const totalNutrition = localMeal.ingredients.reduce((acc, ing) => ({
    calories: acc.calories + (ing.calories || 0),
    protein: acc.protein + (ing.protein || 0),
    carbs: acc.carbs + (ing.carbs || 0),
    fat: acc.fat + (ing.fat || 0),
    fiber: acc.fiber + (ing.fiber || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  
  return (
    <>
      <div className="bg-[#D9EAFD] rounded-xl border border-[#9AA6B2]/50 overflow-hidden">
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#BCCCDC]/60 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div>
              <h4 className="font-medium text-slate-800">{title}</h4>
              <p className="text-sm text-slate-600">{localMeal.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{Math.round(totalNutrition.calories)} kcal</p>
              <p className="text-xs text-slate-500">{Math.round(totalNutrition.protein)}g protein</p>
            </div>
            <div className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`}>
              <ChevronRight />
            </div>
          </div>
        </div>
        
        {expanded && (
          <div className="px-4 pb-4 border-t border-[#9AA6B2]/50">
            <div className="flex flex-wrap justify-between items-center py-3 gap-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-[#BCCCDC]/30 text-[#9AA6B2]">{Math.round(totalNutrition.calories)} kcal</span>
                <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400">{Math.round(totalNutrition.protein)}g P</span>
                <span className="px-2 py-1 rounded bg-green-500/10 text-green-400">{Math.round(totalNutrition.carbs)}g C</span>
                <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-400">{Math.round(totalNutrition.fat)}g F</span>
                <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400">{Math.round(totalNutrition.fiber)}g fiber</span>
              </div>
              
              {isEditing ? (
                <div className="flex gap-2">
                  <button 
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2] transition-colors"
                  >
                    <SaveIcon /> Save
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2] transition-colors"
                >
                  <EditIcon /> Edit
                </button>
              )}
            </div>
            
            <div className="space-y-0">
              {localMeal.ingredients.map((ingredient, idx) => (
                <IngredientRow
                  key={idx}
                  ingredient={ingredient}
                  index={idx}
                  isEditing={isEditing}
                  onAmountChange={handleAmountChange}
                  onRemove={handleRemoveIngredient}
                />
              ))}
            </div>
            
            {isEditing && (
              <button
                onClick={() => setShowIngredientSearch(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#9AA6B2] border border-dashed border-[#9AA6B2]/30 rounded-lg hover:bg-[#BCCCDC]/5 transition-colors"
              >
                <PlusIcon /> Add Ingredient from USDA Database
              </button>
            )}
          </div>
        )}
      </div>
      
      {showIngredientSearch && (
        <IngredientSearch
          onSelect={handleAddIngredient}
          onClose={() => setShowIngredientSearch(false)}
        />
      )}
    </>
  );
};

// ============================================================================
// DAY DETAIL MODAL
// ============================================================================

const DayDetail = ({ day, nutrition, customMeals, mealRecipes, goals, onUpdate, onClose }) => {
  const [editingMeal, setEditingMeal] = useState(null);
  
  const dinnerInfo =
    mealRecipes.dinner?.[nutrition.dinnerType] || { name: 'Dinner', color: '#94a3b8', ingredients: [] };
  const dayKey = `day-${day}`;
  const defaultMealKeys = {
    breakfast: getDefaultMealKey('breakfast', day, nutrition.dinnerType),
    lunch: getDefaultMealKey('lunch', day, nutrition.dinnerType),
    dinner: getDefaultMealKey('dinner', day, nutrition.dinnerType),
  };

  const getMeal = (mealType) => {
    const templateKey = defaultMealKeys[mealType];
    const customKey = mealType === 'snacks' ? 'snacks' : `${mealType}-${templateKey}`;
    if (customMeals[dayKey] && customMeals[dayKey][customKey]) {
      return customMeals[dayKey][customKey];
    }
    return mealRecipes[mealType]?.[templateKey] || { name: 'Custom Meal', ingredients: [] };
  };

  const activeGoals = goals || DEFAULT_DIET_GOALS;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50/95 backdrop-blur border-b border-[#9AA6B2]">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: dinnerInfo.color + '30' }}
            >
              <span className="text-lg font-bold" style={{ color: dinnerInfo.color }}>{day}</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Day {day}</h2>
              <p className="text-sm text-slate-600">{dinnerInfo.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#BCCCDC] transition-colors text-slate-600 hover:text-slate-900"
          >
            <XIcon />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          <div className="p-6 border-b border-[#9AA6B2] bg-gradient-to-b from-[#BCCCDC]/60 to-transparent">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Daily Nutrition</h3>
            
            <div className="grid grid-cols-5 gap-4 mb-6">
              <CircularProgress value={nutrition.calories} max={activeGoals.calories.max} color="#f59e0b" label="Calories" unit=" kcal" />
              <CircularProgress value={nutrition.protein} max={activeGoals.protein.max} color="#3b82f6" label="Protein" unit="g" />
              <CircularProgress value={nutrition.carbs} max={activeGoals.carbs.max} color="#22c55e" label="Carbs" unit="g" />
              <CircularProgress value={nutrition.fat} max={activeGoals.fat.max} color="#f43f5e" label="Fat" unit="g" />
              <CircularProgress value={nutrition.fiber} max={activeGoals.fiber.max} color="#8b5cf6" label="Fiber" unit="g" />
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <MicroBar label="Omega-3 ALA" value={nutrition.ala} max={activeGoals.omega3.max} unit="g" color="#06b6d4" />
              <MicroBar label="Omega-3 EPA + DHA" value={nutrition.epa_dha} max={activeGoals.omega3.max} unit="g" color="#0ea5e9" />
              <MicroBar label="Vitamin A" value={nutrition.vitA} max={900} unit=" mcg" color="#f97316" />
              <MicroBar label="Vitamin B12" value={nutrition.b12} max={2.4} unit=" mcg" color="#ec4899" />
              <MicroBar label="Folate" value={nutrition.folate} max={400} unit=" mcg" color="#14b8a6" />
              <MicroBar label="Vitamin C" value={nutrition.vitC} max={90} unit=" mg" color="#eab308" />
              <MicroBar label="Vitamin D" value={nutrition.vitD} max={20} unit=" mcg" color="#a855f7" />
              <MicroBar label="Vitamin K" value={nutrition.vitK} max={120} unit=" mcg" color="#84cc16" />
              <MicroBar label="Calcium" value={nutrition.calcium} max={1000} unit=" mg" color="#f8fafc" />
              <MicroBar label="Magnesium" value={nutrition.magnesium} max={400} unit=" mg" color="#6366f1" />
              <MicroBar label="Potassium" value={nutrition.potassium} max={4700} unit=" mg" color="#0ea5e9" />
              <MicroBar label="Zinc" value={nutrition.zinc} max={11} unit=" mg" color="#d946ef" />
              <MicroBar label="Iron" value={nutrition.iron} max={18} unit=" mg" color="#ef4444" />
            </div>

            {/* Omega-3 ratio display */}
            <div className="mt-4 text-xs text-slate-600">
              {(() => {
                const ala = nutrition.ala || 0;
                const epaDha = nutrition.epa_dha || 0;
                const total = ala + epaDha;
                if (!total) return <span>Omega-3 ratio (ALA : EPA/DHA):    </span>;

                const alaRatio = Math.round((ala / total) * 10) / 10;
                const epaDhaRatio = Math.round((epaDha / total) * 10) / 10;
                return (
                  <span>
                    Omega-3 ratio (ALA : EPA/DHA): {alaRatio} : {epaDhaRatio}
                  </span>
                );
              })()}
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Meals & Ingredients</h3>
            
            <MealCard 
              title="Breakfast"
              meal={getMeal('breakfast')}
              mealKey={`breakfast-${defaultMealKeys.breakfast}`}
              dayKey={dayKey}
              onUpdate={onUpdate}
              isEditing={editingMeal === 'breakfast'}
              setIsEditing={(v) => setEditingMeal(v ? 'breakfast' : null)}
            />
            
            <MealCard 
              title="Lunch"
              meal={getMeal('lunch')}
              mealKey={`lunch-${defaultMealKeys.lunch}`}
              dayKey={dayKey}
              onUpdate={onUpdate}
              isEditing={editingMeal === 'lunch'}
              setIsEditing={(v) => setEditingMeal(v ? 'lunch' : null)}
            />
            
            <MealCard 
              title="Dinner"
              meal={getMeal('dinner')}
              mealKey={`dinner-${nutrition.dinnerType}`}
              dayKey={dayKey}
              onUpdate={onUpdate}
              isEditing={editingMeal === 'dinner'}
              setIsEditing={(v) => setEditingMeal(v ? 'dinner' : null)}
            />
            
            <MealCard 
              title="Snacks"
              meal={getMeal('snacks')}
              mealKey="snacks"
              dayKey={dayKey}
              onUpdate={onUpdate}
              isEditing={editingMeal === 'snacks'}
              setIsEditing={(v) => setEditingMeal(v ? 'snacks' : null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CALENDAR DAY CELL
// ============================================================================

const CalendarDay = ({ day, nutrition, dinnerInfo, hasCustomization, onClick }) => {
  const info = dinnerInfo || { name: 'Dinner', color: '#94a3b8' };
  
  return (
    <div 
      onClick={onClick}
      className="group relative aspect-square p-2 sm:p-3 rounded-xl border border-[#9AA6B2]/50 bg-[#D9EAFD]/70 hover:bg-[#BCCCDC]/70 hover:border-[#9AA6B2] cursor-pointer transition-all duration-200"
    >
      {hasCustomization && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#BCCCDC]" />
      )}
      
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Day</span>
          <span className="text-lg font-semibold text-slate-900">{day}</span>
        </div>
        
        <div 
          className="flex-1 flex items-center justify-center rounded-lg"
          style={{ backgroundColor: info.color + '20' }}
        >
          <span className="text-xs font-medium px-2 text-center" style={{ color: info.color }}>
            {info.name.split(' ')[0]}
          </span>
        </div>
        
        <div className="mt-2 hidden sm:block">
          <p className="text-xs font-medium text-slate-700">{nutrition.calories} kcal</p>
          <p className="text-[10px] text-slate-500">{nutrition.protein}g protein</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// METHODOLOGY PANEL
// ============================================================================

const MethodologyPanel = ({ isOpen, onClose, goals }) => {
  if (!isOpen) return null;
  const activeGoals = goals || DEFAULT_DIET_GOALS;
  const goalList = [
    { key: 'calories', label: 'Calories' },
    { key: 'protein', label: 'Protein' },
    { key: 'fiber', label: 'Fiber' },
    { key: 'omega3', label: 'Omega-3' },
  ];
  const formatGoal = (goal) =>
    goal ? `${goal.min ?? 0}–${goal.max ?? 0} ${goal.unit || ''}` : '';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50 border-b border-[#9AA6B2]">
          <h2 className="text-xl font-semibold text-slate-900">Methodology</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#BCCCDC] text-slate-600 hover:text-slate-900">
            <XIcon />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)] space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Core Goals</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2"><CheckIcon /><span>Rebuild and restore gut health</span></li>
              <li className="flex items-start gap-2"><CheckIcon /><span>Reset baseline nutritional needs</span></li>
              <li className="flex items-start gap-2"><CheckIcon /><span>Reduce systemic inflammation</span></li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Daily Macros</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#D9EAFD] border border-[#9AA6B2]">
                <p className="text-blue-400 font-medium">Protein</p>
                <p className="text-slate-600 text-xs">20–25% (~90–100g)</p>
              </div>
              <div className="p-3 rounded-lg bg-[#D9EAFD] border border-[#9AA6B2]">
                <p className="text-rose-400 font-medium">Fat</p>
                <p className="text-slate-600 text-xs">35–45% (high quality)</p>
              </div>
              <div className="p-3 rounded-lg bg-[#D9EAFD] border border-[#9AA6B2]">
                <p className="text-green-400 font-medium">Carbs</p>
                <p className="text-slate-600 text-xs">30–40% (high fiber)</p>
              </div>
            </div>
          </section>
          
          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Key Principles</h3>
            <div className="space-y-3">
              <p><strong className="text-slate-900">High Fiber (40–60g):</strong> Feeds beneficial gut bacteria, produces SCFAs for gut barrier integrity and anti-inflammatory effects.</p>
              <p><strong className="text-slate-900">Omega-3 Rich (2–3g EPA/DHA):</strong> Anti-inflammatory, supports microbiome diversity, enhances mood.</p>
              <p><strong className="text-slate-900">Fermented Foods (2–3/day):</strong> Yogurt, kefir, kimchi, sauerkraut, miso, natto increase microbiome diversity.</p>
              <p><strong className="text-slate-900">Quality Fats:</strong> Olive oil, dairy fat, animal fat from good sources. Reduce overall saturated fat intake.</p>
              <p><strong className="text-slate-900">Collagen Sources:</strong> Supports gut lining and joint health via bone broth, skin-on fish, collagen peptides.</p>
            </div>
          </section>
          
          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Daily Targets</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {goalList.map((goal) => (
                <div key={goal.key} className="flex justify-between p-2 rounded bg-[#D9EAFD]">
                  <span>{goal.label}</span>
                  <span className="text-slate-600">{formatGoal(activeGoals[goal.key])}</span>
                </div>
              ))}
              <div className="flex justify-between p-2 rounded bg-[#D9EAFD]"><span>Fermented</span><span className="text-slate-600">2–3 servings</span></div>
              <div className="flex justify-between p-2 rounded bg-[#D9EAFD]"><span>Collagen</span><span className="text-slate-600">1–2 sources</span></div>
            </div>
          </section>

          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Underlying Science</h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9040132" className="text-[#9AA6B2] hover:underline" target="_blank" rel="noreferrer">
                  Gut microbiota modulation in metabolic health (PMC9040132)
                </a>
              </li>
              <li>
                <a href="https://onlinelibrary.wiley.com/doi/10.1111/jgh.16619" className="text-[#9AA6B2] hover:underline" target="_blank" rel="noreferrer">
                  Nutritional interventions for liver-gut axis (JGH.16619)
                </a>
              </li>
              <li>
                <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9268559" className="text-[#9AA6B2] hover:underline" target="_blank" rel="noreferrer">
                  Dietary fiber’s role in inflammation control (PMC9268559)
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

const GoalSettingsPanel = ({ isOpen, goals, onSave, onClose }) => {
  const [localGoals, setLocalGoals] = useState(goals || DEFAULT_DIET_GOALS);

  useEffect(() => {
    setLocalGoals(goals || DEFAULT_DIET_GOALS);
  }, [goals, isOpen]);

  if (!isOpen) return null;

  const fields = [
    { key: 'calories', label: 'Calories (kcal)' },
    { key: 'protein', label: 'Protein (g)' },
    { key: 'carbs', label: 'Carbs (g)' },
    { key: 'fat', label: 'Fat (g)' },
    { key: 'fiber', label: 'Fiber (g)' },
    { key: 'omega3', label: 'Omega-3 (g)' },
  ];

  const handleChange = (key, bound, value) => {
    setLocalGoals((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [bound]: Number(value),
      },
    }));
  };

  const handleSubmit = () => {
    onSave(localGoals);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
        <div className="flex items-center justify-between p-6 border-b border-[#9AA6B2]">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Daily Targets</h2>
            <p className="text-sm text-slate-600">Adjust your calorie and macro goals.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#BCCCDC] text-slate-600">
            <XIcon />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {fields.map((field) => (
            <div key={field.key} className="p-4 rounded-xl bg-[#D9EAFD]/80 border border-[#9AA6B2]/50">
              <p className="text-sm font-medium text-slate-800 mb-2">{field.label}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Minimum
                  </label>
                  <input
                    type="number"
                    value={localGoals[field.key]?.min ?? 0}
                    onChange={(e) => handleChange(field.key, 'min', e.target.value)}
                    className="w-full px-3 py-2 bg-[#BCCCDC] border border-[#9AA6B2] rounded-lg text-slate-900 focus:outline-none focus:border-[#9AA6B2]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                    Maximum
                  </label>
                  <input
                    type="number"
                    value={localGoals[field.key]?.max ?? 0}
                    onChange={(e) => handleChange(field.key, 'max', e.target.value)}
                    className="w-full px-3 py-2 bg-[#BCCCDC] border border-[#9AA6B2] rounded-lg text-slate-900 focus:outline-none focus:border-[#9AA6B2]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-[#9AA6B2] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2] transition-colors"
          >
            <SaveIcon /> Save Targets
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// RECIPES PANEL
// ============================================================================

const RecipesPanel = ({ isOpen, onClose, mealRecipes, onAddRecipe, onEditRecipe }) => {
  if (!isOpen) return null;

  const sections = [
    { key: 'breakfast', title: 'Breakfast', canAdd: true },
    { key: 'lunch', title: 'Lunch', canAdd: true },
    { key: 'snacks', title: 'Snacks', canAdd: false },
    { key: 'dinner', title: 'Dinner', canAdd: true },
  ];

  const formatAmount = (ingredient) => {
    if (!ingredient.amount) return ingredient.unit || '';
    return `${ingredient.amount}${ingredient.unit ? ` ${ingredient.unit}` : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50 border-b border-[#9AA6B2]">
          <h2 className="text-xl font-semibold text-slate-900">All Recipes</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#BCCCDC] text-slate-600 hover:text-slate-900">
            <XIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)] space-y-8 text-sm text-slate-700 leading-relaxed">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#9AA6B2] font-medium">{section.title}</h3>
                {section.canAdd && (
                  <button
                    onClick={() => onAddRecipe(section.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9AA6B2] border border-[#9AA6B2]/40 rounded-lg hover:bg-[#BCCCDC]/30 transition-colors"
                  >
                    <PlusIcon /> Add {section.title} Recipe
                  </button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(mealRecipes[section.key] || {}).map(([mealKey, meal]) => (
                  <div key={`${section.key}-${mealKey}`} className="p-4 rounded-xl bg-[#D9EAFD]/80 border border-[#9AA6B2]/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{meal.name}</p>
                        <p className="text-xs font-mono text-slate-500 mt-1">Key: {mealKey}</p>
                      </div>
                      <button
                        onClick={() => onEditRecipe(section.key, mealKey)}
                        className="px-2 py-1 text-xs font-medium text-slate-700 bg-[#BCCCDC] rounded hover:bg-[#9AA6B2] transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                      {(meal.ingredients || []).map((ingredient, index) => (
                        <li key={`${mealKey}-${index}`} className="flex justify-between gap-2">
                          <span className="text-slate-800">{ingredient.name}</span>
                          <span className="text-slate-500">{formatAmount(ingredient)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

const RecipeEditor = ({
  isOpen,
  mealType,
  mode,
  initialCode,
  recipe,
  existingCodes,
  canDelete,
  onSave,
  onDelete,
  onClose,
}) => {
  const [code, setCode] = useState(initialCode || '');
  const [localRecipe, setLocalRecipe] = useState(
    recipe || { name: '', color: '#f97316', ingredients: [] }
  );
  const [error, setError] = useState('');
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);

  useEffect(() => {
    setCode(initialCode || '');
    setLocalRecipe(recipe || { name: '', color: '#f97316', ingredients: [] });
    setError('');
    setShowIngredientSearch(false);
  }, [initialCode, recipe, isOpen]);

  if (!isOpen) return null;

  const mealTitleMap = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snacks: 'Snack',
  };
  const mealTitle = mealTitleMap[mealType] || 'Meal';

  const normalizeCode = (value) => {
    if (mealType === 'dinner') {
      return value.trim().toUpperCase();
    }
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
  };

  const handleIngredientChange = (index, updated) => {
    setLocalRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, idx) => (idx === index ? updated : ing)),
    }));
  };

  const handleRemoveIngredient = (index) => {
    setLocalRecipe((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index),
    }));
  };

  const handleAddBlankIngredient = () => {
    setLocalRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: 0, unit: 'g' }],
    }));
  };

  const handleAddIngredientFromSearch = (ingredient) => {
    setLocalRecipe((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient],
    }));
    setShowIngredientSearch(false);
  };

  const handleSave = () => {
    const normalizedCode = mode === 'create' ? normalizeCode(code) : initialCode;
    if (!normalizedCode) {
      setError('Recipe key is required.');
      return;
    }
    if (mode === 'create' && existingCodes.includes(normalizedCode)) {
      setError('This recipe key already exists.');
      return;
    }
    if (!localRecipe.name.trim()) {
      setError('Please provide a recipe name.');
      return;
    }

    onSave(normalizedCode, {
      ...localRecipe,
      name: localRecipe.name.trim(),
      color: localRecipe.color || '#f97316',
      ingredients: localRecipe.ingredients.map((ingredient) => ({ ...ingredient })),
    });
  };

  const handleDelete = () => {
    if (!canDelete || !initialCode) return;
    onDelete(initialCode);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-slate-50 rounded-2xl border border-[#9AA6B2] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#9AA6B2]">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {mode === 'create' ? `Add ${mealTitle} Recipe` : `Edit ${mealTitle} Recipe`}
            </h3>
            <p className="text-sm text-slate-500">
              Define reusable {mealTitle.toLowerCase()} templates for the calendar.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#BCCCDC] text-slate-600">
            <XIcon />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
                Recipe Key
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={mealType === 'dinner' ? 4 : 24}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg text-slate-900 focus:outline-none focus:border-[#9AA6B2] disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
                Recipe Name
              </label>
              <input
                type="text"
                value={localRecipe.name}
                onChange={(e) => setLocalRecipe({ ...localRecipe, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg text-slate-900 focus:outline-none focus:border-[#9AA6B2]"
              />
            </div>
            {mealType === 'dinner' && (
              <div className="md:col-span-1">
                <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={localRecipe.color || '#f97316'}
                    onChange={(e) => setLocalRecipe({ ...localRecipe, color: e.target.value })}
                    className="w-12 h-10 rounded border border-[#9AA6B2] bg-[#D9EAFD]"
                  />
                  <input
                    type="text"
                    value={localRecipe.color || ''}
                    onChange={(e) => setLocalRecipe({ ...localRecipe, color: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg text-slate-900 focus:outline-none focus:border-[#9AA6B2]"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Ingredients</p>
              <div className="flex gap-2">
                <button
                  onClick={handleAddBlankIngredient}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2] transition-colors"
                >
                  Add Empty Row
                </button>
                <button
                  onClick={() => setShowIngredientSearch(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9AA6B2] border border-[#9AA6B2]/40 rounded-lg hover:bg-[#BCCCDC]/30 transition-colors"
                >
                  <PlusIcon /> USDA Ingredient
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-[#9AA6B2] divide-y divide-[#9AA6B2]/50">
              {localRecipe.ingredients.length === 0 && (
                <p className="p-4 text-center text-sm text-slate-500">
                  No ingredients yet. Add from the USDA database or create manual rows.
                </p>
              )}
              {localRecipe.ingredients.map((ingredient, index) => (
                <DinnerIngredientRow
                  key={`${ingredient.name}-${index}`}
                  ingredient={ingredient}
                  onChange={(updated) => handleIngredientChange(index, updated)}
                  onRemove={() => handleRemoveIngredient(index)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#9AA6B2] flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2] transition-colors"
          >
            <SaveIcon /> Save Recipe
          </button>
        </div>
      </div>

      {showIngredientSearch && (
        <IngredientSearch
          onSelect={handleAddIngredientFromSearch}
          onClose={() => setShowIngredientSearch(false)}
        />
      )}
    </div>
  );
};

// ============================================================================
// AUTH COMPONENT
// ============================================================================

const AuthButton = ({ user, onSignIn, onSignOut }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  if (!user) {
    return (
      <button
        onClick={onSignIn}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-[#BCCCDC] rounded-lg hover:bg-[#9AA6B2] transition-colors border border-[#9AA6B2]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#BCCCDC] transition-colors"
      >
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#9AA6B2] flex items-center justify-center text-slate-900 font-medium">
            {user.email?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="text-sm text-slate-700 hidden sm:block">{user.user_metadata?.full_name || user.email}</span>
      </button>
      
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-[#D9EAFD] border border-[#9AA6B2] rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-[#9AA6B2]">
              <p className="text-sm font-medium text-slate-900 truncate">{user.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { setShowMenu(false); onSignOut(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-[#BCCCDC] transition-colors"
            >
              <LogOutIcon /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// WEEK NAVIGATION
// ============================================================================

const WeekNav = ({ currentWeek, onWeekChange }) => {
  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
        disabled={currentWeek === 1}
        className="p-2 rounded-lg bg-[#BCCCDC]/70 hover:bg-[#9AA6B2]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
      >
        <ChevronLeft />
      </button>
      
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((week) => (
          <button
            key={week}
            onClick={() => onWeekChange(week)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
              currentWeek === week 
                ? 'bg-[#9AA6B2] text-slate-900' 
                : 'bg-[#BCCCDC]/70 text-slate-600 hover:bg-[#9AA6B2]/50 hover:text-slate-800'
            }`}
          >
            {week}
          </button>
        ))}
      </div>
      
      <button 
        onClick={() => onWeekChange(Math.min(5, currentWeek + 1))}
        disabled={currentWeek === 5}
        className="p-2 rounded-lg bg-[#BCCCDC]/70 hover:bg-[#9AA6B2]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-700"
      >
        <ChevronRight />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function JanuaryMealsPage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(null);
  const [customMeals, setCustomMeals] = useState({});
  const [showMethodology, setShowMethodology] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [mealRecipes, setMealRecipes] = useState(() => cloneMealRecipes(BASE_MEALS));
  const [activeRecipeEditor, setActiveRecipeEditor] = useState(null);
  const [dietGoals, setDietGoals] = useState(DEFAULT_DIET_GOALS);
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseStorageAvailable, setSupabaseStorageAvailable] = useState(
    SUPABASE_MEAL_SYNC_ENABLED && !!supabase
  );
  const isAdmin = user?.email === 'dataweston@gmail.com';
  const [enrichmentProgress, setEnrichmentProgress] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  
  // Enrich ingredients with USDA data on mount
  useEffect(() => {
    if (!isUsdaConfigured || isEnriching) return;
    
    const enrichData = async () => {
      setIsEnriching(true);
      try {
        const enriched = await enrichMealRecipes(mealRecipes, (current, total) => {
          setEnrichmentProgress({ current, total });
        });
        setMealRecipes(enriched);
        setEnrichmentProgress(null);
      } catch (error) {
        console.error('Error enriching ingredients:', error);
        setEnrichmentProgress(null);
      } finally {
        setIsEnriching(false);
      }
    };
    
    enrichData();
  }, []); // Only run once on mount
  
  // Check auth state on mount
  useEffect(() => {
    if (!supabase || !supabaseStorageAvailable) {
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user || null);

        if (session?.user) {
          await loadUserData(session.user.id);
        }
      } catch (error) {
        console.log('Auth check failed, using local storage');
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        await loadUserData(session.user.id);
      }
    });

    return () => subscription?.unsubscribe();
  }, [supabaseStorageAvailable]);
  
  // Load from localStorage as fallback
  useEffect(() => {
    if (typeof window === 'undefined' || user) return;

    try {
      const saved = localStorage.getItem('january-meal-plan');
      if (saved) {
        setCustomMeals(JSON.parse(saved));
      }
    } catch (e) {
      console.log('No local data found');
    }
  }, [user]);
  
  const loadUserData = async (userId) => {
    if (!supabase || !supabaseStorageAvailable) return;
    try {
      const { data, error, status } = await supabase
        .from('meal_customizations')
        .select('data')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (
          status === 404 ||
          error?.code === 'PGRST116' ||
          (error?.message || '').toLowerCase().includes('does not exist')
        ) {
          console.warn('Disabling Supabase sync: meal_customizations table unavailable. Falling back to local storage.');
          setSupabaseStorageAvailable(false);
        } else {
          console.log('Failed to load user data');
        }
        return;
      }

      if (data) {
        setCustomMeals(data.data || {});
      }
    } catch (error) {
      console.log('Failed to load user data');
    }
  };
  
  const saveToSupabase = async (data) => {
    if (!user || !supabase || !supabaseStorageAvailable) return false;

    try {
      const { error, status } = await supabase
        .from('meal_customizations')
        .upsert({
          user_id: user.id,
          data: data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        if (
          status === 404 ||
          error?.code === 'PGRST116' ||
          (error?.message || '').toLowerCase().includes('does not exist')
        ) {
          console.warn('Disabling Supabase sync: meal_customizations table unavailable. Falling back to local storage.');
          setSupabaseStorageAvailable(false);
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  };

  // Load meal recipes from localStorage or global admin defaults
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedRecipes = localStorage.getItem(MEAL_RECIPES_STORAGE_KEY);
      if (storedRecipes) {
        const parsed = JSON.parse(storedRecipes);
        setMealRecipes(mergeMealRecipesWithDefaults(parsed));
      }
    } catch (error) {
      console.error('Failed to load saved recipes', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedGoals = localStorage.getItem(GOALS_STORAGE_KEY);
      if (storedGoals) {
        setDietGoals(JSON.parse(storedGoals));
      }
    } catch (error) {
      console.error('Failed to load goals', error);
    }
  }, []);

  const persistMealRecipes = useCallback((updater) => {
    setMealRecipes((prev) => {
      const base = typeof updater === 'function' ? updater(prev) : updater;
      const next = cloneMealRecipes(base);

      // Only persist recipe changes for admin as global defaults.
      if (typeof window !== 'undefined' && isAdmin) {
        try {
          localStorage.setItem(MEAL_RECIPES_STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
          console.error('Failed to save recipes', error);
        }
      }
      return next;
    });
  }, [isAdmin]);

  const handleSaveMealTemplate = useCallback(
    (mealType, code, recipe) => {
      persistMealRecipes((prev) => ({
        ...prev,
        [mealType]: {
          ...(prev[mealType] || {}),
          [code]: {
            ...recipe,
            ingredients: (recipe.ingredients || []).map((ingredient) => ({ ...ingredient })),
          },
        },
      }));
      setActiveRecipeEditor(null);
    },
    [persistMealRecipes]
  );

  const handleDeleteMealTemplate = useCallback(
    (mealType, code) => {
      persistMealRecipes((prev) => {
        const next = { ...prev, [mealType]: { ...(prev[mealType] || {}) } };
        delete next[mealType][code];
        return next;
      });
      setActiveRecipeEditor(null);
    },
    [persistMealRecipes]
  );

  const handleSaveGoals = useCallback((nextGoals) => {
    const normalized = Object.fromEntries(
      Object.entries(nextGoals || {}).map(([key, goal]) => [key, { ...goal }])
    );
    setDietGoals(normalized);
    // Only admin goal changes should become global defaults.
    if (typeof window !== 'undefined' && isAdmin) {
      try {
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(normalized));
      } catch (error) {
        console.error('Failed to save goals', error);
      }
    }
    setShowGoalSettings(false);
  }, []);
  
  const dailyNutrition = useMemo(
    () => buildPlanNutrition(mealRecipes, customMeals),
    [mealRecipes, customMeals]
  );

  const nutritionByDay = useMemo(() => {
    const map = {};
    dailyNutrition.forEach((entry) => {
      map[entry.day] = entry;
    });
    return map;
  }, [dailyNutrition]);

  const handleExportCsv = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const csvText = buildNutritionCsv(dailyNutrition, mealRecipes);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'january-meal-plan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [dailyNutrition, mealRecipes]);

  const handleOpenInGoogleSheets = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const excelXml = buildExcelXml(dailyNutrition, mealRecipes, customMeals);
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'january-meal-plan.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    window.open('https://docs.google.com/spreadsheets/u/0/create?usp=sheets_home', '_blank');
  }, [dailyNutrition, mealRecipes, customMeals]);
  
  const handleUpdateMeal = useCallback(async (dayKey, mealKey, mealData) => {
    const updated = {
      ...customMeals,
      [dayKey]: {
        ...(customMeals[dayKey] || {}),
        [mealKey]: mealData
      }
    };
    
    setCustomMeals(updated);

    // For logged-in users, persist per-user customizations to Supabase.
    if (user && supabaseStorageAvailable) {
      setSaveStatus('saving');
      const success = await saveToSupabase(updated);
      setSaveStatus(success ? 'saved' : 'error');
    }
    
    setTimeout(() => setSaveStatus(null), 2000);
  }, [customMeals, user]);
  
  const handleSignIn = async () => {
    if (!supabase || !supabaseStorageAvailable) return;
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };
  
  const handleSignOut = async () => {
    if (!supabase || !supabaseStorageAvailable) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };
  
  const getWeekDays = () => {
    const start = (currentWeek - 1) * 7 + 1;
    const end = Math.min(start + 6, 30);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };
  
  const weekDays = getWeekDays();
  const selectedNutrition = selectedDay ? nutritionByDay[selectedDay] : null;
  
  const weeklyAvg = weekDays.reduce(
    (acc, day) => {
      const n = nutritionByDay[day];
      if (n) {
        acc.calories += n.calories;
        acc.protein += n.protein;
        acc.fiber += n.fiber;
        acc.count += 1;
      }
      return acc;
    },
    { calories: 0, protein: 0, fiber: 0, count: 0 }
  );
  const avgCalories = weeklyAvg.count ? Math.round(weeklyAvg.calories / weeklyAvg.count) : 0;
  const avgProtein = weeklyAvg.count ? Math.round(weeklyAvg.protein / weeklyAvg.count) : 0;
  const avgFiber = weeklyAvg.count ? Math.round(weeklyAvg.fiber / weeklyAvg.count) : 0;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-[#9AA6B2]"><LoaderIcon /></div>
      </div>
    );
  }
  
  if (enrichmentProgress) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#9AA6B2] mb-4"><LoaderIcon /></div>
          <p className="text-slate-700 font-medium">Enriching ingredients with USDA nutrition data...</p>
          <p className="text-sm text-slate-500 mt-2">
            {enrichmentProgress.current} of {enrichmentProgress.total} ingredients
          </p>
          <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 mx-auto overflow-hidden">
            <div 
              className="h-full bg-[#9AA6B2] transition-all duration-300"
              style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: THEME.background, color: THEME.text }}
    >
      <div
        className="fixed inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(154, 166, 178, 0.15) 0%, transparent 55%),
                            radial-gradient(circle at 80% 20%, rgba(188, 204, 220, 0.2) 0%, transparent 45%)`,
        }}
      />
      
      <div className="relative max-w-6xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <a href="/" className="text-[#9AA6B2] hover:underline">
            Home
          </a>
          <span>/</span>
          <span className="text-slate-700">January Meal Plan</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
              <span className="text-[#9AA6B2]">January</span> Meal Plan
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              30-day anti-inflammatory protocol • High fiber • Fermented foods
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Methodology', icon: <InfoIcon />, action: () => setShowMethodology(true) },
              { label: 'Targets', icon: <TargetIcon />, action: () => setShowGoalSettings(true) },
              { label: 'View recipes', icon: <BookIcon />, action: () => setShowRecipes(true) },
              { label: 'Open in Sheets', icon: <SheetsIcon />, action: handleOpenInGoogleSheets },
              { label: 'Export CSV', icon: <DownloadIcon />, action: handleExportCsv },
            ].map((button) => (
              <button
                key={button.label}
                onClick={button.action}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 rounded-lg border transition-colors hover:bg-[#BCCCDC]"
                style={{
                  backgroundColor: THEME.panel,
                  borderColor: THEME.accent,
                }}
              >
                {button.icon} {button.label}
              </button>
            ))}

            {saveStatus && (
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${
                  saveStatus === 'saving'
                    ? 'text-[#9AA6B2] bg-[#BCCCDC]/30'
                    : saveStatus === 'saved'
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-red-400 bg-red-500/10'
                }`}
              >
                {saveStatus === 'saving' ? <LoaderIcon /> : <CheckIcon />}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
              </span>
            )}

            <AuthButton user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
          </div>
        </div>
        
        <div className="mb-6 p-4 rounded-xl bg-[#D9EAFD]/80 border border-[#9AA6B2]/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Week {currentWeek} Avg</p>
                <p className="text-lg font-semibold text-[#9AA6B2]">{avgCalories} <span className="text-sm font-normal text-slate-500">kcal/day</span></p>
              </div>
              <div className="w-px h-8 bg-[#BCCCDC]" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Protein</p>
                <p className="text-lg font-semibold text-blue-400">{avgProtein}g</p>
              </div>
              <div className="w-px h-8 bg-[#BCCCDC]" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Fiber</p>
                <p className="text-lg font-semibold text-purple-400">{avgFiber}g</p>
              </div>
            </div>
            
            <WeekNav currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
          
          {weekDays.map(day => {
            const nutrition = nutritionByDay[day];
            if (!nutrition) return <div key={day} />;
            
            return (
              <CalendarDay
                key={day}
                day={day}
                nutrition={nutrition}
                dinnerInfo={mealRecipes.dinner?.[nutrition.dinnerType]}
                hasCustomization={!!customMeals[`day-${day}`]}
                onClick={() => setSelectedDay(day)}
              />
            );
          })}
        </div>
        
        <div className="mt-8 p-4 rounded-xl bg-[#D9EAFD]/70 border border-[#9AA6B2]/30">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Dinner Rotation</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mealRecipes.dinner || {}).map(([code, info]) => (
              <div 
                key={code} 
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ backgroundColor: info.color + '20', color: info.color }}
              >
                {info.name}
              </div>
            ))}
          </div>
        </div>
        
      </div>
      
      {selectedDay && selectedNutrition && (
        <DayDetail
          day={selectedDay}
          nutrition={selectedNutrition}
          customMeals={customMeals}
          mealRecipes={mealRecipes}
          goals={dietGoals}
          onUpdate={handleUpdateMeal}
          onClose={() => setSelectedDay(null)}
        />
      )}
    
      <RecipesPanel
        isOpen={showRecipes}
        onClose={() => setShowRecipes(false)}
        mealRecipes={mealRecipes}
        onAddRecipe={(mealType) => setActiveRecipeEditor({ mealType, mode: 'create' })}
        onEditRecipe={(mealType, code) => setActiveRecipeEditor({ mealType, mode: 'edit', code })}
      />
      <RecipeEditor
        isOpen={!!activeRecipeEditor}
        mealType={activeRecipeEditor?.mealType || 'dinner'}
        mode={activeRecipeEditor?.mode || 'edit'}
        initialCode={activeRecipeEditor?.code || ''}
        recipe={
          activeRecipeEditor?.mode === 'edit' &&
          activeRecipeEditor?.code &&
          activeRecipeEditor?.mealType
            ? mealRecipes[activeRecipeEditor.mealType]?.[activeRecipeEditor.code]
            : { name: '', color: '#f97316', ingredients: [] }
        }
        existingCodes={Object.keys(mealRecipes[activeRecipeEditor?.mealType || 'dinner'] || {})}
        canDelete={
          activeRecipeEditor?.mode === 'edit' &&
          activeRecipeEditor.code &&
          activeRecipeEditor.mealType &&
          !BASE_MEALS[activeRecipeEditor.mealType]?.[activeRecipeEditor.code]
        }
        onSave={(code, recipe) => handleSaveMealTemplate(activeRecipeEditor?.mealType || 'dinner', code, recipe)}
        onDelete={(code) =>
          handleDeleteMealTemplate(activeRecipeEditor?.mealType || 'dinner', code)
        }
        onClose={() => setActiveRecipeEditor(null)}
      />
      <MethodologyPanel
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        goals={dietGoals}
      />
      <GoalSettingsPanel
        isOpen={showGoalSettings}
        goals={dietGoals}
        onSave={handleSaveGoals}
        onClose={() => setShowGoalSettings(false)}
      />
    </div>
  );
}
