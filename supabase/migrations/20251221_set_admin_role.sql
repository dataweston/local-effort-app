-- Set admin role for dataweston@gmail.com (existing user)
-- This migration updates existing profile and creates trigger for future signups

-- Update existing user to admin (if profile exists)
update public.profiles
set role = 'admin'
where email = 'dataweston@gmail.com';

-- If profile doesn't exist yet, create it
insert into public.profiles (id, email, role)
select 
  au.id,
  au.email,
  'admin'
from auth.users au
where au.email = 'dataweston@gmail.com'
  and not exists (select 1 from public.profiles p where p.id = au.id)
on conflict (id) do nothing;

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case 
      when new.email = 'dataweston@gmail.com' then 'admin'
      else 'user'
    end
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to run on new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

