-- Create proper tables for storing meal recipes with USDA-backed ingredients
-- This replaces hard-coded BASE_MEALS with database-stored recipes

-- Recipe library table - stores all meal templates
create table if not exists public.meal_recipes (
  id uuid primary key default gen_random_uuid(),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  code text not null,
  name text not null,
  color text,
  notes text,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint meal_recipes_unique_code unique (meal_type, code)
);

-- Ingredients table - each ingredient tied to USDA FDC data
create table if not exists public.meal_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.meal_recipes(id) on delete cascade,
  name text not null,
  fdc_id integer not null,
  amount numeric not null,
  unit text not null default 'g',
  display_amount numeric,
  display_unit text,
  nutrients_per_100g jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists meal_recipes_meal_type_idx on public.meal_recipes(meal_type);
create index if not exists meal_recipes_code_idx on public.meal_recipes(code);
create index if not exists meal_recipe_ingredients_recipe_id_idx on public.meal_recipe_ingredients(recipe_id);
create index if not exists meal_recipe_ingredients_fdc_id_idx on public.meal_recipe_ingredients(fdc_id);

-- RLS Policies
alter table public.meal_recipes enable row level security;
alter table public.meal_recipe_ingredients enable row level security;

-- Everyone can read recipes
drop policy if exists "recipes_read_all" on public.meal_recipes;
create policy "recipes_read_all"
on public.meal_recipes for select
using (true);

drop policy if exists "recipe_ingredients_read_all" on public.meal_recipe_ingredients;
create policy "recipe_ingredients_read_all"
on public.meal_recipe_ingredients for select
using (true);

-- Only admins can create/update/delete recipes
drop policy if exists "recipes_write_admin" on public.meal_recipes;
create policy "recipes_write_admin"
on public.meal_recipes for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "recipe_ingredients_write_admin" on public.meal_recipe_ingredients;
create policy "recipe_ingredients_write_admin"
on public.meal_recipe_ingredients for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Function to get complete recipe with ingredients
create or replace function get_meal_recipe_with_ingredients(p_recipe_id uuid)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', r.id,
    'mealType', r.meal_type,
    'code', r.code,
    'name', r.name,
    'color', r.color,
    'notes', r.notes,
    'ingredients', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'fdcId', i.fdc_id,
            'amount', i.amount,
            'unit', i.unit,
            'displayAmount', i.display_amount,
            'displayUnit', i.display_unit,
            'nutrientsPer100g', i.nutrients_per_100g
          ) order by i.sort_order
        )
        from public.meal_recipe_ingredients i
        where i.recipe_id = r.id
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.meal_recipes r
  where r.id = p_recipe_id;
  
  return result;
end;
$$;

-- Function to get all recipes for a meal type
create or replace function get_recipes_by_meal_type(p_meal_type text)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
begin
  select jsonb_object_agg(
    r.code,
    jsonb_build_object(
      'name', r.name,
      'color', r.color,
      'notes', r.notes,
      'ingredients', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'name', i.name,
              'fdcId', i.fdc_id,
              'amount', i.amount,
              'unit', i.unit,
              'displayAmount', i.display_amount,
              'displayUnit', i.display_unit,
              'nutrientsPer100g', i.nutrients_per_100g
            ) order by i.sort_order
          )
          from public.meal_recipe_ingredients i
          where i.recipe_id = r.id
        ),
        '[]'::jsonb
      )
    )
  )
  into result
  from public.meal_recipes r
  where r.meal_type = p_meal_type;
  
  return coalesce(result, '{}'::jsonb);
end;
$$;

-- Function to get all meal recipes (meal library)
create or replace function get_meal_library()
returns jsonb
language plpgsql
as $$
begin
  return jsonb_build_object(
    'breakfast', get_recipes_by_meal_type('breakfast'),
    'lunch', get_recipes_by_meal_type('lunch'),
    'dinner', get_recipes_by_meal_type('dinner'),
    'snacks', get_recipes_by_meal_type('snacks')
  );
end;
$$;

comment on table public.meal_recipes is 'Global meal recipe library - replaces hard-coded BASE_MEALS';
comment on table public.meal_recipe_ingredients is 'Ingredients for recipes, all backed by USDA FDC data';
comment on function get_meal_library() is 'Returns complete meal library in same format as BASE_MEALS';
