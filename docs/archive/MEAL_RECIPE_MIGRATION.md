# Meal Recipe Migration Guide

This guide explains how to migrate from hard-coded BASE_MEALS to database-backed USDA recipes.

## Overview

The meal plan system now stores all recipes in the database with USDA-backed ingredients. This ensures:
- All ingredients have complete micronutrient data
- Recipes are manageable through the UI (for admins)
- No hard-coded meal data in the codebase
- Consistent data storage with user customizations

## Setup Steps

### 1. Run the Migration

Apply the database schema:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration file directly in Supabase dashboard
# File: supabase/migrations/20251221_meal_recipes_library.sql
```

### 2. Set Environment Variables

Ensure you have these variables set:

```bash
# USDA API Key (get from https://fdc.nal.usda.gov/api-key-signup.html)
VITE_USDA_API_KEY=your_usda_api_key
USDA_API_KEY=your_usda_api_key

# Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Seed the Database

Run the seed script to populate recipes with USDA data:

```bash
cd scripts
node seed-meal-recipes.js
```

This script will:
- Search USDA database for each ingredient
- Fetch complete nutrient profiles (including micronutrients)
- Insert recipes and ingredients into the database
- Display progress as it works

**Note:** The script includes rate limiting (300ms between requests) to respect USDA API limits. It may take 5-10 minutes to complete.

### 4. Verify

Check that recipes loaded:

```sql
-- Count recipes by type
select meal_type, count(*) 
from meal_recipes 
group by meal_type;

-- Sample ingredients with nutrients
select r.name as recipe, i.name as ingredient, i.fdc_id, 
       i.nutrients_per_100g->>'vitD' as vitamin_d,
       i.nutrients_per_100g->>'epa_dha' as omega3
from meal_recipes r
join meal_recipe_ingredients i on i.recipe_id = r.id
limit 5;
```

## How It Works

### Database Structure

```
meal_recipes
├── id (uuid)
├── meal_type (breakfast, lunch, dinner, snacks)
├── code (unique identifier like 'KB', 'salmon')
├── name
├── color
└── notes

meal_recipe_ingredients
├── id (uuid)
├── recipe_id (references meal_recipes)
├── name
├── fdc_id (USDA Food Data Central ID)
├── amount (grams)
├── unit
├── nutrients_per_100g (complete nutrient profile as JSONB)
└── sort_order
```

### Code Changes

1. **useMealLibrary hook** - Loads recipes from database on mount
2. **recipeStorage.ts** - Functions to save/delete recipes
3. **useMealPlanState** - Now accepts mealLibrary parameter
4. **JanuaryMealsPage** - Loads library and passes to state hook

### Recipe Management

Admins can now:
- Edit recipe names/colors through the UI
- Delete recipes (with confirmation)
- Add new recipes (future enhancement)

All changes are persisted to the database.

## Adding New Recipes

To add a new recipe manually:

1. Insert into `meal_recipes`:
```sql
insert into meal_recipes (meal_type, code, name, color)
values ('dinner', 'NEW', 'New Recipe', '#FF5733');
```

2. For each ingredient, search USDA and insert:
```sql
-- After finding fdcId and nutrients from USDA
insert into meal_recipe_ingredients (
  recipe_id, name, fdc_id, amount, unit, 
  nutrients_per_100g, sort_order
)
values (
  'recipe-uuid', 
  'Ingredient Name',
  123456,  -- USDA fdcId
  100,     -- grams
  'g',
  '{"calories": 100, "protein": 10, ...}'::jsonb,
  0
);
```

Or use the seed script pattern for batch additions.

## Troubleshooting

**Recipes not loading:**
- Check browser console for errors
- Verify Supabase connection
- Check RLS policies allow reading

**Micronutrients showing as zero:**
- Verify ingredients have `fdc_id` populated
- Check `nutrients_per_100g` JSONB contains all nutrient keys
- Run seed script to enrich existing data

**Seed script fails:**
- Verify USDA API key is valid
- Check rate limits (wait 24 hours if exceeded)
- Ensure Supabase service role key is correct

## Migration Checklist

- [ ] Database migration applied
- [ ] Environment variables set
- [ ] Seed script completed successfully
- [ ] Recipes visible in UI
- [ ] Micronutrients displaying in calculators
- [ ] Admin can edit/delete recipes
- [ ] No TypeScript errors in codebase
