# Fix Supabase RLS Policies for PizzaFunder

## Issue
The pledges table has RLS enabled but doesn't allow anonymous INSERT, so the API returns permission errors.

## Solution

### Option 1: Run the Fix Script (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase/fix-rls-policies.sql`
3. Click "Run"

This will:
- Drop the restrictive policy
- Add two new policies: one for SELECT, one for INSERT
- Grant INSERT permission to anonymous users
- Show you the current policies to verify

### Option 2: Manual Fix
Run these commands in Supabase SQL Editor:

```sql
-- Drop old policy
drop policy if exists "Public can view pledge count" on public.crowdfund_pledges;

-- Add new policies
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

-- Grant permissions
grant select, insert on public.crowdfund_pledges to anon, authenticated;
```

## Verify It Works

After running the fix:

1. **Test Status API:**
   ```bash
   curl https://www.localeffortfood.com/api/pizzafunder/status
   ```
   Should return: `{"pizzas":0,"backers":0,"goal":1000,"source":"supabase"}`

2. **Test Feedback API:**
   ```bash
   curl https://www.localeffortfood.com/api/pizzafunder/feedback
   ```
   Should return: `{"feedback":[]}`

3. **Test Pledge (on website):**
   - Go to `/pizzafunder`
   - Try to make a pledge with Square test card
   - Should work without permission errors

## What Changed

**Before:**
- Policy: "Public can view pledge count" (SELECT only)
- Anonymous users could NOT insert pledges
- API would get permission denied from Supabase

**After:**
- Policy: "Public can view pledges" (SELECT)
- Policy: "Public can insert pledges" (INSERT)
- Anonymous users CAN insert pledges
- API works correctly

## API Endpoints Now Using Supabase

All three endpoints have been switched to Supabase:
- ✅ `/api/pizzafunder/status.js` - Uses Supabase
- ✅ `/api/pizzafunder/pledge.js` - Uses Supabase  
- ✅ `/api/pizzafunder/feedback.js` - Uses Supabase

Firebase versions backed up as `*-firebase-backup.js` files.
