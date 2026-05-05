-- Lock down public anon/auth grants.
-- The anon key is public by design; tables in exposed schemas must be RLS-gated
-- and must not inherit blanket read/write grants.

begin;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke all privileges on all functions in schema public from anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

grant usage on schema public to anon, authenticated;

do $$
declare
  table_record record;
begin
  for table_record in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format('alter table %I.%I enable row level security', table_record.nspname, table_record.relname);
  end loop;
end $$;

-- Remove policies that accidentally grant public/all-authenticated full access.
drop policy if exists "Anyone can view own bookings" on public.calendar_bookings;
drop policy if exists "Customers can view their bookings" on public.calendar_bookings;
drop policy if exists "Service role has full access to bookings" on public.calendar_bookings;
drop policy if exists "Admins have full access to bookings" on public.calendar_bookings;

drop policy if exists "Admins have full access to events" on public.calendar_events;
drop policy if exists "Service role has full access to events" on public.calendar_events;

drop policy if exists "Admins have full access to receipts" on public.calendar_receipts;
drop policy if exists "Service role has full access to receipts" on public.calendar_receipts;

drop policy if exists "Admins have full access to time slots" on public.calendar_time_slots;
drop policy if exists "Service role has full access to time slots" on public.calendar_time_slots;

drop policy if exists "Service role has full access" on public.february_bookings;

drop policy if exists "Public can view pledges" on public.crowdfund_pledges;
drop policy if exists "Public can insert pledges" on public.crowdfund_pledges;
drop policy if exists "Public can view feedback" on public.crowdfund_feedback;

-- Public read surfaces.
grant select on public.calendar_events_public to anon, authenticated;
grant select on public.calendar_time_slots_available to anon, authenticated;
grant select on public.crowdfund_aggregates to anon, authenticated;
grant select on public.january_meal_config to anon, authenticated;
grant select on public.meal_plan_global to anon, authenticated;
grant select on public.meal_recipes to anon, authenticated;
grant select on public.meal_recipe_ingredients to anon, authenticated;

-- Public write-only intake surfaces.
grant insert on public.event_requests to anon, authenticated;
grant insert on public.meal_prep_waitlist to anon, authenticated;
grant insert on public.winter_dinner_registrations to anon, authenticated;

-- Authenticated client-side Supabase surfaces guarded by RLS policies.
grant select on public.weekly_order_users to authenticated;
grant select, update on public.profiles to authenticated;

grant select, insert, update on public.january_meal_config to authenticated;
grant select, insert, update, delete on public.january_meal_user_config to authenticated;
grant select, insert, update on public.meal_plan_global to authenticated;
grant select, insert, update, delete on public.meal_plan_user to authenticated;
grant select, insert, update, delete on public.meal_recipes to authenticated;
grant select, insert, update, delete on public.meal_recipe_ingredients to authenticated;

grant select on public.happymonday_users to authenticated;
grant select, update on public.happymonday_credits to authenticated;
grant select, insert, update on public.happymonday_orders to authenticated;
grant select, insert on public.happymonday_payments to authenticated;
grant select, insert, update, delete on public.happymonday_costing to authenticated;

grant select, insert, update, delete on public.happymonday_integrations to authenticated;
grant select, insert, update, delete on public.happymonday_inventory_syncs to authenticated;
grant select, insert, update, delete on public.happymonday_item_catalog_mapping to authenticated;
grant select on public.happymonday_order_history to authenticated;

-- RPC surface. Service-role/server callers bypass these grants; browser callers do not.
grant execute on function public.is_happymonday_admin() to anon, authenticated;
grant execute on function public.happymonday_financial_snapshot(text, boolean) to authenticated;
grant execute on function public.update_happymonday_order(uuid, jsonb, jsonb, integer, text, date, uuid) to authenticated;
grant execute on function public.mark_happymonday_order_paid(uuid, uuid) to authenticated;

grant execute on function public.get_crowdfund_status() to anon, authenticated;
grant execute on function public.get_recent_feedback(integer) to anon, authenticated;
grant execute on function public.get_meal_library() to anon, authenticated;
grant execute on function public.get_meal_recipe_with_ingredients(uuid) to anon, authenticated;
grant execute on function public.get_recipes_by_meal_type(text) to anon, authenticated;

alter function public.handle_new_user() set search_path = public;
alter function public.mark_happymonday_order_paid(uuid, uuid) set search_path = public;
alter function public.track_happymonday_order_edit() set search_path = public;
alter function public.update_credit_balance_after_order() set search_path = public;
alter function public.update_credit_balance_after_payment() set search_path = public;
alter function public.update_happymonday_order(uuid, jsonb, jsonb, integer, text, date, uuid) set search_path = public;

commit;
