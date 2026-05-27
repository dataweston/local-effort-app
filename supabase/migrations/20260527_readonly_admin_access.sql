-- Read-only consultant access.
-- Grants Zach admin-level visibility while keeping writes limited to full admins.

do $$
begin
  if to_regclass('public.happymonday_users') is not null then
    execute 'alter table public.happymonday_users drop constraint if exists happymonday_users_role_check';
    execute 'alter table public.happymonday_users add constraint happymonday_users_role_check check (role in (''admin'', ''client'', ''readonly_admin''))';

    execute '
      insert into public.happymonday_users (email, role, name)
      values (''hurdlezachary@gmail.com'', ''readonly_admin'', ''Zach Hurdle'')
      on conflict (email) do update
      set role = ''readonly_admin'',
          name = excluded.name,
          updated_at = now()
    ';

    execute 'drop policy if exists "Admins can view all users" on public.happymonday_users';
    execute '
      create policy "Admins can view all users"
        on public.happymonday_users for select
        using (
          exists (
            select 1 from public.happymonday_users
            where email = auth.jwt() ->> ''email''
              and role in (''admin'', ''readonly_admin'')
          )
        )
    ';

    if to_regclass('public.happymonday_credits') is not null then
      execute 'drop policy if exists "Admins can view all credits" on public.happymonday_credits';
      execute '
        create policy "Admins can view all credits"
          on public.happymonday_credits for select
          using (
            exists (
              select 1 from public.happymonday_users
              where email = auth.jwt() ->> ''email''
                and role in (''admin'', ''readonly_admin'')
            )
          )
      ';
    end if;

    if to_regclass('public.happymonday_orders') is not null then
      execute 'drop policy if exists "Admins can view all orders" on public.happymonday_orders';
      execute '
        create policy "Admins can view all orders"
          on public.happymonday_orders for select
          using (
            exists (
              select 1 from public.happymonday_users
              where email = auth.jwt() ->> ''email''
                and role in (''admin'', ''readonly_admin'')
            )
          )
      ';
    end if;

    if to_regclass('public.happymonday_payments') is not null then
      execute 'drop policy if exists "Admins can view all payments" on public.happymonday_payments';
      execute '
        create policy "Admins can view all payments"
          on public.happymonday_payments for select
          using (
            exists (
              select 1 from public.happymonday_users
              where email = auth.jwt() ->> ''email''
                and role in (''admin'', ''readonly_admin'')
            )
          )
      ';
    end if;

    if to_regclass('public.happymonday_costing') is not null then
      execute 'drop policy if exists "Admins can view costing" on public.happymonday_costing';
      execute '
        create policy "Admins can view costing"
          on public.happymonday_costing for select
          using (
            exists (
              select 1 from public.happymonday_users
              where email = auth.jwt() ->> ''email''
                and role in (''admin'', ''readonly_admin'')
            )
          )
      ';
    end if;
  else
    raise notice 'happymonday tables are not present; skipping Happy Monday read-only grants.';
  end if;

  if to_regclass('public.weekly_order_users') is not null then
    begin
      execute '
        insert into public.weekly_order_users (email, role)
        values (''hurdlezachary@gmail.com'', ''readonly_admin'')
        on conflict (email) do update
        set role = excluded.role
      ';
    exception when others then
      raise notice 'weekly_order_users read-only grant skipped: %', sqlerrm;
    end;
  end if;
end $$;
