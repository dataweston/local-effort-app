-- Add support for storing admin-defined custom meals (daily overrides)
alter table if exists public.january_meal_config
  add column if not exists custom_meals jsonb;

