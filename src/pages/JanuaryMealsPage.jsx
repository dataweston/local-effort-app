import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

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
// DATA: Complete meal plan with recipes, ingredients, and nutrition
// ============================================================================

const DIET_GOALS = {
  calories: { min: 1500, max: 1800, label: 'Calories', unit: 'kcal' },
  protein: { min: 90, max: 100, label: 'Protein', unit: 'g' },
  carbs: { min: 140, max: 170, label: 'Carbs', unit: 'g' },
  fat: { min: 65, max: 75, label: 'Fat', unit: 'g' },
  fiber: { min: 40, max: 60, label: 'Fiber', unit: 'g' },
  omega3: { min: 2, max: 3, label: 'Omega-3', unit: 'g' }
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
  { key: 'vitC', label: 'Vitamin C (mg)' },
  { key: 'vitD', label: 'Vitamin D (mcg)' },
  { key: 'vitK', label: 'Vitamin K (mcg)' },
  { key: 'calcium', label: 'Calcium (mg)' },
  { key: 'magnesium', label: 'Magnesium (mg)' },
  { key: 'potassium', label: 'Potassium (mg)' },
  { key: 'zinc', label: 'Zinc (mg)' },
  { key: 'iron', label: 'Iron (mg)' },
];

const buildNutritionCsv = (dinnerMap) => {
  const rows = DAILY_NUTRITION.map((entry) =>
    NUTRITION_CSV_FIELDS.map((field) => {
      if (field.key === 'dinnerName') {
        return dinnerMap?.[entry.dinnerType]?.name || '';
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

const buildExcelXml = (dinnerMap) => {
  const rows = DAILY_NUTRITION.map((entry) =>
    NUTRITION_CSV_FIELDS.map((field) => {
      if (field.key === 'dinnerName') {
        return dinnerMap?.[entry.dinnerType]?.name || '';
      }
      return entry[field.key] ?? '';
    })
  );

  const headerRow = `<Row>${NUTRITION_CSV_FIELDS.map(
    (field) => `<Cell><Data ss:Type="String">${escapeXml(field.label)}</Data></Cell>`
  ).join('')}</Row>`;

  const bodyRows = rows
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

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="January Meals">
    <Table>
      ${headerRow}
      ${bodyRows}
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

const DINNER_STORAGE_KEY = 'january-meal-plan-dinners';

const cloneDinnerRecipes = (recipes) =>
  Object.fromEntries(
    Object.entries(recipes).map(([code, recipe]) => [
      code,
      {
        ...recipe,
        ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
      },
    ])
  );

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

// Daily nutritional data from spreadsheet (extended to 30 days)
const DAILY_NUTRITION = [
  { day: 1, dinnerType: 'KB', calories: 1650, protein: 98, carbs: 185, fat: 58, fiber: 44, ala: 3.1, epa_dha: 1.8, vitA: 1040, b12: 7.1, folate: 520, vitC: 132, vitD: 16, vitK: 290, calcium: 630, magnesium: 330, potassium: 3290, zinc: 12.0, iron: 12.3 },
  { day: 2, dinnerType: 'PB', calories: 1750, protein: 96, carbs: 185, fat: 72, fiber: 38, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.0, folate: 480, vitC: 90, vitD: 16, vitK: 240, calcium: 600, magnesium: 300, potassium: 3000, zinc: 14.0, iron: 11.5 },
  { day: 3, dinnerType: 'BY', calories: 1620, protein: 94, carbs: 192, fat: 52, fiber: 43, ala: 2.8, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 580, vitC: 150, vitD: 15, vitK: 260, calcium: 610, magnesium: 320, potassium: 3530, zinc: 11.2, iron: 11.0 },
  { day: 4, dinnerType: 'BS', calories: 1760, protein: 101, carbs: 180, fat: 70, fiber: 37, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.5, folate: 480, vitC: 82, vitD: 15, vitK: 210, calcium: 610, magnesium: 310, potassium: 3150, zinc: 14.0, iron: 14.1 },
  { day: 5, dinnerType: 'CC', calories: 1670, protein: 97, carbs: 190, fat: 59, fiber: 48, ala: 3.2, epa_dha: 1.8, vitA: 950, b12: 7.0, folate: 600, vitC: 130, vitD: 16, vitK: 430, calcium: 620, magnesium: 360, potassium: 3400, zinc: 12.0, iron: 12.0 },
  { day: 6, dinnerType: 'SP', calories: 1680, protein: 95, carbs: 205, fat: 55, fiber: 52, ala: 3.3, epa_dha: 1.8, vitA: 1800, b12: 7.0, folate: 580, vitC: 130, vitD: 16, vitK: 260, calcium: 620, magnesium: 390, potassium: 3710, zinc: 11.5, iron: 12.0 },
  { day: 7, dinnerType: 'MC', calories: 1640, protein: 92, carbs: 183, fat: 58, fiber: 46, ala: 3.0, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 520, vitC: 120, vitD: 16, vitK: 420, calcium: 690, magnesium: 330, potassium: 3180, zinc: 11.0, iron: 11.5 },
  { day: 8, dinnerType: 'KB', calories: 1650, protein: 98, carbs: 185, fat: 58, fiber: 44, ala: 3.1, epa_dha: 1.8, vitA: 1040, b12: 7.1, folate: 520, vitC: 132, vitD: 16, vitK: 290, calcium: 630, magnesium: 330, potassium: 3290, zinc: 12.0, iron: 12.3 },
  { day: 9, dinnerType: 'PB', calories: 1750, protein: 96, carbs: 185, fat: 72, fiber: 38, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.0, folate: 480, vitC: 90, vitD: 16, vitK: 240, calcium: 600, magnesium: 300, potassium: 3000, zinc: 14.0, iron: 11.5 },
  { day: 10, dinnerType: 'BY', calories: 1620, protein: 94, carbs: 192, fat: 52, fiber: 43, ala: 2.8, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 580, vitC: 150, vitD: 15, vitK: 260, calcium: 610, magnesium: 320, potassium: 3530, zinc: 11.2, iron: 11.0 },
  { day: 11, dinnerType: 'BS', calories: 1760, protein: 101, carbs: 180, fat: 70, fiber: 37, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.5, folate: 480, vitC: 82, vitD: 15, vitK: 210, calcium: 610, magnesium: 310, potassium: 3150, zinc: 14.0, iron: 14.1 },
  { day: 12, dinnerType: 'CC', calories: 1670, protein: 97, carbs: 190, fat: 59, fiber: 48, ala: 3.2, epa_dha: 1.8, vitA: 950, b12: 7.0, folate: 600, vitC: 130, vitD: 16, vitK: 430, calcium: 620, magnesium: 360, potassium: 3400, zinc: 12.0, iron: 12.0 },
  { day: 13, dinnerType: 'SP', calories: 1680, protein: 95, carbs: 205, fat: 55, fiber: 52, ala: 3.3, epa_dha: 1.8, vitA: 1800, b12: 7.0, folate: 580, vitC: 130, vitD: 16, vitK: 260, calcium: 620, magnesium: 390, potassium: 3710, zinc: 11.5, iron: 12.0 },
  { day: 14, dinnerType: 'MC', calories: 1640, protein: 92, carbs: 183, fat: 58, fiber: 46, ala: 3.0, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 520, vitC: 120, vitD: 16, vitK: 420, calcium: 690, magnesium: 330, potassium: 3180, zinc: 11.0, iron: 11.5 },
  { day: 15, dinnerType: 'KB', calories: 1650, protein: 98, carbs: 185, fat: 58, fiber: 44, ala: 3.1, epa_dha: 1.8, vitA: 1040, b12: 7.1, folate: 520, vitC: 132, vitD: 16, vitK: 290, calcium: 630, magnesium: 330, potassium: 3290, zinc: 12.0, iron: 12.3 },
  { day: 16, dinnerType: 'PB', calories: 1750, protein: 96, carbs: 185, fat: 72, fiber: 38, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.0, folate: 480, vitC: 90, vitD: 16, vitK: 240, calcium: 600, magnesium: 300, potassium: 3000, zinc: 14.0, iron: 11.5 },
  { day: 17, dinnerType: 'BY', calories: 1620, protein: 94, carbs: 192, fat: 52, fiber: 43, ala: 2.8, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 580, vitC: 150, vitD: 15, vitK: 260, calcium: 610, magnesium: 320, potassium: 3530, zinc: 11.2, iron: 11.0 },
  { day: 18, dinnerType: 'BS', calories: 1760, protein: 101, carbs: 180, fat: 70, fiber: 37, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.5, folate: 480, vitC: 82, vitD: 15, vitK: 210, calcium: 610, magnesium: 310, potassium: 3150, zinc: 14.0, iron: 14.1 },
  { day: 19, dinnerType: 'CC', calories: 1670, protein: 97, carbs: 190, fat: 59, fiber: 48, ala: 3.2, epa_dha: 1.8, vitA: 950, b12: 7.0, folate: 600, vitC: 130, vitD: 16, vitK: 430, calcium: 620, magnesium: 360, potassium: 3400, zinc: 12.0, iron: 12.0 },
  { day: 20, dinnerType: 'SP', calories: 1680, protein: 95, carbs: 205, fat: 55, fiber: 52, ala: 3.3, epa_dha: 1.8, vitA: 1800, b12: 7.0, folate: 580, vitC: 130, vitD: 16, vitK: 260, calcium: 620, magnesium: 390, potassium: 3710, zinc: 11.5, iron: 12.0 },
  { day: 21, dinnerType: 'MC', calories: 1640, protein: 92, carbs: 183, fat: 58, fiber: 46, ala: 3.0, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 520, vitC: 120, vitD: 16, vitK: 420, calcium: 690, magnesium: 330, potassium: 3180, zinc: 11.0, iron: 11.5 },
  { day: 22, dinnerType: 'KB', calories: 1650, protein: 98, carbs: 185, fat: 58, fiber: 44, ala: 3.1, epa_dha: 1.8, vitA: 1040, b12: 7.1, folate: 520, vitC: 132, vitD: 16, vitK: 290, calcium: 630, magnesium: 330, potassium: 3290, zinc: 12.0, iron: 12.3 },
  { day: 23, dinnerType: 'PB', calories: 1750, protein: 96, carbs: 185, fat: 72, fiber: 38, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.0, folate: 480, vitC: 90, vitD: 16, vitK: 240, calcium: 600, magnesium: 300, potassium: 3000, zinc: 14.0, iron: 11.5 },
  { day: 24, dinnerType: 'BY', calories: 1620, protein: 94, carbs: 192, fat: 52, fiber: 43, ala: 2.8, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 580, vitC: 150, vitD: 15, vitK: 260, calcium: 610, magnesium: 320, potassium: 3530, zinc: 11.2, iron: 11.0 },
  { day: 25, dinnerType: 'BS', calories: 1760, protein: 101, carbs: 180, fat: 70, fiber: 37, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.5, folate: 480, vitC: 82, vitD: 15, vitK: 210, calcium: 610, magnesium: 310, potassium: 3150, zinc: 14.0, iron: 14.1 },
  { day: 26, dinnerType: 'CC', calories: 1670, protein: 97, carbs: 190, fat: 59, fiber: 48, ala: 3.2, epa_dha: 1.8, vitA: 950, b12: 7.0, folate: 600, vitC: 130, vitD: 16, vitK: 430, calcium: 620, magnesium: 360, potassium: 3400, zinc: 12.0, iron: 12.0 },
  { day: 27, dinnerType: 'SP', calories: 1680, protein: 95, carbs: 205, fat: 55, fiber: 52, ala: 3.3, epa_dha: 1.8, vitA: 1800, b12: 7.0, folate: 580, vitC: 130, vitD: 16, vitK: 260, calcium: 620, magnesium: 390, potassium: 3710, zinc: 11.5, iron: 12.0 },
  { day: 28, dinnerType: 'MC', calories: 1640, protein: 92, carbs: 183, fat: 58, fiber: 46, ala: 3.0, epa_dha: 1.8, vitA: 900, b12: 7.0, folate: 520, vitC: 120, vitD: 16, vitK: 420, calcium: 690, magnesium: 330, potassium: 3180, zinc: 11.0, iron: 11.5 },
  { day: 29, dinnerType: 'KB', calories: 1650, protein: 98, carbs: 185, fat: 58, fiber: 44, ala: 3.1, epa_dha: 1.8, vitA: 1040, b12: 7.1, folate: 520, vitC: 132, vitD: 16, vitK: 290, calcium: 630, magnesium: 330, potassium: 3290, zinc: 12.0, iron: 12.3 },
  { day: 30, dinnerType: 'PB', calories: 1750, protein: 96, carbs: 185, fat: 72, fiber: 38, ala: 2.7, epa_dha: 1.8, vitA: 900, b12: 8.0, folate: 480, vitC: 90, vitD: 16, vitK: 240, calcium: 600, magnesium: 300, potassium: 3000, zinc: 14.0, iron: 11.5 }
];

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

const DayDetail = ({ day, nutrition, customMeals, dinnerRecipes, onUpdate, onClose }) => {
  const [editingMeal, setEditingMeal] = useState(null);
  
  const dinnerInfo =
    dinnerRecipes[nutrition.dinnerType] || { name: 'Dinner', color: '#94a3b8', ingredients: [] };
  const dayKey = `day-${day}`;
  
  const getMeal = (mealType, subType = null) => {
    const key = subType ? `${mealType}-${subType}` : mealType;
    if (customMeals[dayKey] && customMeals[dayKey][key]) {
      return customMeals[dayKey][key];
    }
    if (mealType === 'breakfast') {
      return BASE_MEALS.breakfast[day % 2 === 0 ? 'chia' : 'shake'];
    }
    if (mealType === 'lunch') {
      return BASE_MEALS.lunch[day % 2 === 0 ? 'trout' : 'salmon'];
    }
    if (mealType === 'dinner') {
      return dinnerRecipes[nutrition.dinnerType] || dinnerInfo;
    }
    return BASE_MEALS.snacks.default;
  };
  
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
              <CircularProgress value={nutrition.calories} max={DIET_GOALS.calories.max} color="#f59e0b" label="Calories" unit=" kcal" />
              <CircularProgress value={nutrition.protein} max={DIET_GOALS.protein.max} color="#3b82f6" label="Protein" unit="g" />
              <CircularProgress value={nutrition.carbs} max={DIET_GOALS.carbs.max} color="#22c55e" label="Carbs" unit="g" />
              <CircularProgress value={nutrition.fat} max={DIET_GOALS.fat.max} color="#f43f5e" label="Fat" unit="g" />
              <CircularProgress value={nutrition.fiber} max={DIET_GOALS.fiber.max} color="#8b5cf6" label="Fiber" unit="g" />
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <MicroBar label="Omega-3 (ALA + EPA/DHA)" value={nutrition.ala + nutrition.epa_dha} max={5} unit="g" color="#06b6d4" />
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
          </div>
          
          <div className="p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">Meals & Ingredients</h3>
            
            <MealCard 
              title="Breakfast"
              meal={getMeal('breakfast')}
              mealKey={`breakfast-${day % 2 === 0 ? 'chia' : 'shake'}`}
              dayKey={dayKey}
              onUpdate={onUpdate}
              isEditing={editingMeal === 'breakfast'}
              setIsEditing={(v) => setEditingMeal(v ? 'breakfast' : null)}
            />
            
            <MealCard 
              title="Lunch"
              meal={getMeal('lunch')}
              mealKey={`lunch-${day % 2 === 0 ? 'trout' : 'salmon'}`}
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

const MethodologyPanel = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
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
              <div className="flex justify-between p-2 rounded bg-[#D9EAFD]"><span>Calories</span><span className="text-slate-600">1500–1800 kcal</span></div>
              <div className="flex justify-between p-2 rounded bg-[#D9EAFD]"><span>Protein</span><span className="text-slate-600">90–100g</span></div>
              <div className="flex justify-between p-2 rounded bg-[#D9EAFD]"><span>Fiber</span><span className="text-slate-600">40–60g</span></div>
              <div className="flex justify-between p-2 rounded bg-[#D9EAFD]"><span>Omega-3</span><span className="text-slate-600">2–3g EPA/DHA</span></div>
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

// ============================================================================
// RECIPES PANEL
// ============================================================================

const RecipesPanel = ({ isOpen, onClose, dinnerRecipes, onAddDinner, onEditDinner }) => {
  if (!isOpen) return null;

  const sections = [
    { key: 'breakfast', title: 'Breakfast', meals: BASE_MEALS.breakfast },
    { key: 'lunch', title: 'Lunch', meals: BASE_MEALS.lunch },
    { key: 'snacks', title: 'Snacks', meals: BASE_MEALS.snacks },
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
              <h3 className="text-[#9AA6B2] font-medium mb-3">{section.title}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(section.meals).map(([mealKey, meal]) => (
                  <div key={mealKey} className="p-4 rounded-xl bg-[#D9EAFD]/80 border border-[#9AA6B2]/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{meal.name}</p>
                        <p className="text-xs text-slate-500">{section.title}</p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                      {meal.ingredients.map((ingredient, index) => (
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

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#9AA6B2] font-medium">Dinner</h3>
              <button
                onClick={onAddDinner}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9AA6B2] border border-[#9AA6B2]/40 rounded-lg hover:bg-[#BCCCDC]/30 transition-colors"
              >
                <PlusIcon /> Add Dinner Recipe
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(dinnerRecipes).map(([mealKey, meal]) => (
                <div key={mealKey} className="p-4 rounded-xl bg-[#D9EAFD]/80 border border-[#9AA6B2]/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{meal.name}</p>
                      <p className="text-xs font-mono text-slate-500 mt-1">Code: {mealKey}</p>
                    </div>
                    <button
                      onClick={() => onEditDinner(mealKey)}
                      className="px-2 py-1 text-xs font-medium text-slate-700 bg-[#BCCCDC] rounded hover:bg-[#9AA6B2] transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                    {meal.ingredients.map((ingredient, index) => (
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
        </div>
      </div>
    </div>
  );
};

const DinnerEditor = ({
  isOpen,
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
    const normalizedCode = mode === 'create' ? code.trim().toUpperCase() : initialCode;
    if (!normalizedCode) {
      setError('Dinner code is required.');
      return;
    }
    if (mode === 'create' && existingCodes.includes(normalizedCode)) {
      setError('This dinner code already exists.');
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
              {mode === 'create' ? 'Add Dinner Recipe' : 'Edit Dinner Recipe'}
            </h3>
            <p className="text-sm text-slate-500">
              Define reusable dinner templates for the calendar.
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
                Dinner Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={3}
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
  const [dinnerRecipes, setDinnerRecipes] = useState(() => cloneDinnerRecipes(BASE_DINNER_RECIPES));
  const [activeDinnerEditor, setActiveDinnerEditor] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check auth state on mount
  useEffect(() => {
    if (!supabase) {
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
  }, []);
  
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
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('meal_customizations')
        .select('data')
        .eq('user_id', userId)
        .single();
      
      if (data && !error) {
        setCustomMeals(data.data || {});
      }
    } catch (error) {
      console.log('Failed to load user data');
    }
  };
  
  const saveToSupabase = async (data) => {
    if (!user || !supabase) return false;
    
    try {
      const { error } = await supabase
        .from('meal_customizations')
        .upsert({
          user_id: user.id,
          data: data,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      return !error;
    } catch (error) {
      console.error('Save failed:', error);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(DINNER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDinnerRecipes(cloneDinnerRecipes(parsed));
      }
    } catch (error) {
      console.error('Failed to load dinner recipes', error);
    }
  }, []);

  const persistDinnerRecipes = useCallback((updater) => {
    setDinnerRecipes((prev) => {
      const base = typeof updater === 'function' ? updater(prev) : updater;
      const next = cloneDinnerRecipes(base);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(DINNER_STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
          console.error('Failed to save dinner recipes', error);
        }
      }
      return next;
    });
  }, []);

  const handleSaveDinnerTemplate = useCallback(
    (code, recipe) => {
      persistDinnerRecipes((prev) => ({
        ...prev,
        [code]: {
          ...recipe,
          ingredients: (recipe.ingredients || []).map((ingredient) => ({ ...ingredient })),
        },
      }));
      setActiveDinnerEditor(null);
    },
    [persistDinnerRecipes]
  );

  const handleDeleteDinnerTemplate = useCallback(
    (code) => {
      persistDinnerRecipes((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      setActiveDinnerEditor(null);
    },
    [persistDinnerRecipes]
  );
  
  const handleExportCsv = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const csvText = buildNutritionCsv(dinnerRecipes);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'january-meal-plan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [dinnerRecipes]);

  const handleOpenInGoogleSheets = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const excelXml = buildExcelXml(dinnerRecipes);
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
  }, [dinnerRecipes]);
  
  const handleUpdateMeal = useCallback(async (dayKey, mealKey, mealData) => {
    const updated = {
      ...customMeals,
      [dayKey]: {
        ...(customMeals[dayKey] || {}),
        [mealKey]: mealData
      }
    };
    
    setCustomMeals(updated);
    
    // Save to localStorage always (as backup)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('january-meal-plan', JSON.stringify(updated));
      } catch (e) {
        console.error('Local save failed');
      }
    }
    
    // Save to Supabase if logged in
    if (user) {
      setSaveStatus('saving');
      const success = await saveToSupabase(updated);
      setSaveStatus(success ? 'saved' : 'error');
    } else {
      setSaveStatus('saved');
    }
    
    setTimeout(() => setSaveStatus(null), 2000);
  }, [customMeals, user]);
  
  const handleSignIn = async () => {
    if (!supabase) return;
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
    if (!supabase) return;
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
  const selectedNutrition = selectedDay ? DAILY_NUTRITION.find(n => n.day === selectedDay) : null;
  
  const weeklyAvg = weekDays.reduce((acc, day) => {
    const n = DAILY_NUTRITION.find(d => d.day === day);
    if (n) {
      acc.calories += n.calories;
      acc.protein += n.protein;
      acc.fiber += n.fiber;
      acc.count += 1;
    }
    return acc;
  }, { calories: 0, protein: 0, fiber: 0, count: 0 });
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-[#9AA6B2]"><LoaderIcon /></div>
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
                <p className="text-lg font-semibold text-[#9AA6B2]">{Math.round(weeklyAvg.calories / weeklyAvg.count)} <span className="text-sm font-normal text-slate-500">kcal/day</span></p>
              </div>
              <div className="w-px h-8 bg-[#BCCCDC]" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Protein</p>
                <p className="text-lg font-semibold text-blue-400">{Math.round(weeklyAvg.protein / weeklyAvg.count)}g</p>
              </div>
              <div className="w-px h-8 bg-[#BCCCDC]" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Fiber</p>
                <p className="text-lg font-semibold text-purple-400">{Math.round(weeklyAvg.fiber / weeklyAvg.count)}g</p>
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
            const nutrition = DAILY_NUTRITION.find(n => n.day === day);
            if (!nutrition) return <div key={day} />;
            
            return (
              <CalendarDay
                key={day}
                day={day}
                nutrition={nutrition}
                dinnerInfo={dinnerRecipes[nutrition.dinnerType]}
                hasCustomization={!!customMeals[`day-${day}`]}
                onClick={() => setSelectedDay(day)}
              />
            );
          })}
        </div>
        
        <div className="mt-8 p-4 rounded-xl bg-[#D9EAFD]/70 border border-[#9AA6B2]/30">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Dinner Rotation</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dinnerRecipes).map(([code, info]) => (
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
          dinnerRecipes={dinnerRecipes}
          onUpdate={handleUpdateMeal}
          onClose={() => setSelectedDay(null)}
        />
      )}
    
      <RecipesPanel
        isOpen={showRecipes}
        onClose={() => setShowRecipes(false)}
        dinnerRecipes={dinnerRecipes}
        onAddDinner={() => setActiveDinnerEditor({ mode: 'create' })}
        onEditDinner={(code) => setActiveDinnerEditor({ mode: 'edit', code })}
      />
      <DinnerEditor
        isOpen={!!activeDinnerEditor}
        mode={activeDinnerEditor?.mode || 'edit'}
        initialCode={activeDinnerEditor?.code || ''}
        recipe={
          activeDinnerEditor?.mode === 'edit' && activeDinnerEditor.code
            ? dinnerRecipes[activeDinnerEditor.code]
            : { name: '', color: '#f97316', ingredients: [] }
        }
        existingCodes={Object.keys(dinnerRecipes)}
        canDelete={
          activeDinnerEditor?.mode === 'edit' &&
          activeDinnerEditor.code &&
          !BASE_DINNER_RECIPES[activeDinnerEditor.code]
        }
        onSave={handleSaveDinnerTemplate}
        onDelete={handleDeleteDinnerTemplate}
        onClose={() => setActiveDinnerEditor(null)}
      />
      <MethodologyPanel isOpen={showMethodology} onClose={() => setShowMethodology(false)} />
    </div>
  );
}
