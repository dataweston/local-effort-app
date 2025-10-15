-- Fix RLS policies to allow public INSERT on crowdfund_pledges
-- Run this in Supabase SQL Editor to fix the "private" issue

-- Drop and recreate the pledge policies to allow INSERT
drop policy if exists "Public can view pledge count" on public.crowdfund_pledges;

create policy "Public can view pledges"
  on public.crowdfund_pledges
  for select
  to anon, authenticated
  using (true);

create policy "Public can insert pledges"
  on public.crowdfund_pledges
  for insert
  to anon, authenticated
  with check (true);

-- Ensure grants are correct
grant select, insert on public.crowdfund_pledges to anon, authenticated;

-- Verify the policies
select schemaname, tablename, policyname, roles, cmd 
from pg_policies 
where tablename = 'crowdfund_pledges';
