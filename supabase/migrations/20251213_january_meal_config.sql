-- Global January meal plan configuration
-- Stores admin-defined recipes and goals that should be shared across all users

create table if not exists public.january_meal_config (
  key text primary key,
  recipes jsonb not null,
  goals jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Basic RLS: allow all roles to read; only authenticated/service-role can write.
alter table public.january_meal_config enable row level security;

create policy "january_meal_config_select_all" on public.january_meal_config
  for select
  using (true);

create policy "january_meal_config_write_authenticated" on public.january_meal_config
  for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create policy "january_meal_config_update_authenticated" on public.january_meal_config
  for update
  using (auth.role() = 'authenticated' or auth.role() = 'service_role')
  with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Per-user January meal config (non-admin overrides)
create table if not exists public.january_meal_user_config (
  user_id uuid primary key references auth.users(id),
  recipes jsonb,
  goals jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.january_meal_user_config enable row level security;

create policy "january_meal_user_config_rw_self" on public.january_meal_user_config
  for all
  using (auth.uid() = user_id or auth.role() = 'service_role')
  with check (auth.uid() = user_id or auth.role() = 'service_role');
