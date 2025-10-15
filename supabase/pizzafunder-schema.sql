-- Supabase Schema for PizzaFunder Crowdfunding
-- Replaces Firebase Firestore collections for /pizzafunder

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- =====================================================
-- PLEDGES TABLE (replaces crowdfund_pledges collection)
-- =====================================================
create table if not exists public.crowdfund_pledges (
  id uuid primary key default uuid_generate_v4(),
  
  -- Funder information
  funder_name text not null,
  email text,
  phone text,
  notes text,
  reward_preference text,
  
  -- Pledge details
  pizza_count integer not null default 1,
  amount_cents integer not null,
  
  -- Payment tracking
  payment_id text not null, -- Square payment ID
  status text not null default 'COMPLETED',
  
  -- Timestamps
  created_at timestamptz not null default now(),
  created_at_ms bigint not null default extract(epoch from now()) * 1000,
  
  -- Indexes for common queries
  constraint valid_pizza_count check (pizza_count > 0),
  constraint valid_amount check (amount_cents >= 0)
);

-- Indexes for performance
create index if not exists idx_pledges_created_at on public.crowdfund_pledges(created_at desc);
create index if not exists idx_pledges_payment_id on public.crowdfund_pledges(payment_id);
create index if not exists idx_pledges_email on public.crowdfund_pledges(email);

-- =====================================================
-- FEEDBACK TABLE (replaces crowdfund_feedback collection)
-- =====================================================
create table if not exists public.crowdfund_feedback (
  id uuid primary key default uuid_generate_v4(),
  
  -- Feedback content
  name text not null default 'Anonymous pizza fan',
  comment text not null,
  rating integer not null default 5,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  created_at_ms bigint not null default extract(epoch from now()) * 1000,
  
  -- Validation
  constraint valid_rating check (rating >= 1 and rating <= 5),
  constraint valid_comment check (length(comment) > 0 and length(comment) <= 600),
  constraint valid_name check (length(name) <= 120)
);

-- Indexes for performance
create index if not exists idx_feedback_created_at on public.crowdfund_feedback(created_at_ms desc);
create index if not exists idx_feedback_rating on public.crowdfund_feedback(rating);

-- =====================================================
-- AGGREGATES TABLE (replaces aggregates/crowdfunding doc)
-- =====================================================
create table if not exists public.crowdfund_aggregates (
  id text primary key default 'crowdfunding', -- Single row for campaign totals
  
  -- Campaign metrics
  pizzas integer not null default 0,
  backers integer not null default 0,
  goal integer not null default 1000,
  
  -- Timestamp
  last_updated timestamptz not null default now(),
  
  -- Validation
  constraint valid_pizzas check (pizzas >= 0),
  constraint valid_backers check (backers >= 0),
  constraint valid_goal check (goal > 0)
);

-- Initialize the aggregates table with default values
insert into public.crowdfund_aggregates (id, pizzas, backers, goal, last_updated)
values ('crowdfunding', 0, 0, 1000, now())
on conflict (id) do nothing;

-- =====================================================
-- FUNCTION: Update aggregates after pledge insert
-- =====================================================
create or replace function public.update_crowdfund_aggregates()
returns trigger as $$
begin
  -- Increment pizzas and backers
  update public.crowdfund_aggregates
  set 
    pizzas = pizzas + new.pizza_count,
    backers = backers + 1,
    last_updated = now()
  where id = 'crowdfunding';
  
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update aggregates when pledge is added
drop trigger if exists trigger_update_aggregates on public.crowdfund_pledges;
create trigger trigger_update_aggregates
  after insert on public.crowdfund_pledges
  for each row
  execute function public.update_crowdfund_aggregates();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
alter table public.crowdfund_pledges enable row level security;
alter table public.crowdfund_feedback enable row level security;
alter table public.crowdfund_aggregates enable row level security;

-- Pledges: Allow service role full access, public can insert and read
create policy "Service role can manage pledges"
  on public.crowdfund_pledges
  for all
  to service_role
  using (true)
  with check (true);

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

-- Feedback: Public can read and insert
create policy "Public can view feedback"
  on public.crowdfund_feedback
  for select
  to anon, authenticated
  using (true);

create policy "Public can submit feedback"
  on public.crowdfund_feedback
  for insert
  to anon, authenticated
  with check (true);

create policy "Service role can manage feedback"
  on public.crowdfund_feedback
  for all
  to service_role
  using (true)
  with check (true);

-- Aggregates: Public read-only, service role can update
create policy "Public can view aggregates"
  on public.crowdfund_aggregates
  for select
  to anon, authenticated
  using (true);

create policy "Service role can update aggregates"
  on public.crowdfund_aggregates
  for all
  to service_role
  using (true)
  with check (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current campaign status
create or replace function public.get_crowdfund_status()
returns table (
  pizzas integer,
  backers integer,
  goal integer,
  last_updated timestamptz,
  source text
) as $$
begin
  return query
  select 
    a.pizzas,
    a.backers,
    a.goal,
    a.last_updated,
    'supabase'::text as source
  from public.crowdfund_aggregates a
  where a.id = 'crowdfunding';
end;
$$ language plpgsql stable;

-- Get recent feedback (limit 20)
create or replace function public.get_recent_feedback(limit_count integer default 8)
returns table (
  id uuid,
  name text,
  comment text,
  rating integer,
  created_at timestamptz
) as $$
begin
  return query
  select 
    f.id,
    f.name,
    f.comment,
    f.rating,
    f.created_at
  from public.crowdfund_feedback f
  order by f.created_at_ms desc
  limit least(limit_count, 20);
end;
$$ language plpgsql stable;

-- =====================================================
-- GRANTS (ensure API can access)
-- =====================================================

-- Grant necessary permissions to authenticated and anon roles
grant usage on schema public to anon, authenticated;
grant select, insert on public.crowdfund_pledges to anon, authenticated;
grant select, insert on public.crowdfund_feedback to anon, authenticated;
grant select on public.crowdfund_aggregates to anon, authenticated;

-- Grant execute on functions
grant execute on function public.get_crowdfund_status() to anon, authenticated;
grant execute on function public.get_recent_feedback(integer) to anon, authenticated;

-- Service role gets full access
grant all on public.crowdfund_pledges to service_role;
grant all on public.crowdfund_feedback to service_role;
grant all on public.crowdfund_aggregates to service_role;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

comment on table public.crowdfund_pledges is 'Pizza crowdfunding campaign pledges/orders';
comment on table public.crowdfund_feedback is 'User feedback and testimonials for pizza campaign';
comment on table public.crowdfund_aggregates is 'Campaign totals (single row: pizzas, backers, goal)';
comment on function public.update_crowdfund_aggregates() is 'Auto-increment aggregates when pledge inserted';
comment on function public.get_crowdfund_status() is 'Get current campaign status for /api/pizzafunder/status';
comment on function public.get_recent_feedback(integer) is 'Get recent feedback entries for /api/pizzafunder/feedback';
