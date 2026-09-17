-- Meal prep waitlist, restored 2026-09-17.
--
-- The public meal prep page went back to waitlist status: a household gives us
-- an email and, optionally, a name, phone, family size, and which meals it
-- wants. Two schema consequences:
--   1. `meals_interested` stores the checkbox answers (breakfasts, lunch,
--      dinner, kids food, other). Values are validated server-side in
--      backend/api/routes/messages.js before insert.
--   2. Every column except email is optional, so any legacy NOT NULL on the
--      optional answers is dropped. `drop not null` is a no-op when the column
--      is already nullable, so this file is safe to re-run.
--
-- Apply with the Supabase SQL editor or psql on DIRECT_DATABASE_URL. Until it
-- runs, inserts retry without `meals_interested` (PGRST204) so leads still land
-- and email-only rows rely on '' for the legacy NOT NULL name/phone columns.

alter table public.meal_prep_waitlist
  add column if not exists meals_interested text[];

alter table public.meal_prep_waitlist
  alter column name drop not null,
  alter column phone drop not null,
  alter column family_size drop not null,
  alter column days_per_week drop not null,
  alter column meals_per_day drop not null;
