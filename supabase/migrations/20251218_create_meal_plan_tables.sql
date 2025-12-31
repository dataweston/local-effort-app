create table if not exists public.meal_plan_global (
  plan_key text primary key,
  version int not null default 1,
  overrides_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.meal_plan_user (
  plan_key text not null,
  user_id uuid not null,
  overrides_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (plan_key, user_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user'
);

alter table public.meal_plan_global enable row level security;
alter table public.meal_plan_user enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "global_read_all" on public.meal_plan_global;
create policy "global_read_all"
on public.meal_plan_global for select
using (true);

drop policy if exists "global_write_admin_only" on public.meal_plan_global;
create policy "global_write_admin_only"
on public.meal_plan_global for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "global_update_admin_only" on public.meal_plan_global;
create policy "global_update_admin_only"
on public.meal_plan_global for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "user_plan_read_own" on public.meal_plan_user;
create policy "user_plan_read_own"
on public.meal_plan_user for select
using (auth.uid() = user_id);

drop policy if exists "user_plan_write_own" on public.meal_plan_user;
create policy "user_plan_write_own"
on public.meal_plan_user for insert
with check (auth.uid() = user_id);

drop policy if exists "user_plan_update_own" on public.meal_plan_user;
create policy "user_plan_update_own"
on public.meal_plan_user for update
using (auth.uid() = user_id);
