/**
 * Seed script to populate meal_recipes tables with USDA-backed ingredients
 * 
 * This script:
 * 1. Looks up each ingredient in USDA FoodData Central
 * 2. Gets complete nutrient profiles (macros + micros)
 * 3. Inserts recipes and ingredients into the database
 * 
 * Run with: node scripts/seed-meal-recipes.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const USDA_API_KEY = process.env.VITE_USDA_API_KEY || process.env.USDA_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!USDA_API_KEY) {
  console.error('❌ USDA_API_KEY not found in environment');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// USDA API helpers
async function searchUSDA(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=5`;
  const response = await fetch(url);
  const data = await response.json();
  return data.foods || [];
}

async function getUSDAFood(fdcId) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_API_KEY}`;
  const response = await fetch(url);
  return response.json();
}

function extractNutrients(foodNutrients) {
  const nutrientMap = {
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
    1089: 'iron'
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

  // Set defaults
  Object.values(nutrientMap).forEach(key => {
    if (!(key in nutrients)) nutrients[key] = 0;
  });

  return nutrients;
}

// Recipe definitions with USDA search terms
const RECIPES = {
  breakfast: {
    shake: {
      name: 'Morning Shake',
      color: '#8B6F47',
      ingredients: [
        { search: 'greek yogurt plain whole milk', grams: 150 },
        { search: 'kefir plain whole milk', grams: 100 },
        { search: 'blueberries frozen', grams: 80 },
        { search: 'flaxseed ground', grams: 15 },
        { search: 'chia seeds', grams: 10 },
        { search: 'collagen peptides powder', grams: 10 },
        { search: 'honey raw', grams: 10 },
        { search: 'psyllium husk powder', grams: 5 }
      ]
    },
    chia: {
      name: 'Chia Pudding Bowl',
      color: '#6B4423',
      ingredients: [
        { search: 'chia seeds', grams: 30 },
        { search: 'milk whole', grams: 200 },
        { search: 'greek yogurt plain', grams: 100 },
        { search: 'walnuts english', grams: 20 },
        { search: 'berries mixed fresh', grams: 60 },
        { search: 'honey raw', grams: 10 }
      ]
    }
  },
  lunch: {
    salmon: {
      name: 'Salmon & Rice Bowl',
      color: '#FF6B6B',
      ingredients: [
        { search: 'salmon wild atlantic cooked', grams: 150 },
        { search: 'rice brown cooked', grams: 150 },
        { search: 'natto fermented soybeans', grams: 40 },
        { search: 'broccoli cooked steamed', grams: 100 },
        { search: 'ginger pickled', grams: 20 },
        { search: 'miso paste', grams: 20 },
        { search: 'sesame seeds', grams: 5 },
        { search: 'olive oil extra virgin', grams: 10 }
      ]
    },
    trout: {
      name: 'Rainbow Trout & Quinoa',
      color: '#4ECDC4',
      ingredients: [
        { search: 'trout rainbow cooked', grams: 150 },
        { search: 'quinoa cooked', grams: 130 },
        { search: 'sauerkraut canned', grams: 60 },
        { search: 'beets cooked', grams: 80 },
        { search: 'dill fresh', grams: 5 },
        { search: 'lemon juice fresh', grams: 15 },
        { search: 'olive oil extra virgin', grams: 15 }
      ]
    }
  },
  dinner: {
    KB: {
      name: 'Tuscan Kale & White Bean Stew',
      color: '#2D5A27',
      ingredients: [
        { search: 'kale cooked', grams: 150 },
        { search: 'beans white cannellini cooked', grams: 120 },
        { search: 'broth chicken', grams: 250 },
        { search: 'sausage italian pork cooked', grams: 60 },
        { search: 'tomatoes canned crushed', grams: 100 },
        { search: 'garlic raw', grams: 10 },
        { search: 'parmesan cheese', grams: 20 },
        { search: 'olive oil extra virgin', grams: 15 },
        { search: 'bread sourdough', grams: 50 }
      ]
    },
    SP: {
      name: 'Loaded Sweet Potato',
      color: '#E07020',
      ingredients: [
        { search: 'sweet potato baked', grams: 250 },
        { search: 'beans black cooked', grams: 100 },
        { search: 'yogurt greek plain', grams: 80 },
        { search: 'avocado raw', grams: 60 },
        { search: 'cheese cotija', grams: 25 },
        { search: 'onion red raw', grams: 30 },
        { search: 'lime juice fresh', grams: 15 },
        { search: 'cilantro raw', grams: 10 }
      ]
    }
  },
  snacks: {
    default: {
      name: 'Afternoon Snack',
      color: '#8B4513',
      ingredients: [
        { search: 'chocolate dark 85%', grams: 20 },
        { search: 'nuts mixed', grams: 25 },
        { search: 'apple fresh raw', grams: 100 }
      ]
    }
  }
};

async function findBestMatch(searchTerm, targetGrams) {
  console.log(`  🔍 Searching for: ${searchTerm}`);
  const results = await searchUSDA(searchTerm);
  
  if (!results.length) {
    console.warn(`  ⚠️  No results for: ${searchTerm}`);
    return null;
  }

  // Prefer Foundation or SR Legacy data types
  const best = results.find(f => 
    f.dataType === 'Foundation' || f.dataType === 'SR Legacy'
  ) || results[0];

  const details = await getUSDAFood(best.fdcId);
  const nutrients = extractNutrients(details.foodNutrients || []);

  console.log(`  ✓ Found: ${details.description} (FDC: ${best.fdcId})`);

  return {
    name: details.description,
    fdcId: best.fdcId,
    amount: targetGrams,
    nutrientsPer100g: nutrients
  };
}

async function seedRecipes() {
  console.log('🌱 Starting recipe seeding process...\n');

  for (const [mealType, recipes] of Object.entries(RECIPES)) {
    console.log(`\n📚 Processing ${mealType} recipes...`);

    for (const [code, recipe] of Object.entries(recipes)) {
      console.log(`\n  Recipe: ${recipe.name} (${code})`);

      // Create recipe record
      const { data: recipeData, error: recipeError } = await supabase
        .from('meal_recipes')
        .insert({
          meal_type: mealType,
          code,
          name: recipe.name,
          color: recipe.color
        })
        .select()
        .single();

      if (recipeError) {
        console.error(`  ❌ Error creating recipe: ${recipeError.message}`);
        continue;
      }

      console.log(`  ✓ Created recipe ID: ${recipeData.id}`);

      // Process ingredients
      const ingredients = [];
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i];
        const match = await findBestMatch(ing.search, ing.grams);
        
        if (match) {
          ingredients.push({
            recipe_id: recipeData.id,
            name: match.name,
            fdc_id: match.fdcId,
            amount: match.amount,
            unit: 'g',
            nutrients_per_100g: match.nutrientsPer100g,
            sort_order: i
          });
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Insert all ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('meal_recipe_ingredients')
          .insert(ingredients);

        if (ingredientsError) {
          console.error(`  ❌ Error adding ingredients: ${ingredientsError.message}`);
        } else {
          console.log(`  ✓ Added ${ingredients.length} ingredients`);
        }
      }
    }
  }

  console.log('\n✨ Seeding complete!');
}

// Run the seed
seedRecipes().catch(console.error);
