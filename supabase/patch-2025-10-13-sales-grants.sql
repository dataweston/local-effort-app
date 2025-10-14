-- Patch: ensure service_role has necessary privileges on the sales schema objects
-- Apply via Supabase SQL editor or CLI.

-- Ensure API can SELECT from the aggregate view with service_role
grant select on sales.order_totals to service_role;

-- Ensure service_role can read/write orders (PostgREST checks object privileges even with RLS)
grant select, insert, update, delete on sales.orders to service_role;
