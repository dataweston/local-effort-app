-- Supabase schema for sale order tracking
-- Run via: supabase db push --file supabase/sales-orders.sql

create schema if not exists sales;

grant usage on schema sales to authenticated;
grant usage on schema sales to anon;

grant usage on schema sales to service_role;

create table if not exists sales.orders (
  id uuid primary key default gen_random_uuid(),
  sale_slug text not null,
  product_id text,
  qty integer not null default 1,
  amount_cents integer not null default 0,
  square_payment_id text unique not null,
  customer_email text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table sales.orders enable row level security;

create index if not exists orders_sale_slug_idx on sales.orders (sale_slug);
create index if not exists orders_created_at_idx on sales.orders (created_at desc);

drop policy if exists "service role full access" on sales.orders;
drop policy if exists "read orders via anon" on sales.orders;

create policy "service role full access" on sales.orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "read orders via anon" on sales.orders
  for select
  using (auth.role() in ('anon', 'authenticated'));

drop view if exists sales.order_totals;

create or replace view sales.order_totals as
select
  sale_slug,
  coalesce(sum(qty), 0)::integer as sold_count,
  coalesce(sum(amount_cents), 0)::bigint as revenue_cents,
  max(created_at) as last_order_at
from sales.orders
group by sale_slug;

grant select on sales.order_totals to anon;
grant select on sales.order_totals to authenticated;
