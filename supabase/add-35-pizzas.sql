-- Add 35 Pizzas to PizzaFunder Base Number
-- Date: November 5, 2025
--
-- GOAL: Add 35 pizzas to the current base to reach 142 total pizzas
-- Current base: 107 pizzas
-- After update: 142 pizzas (107 + 35)

-- Step 1: Check current state
SELECT
  'Current State' as status,
  pizzas,
  backers,
  goal,
  last_updated
FROM public.crowdfund_aggregates
WHERE id = 'crowdfunding';

-- Step 2: Add 35 pizzas through historical pledge records
-- Adding 35 individual backers with 1 pizza each = 35 pizzas
INSERT INTO public.crowdfund_pledges
  (funder_name, email, pizza_count, amount_cents, payment_id, status, notes, created_at)
VALUES
  ('Historical Backer 18', 'historical18@presupabase.local', 1, 1400, 'PRE_SUPABASE_018', 'completed', 'Additional historical offline sale', '2025-10-18 10:00:00-06'),
  ('Historical Backer 19', 'historical19@presupabase.local', 1, 1400, 'PRE_SUPABASE_019', 'completed', 'Additional historical offline sale', '2025-10-18 11:00:00-06'),
  ('Historical Backer 20', 'historical20@presupabase.local', 1, 1400, 'PRE_SUPABASE_020', 'completed', 'Additional historical offline sale', '2025-10-18 12:00:00-06'),
  ('Historical Backer 21', 'historical21@presupabase.local', 1, 1400, 'PRE_SUPABASE_021', 'completed', 'Additional historical offline sale', '2025-10-18 13:00:00-06'),
  ('Historical Backer 22', 'historical22@presupabase.local', 1, 1400, 'PRE_SUPABASE_022', 'completed', 'Additional historical offline sale', '2025-10-18 14:00:00-06'),
  ('Historical Backer 23', 'historical23@presupabase.local', 1, 1400, 'PRE_SUPABASE_023', 'completed', 'Additional historical offline sale', '2025-10-18 15:00:00-06'),
  ('Historical Backer 24', 'historical24@presupabase.local', 1, 1400, 'PRE_SUPABASE_024', 'completed', 'Additional historical offline sale', '2025-10-18 16:00:00-06'),
  ('Historical Backer 25', 'historical25@presupabase.local', 1, 1400, 'PRE_SUPABASE_025', 'completed', 'Additional historical offline sale', '2025-10-19 10:00:00-06'),
  ('Historical Backer 26', 'historical26@presupabase.local', 1, 1400, 'PRE_SUPABASE_026', 'completed', 'Additional historical offline sale', '2025-10-19 11:00:00-06'),
  ('Historical Backer 27', 'historical27@presupabase.local', 1, 1400, 'PRE_SUPABASE_027', 'completed', 'Additional historical offline sale', '2025-10-19 12:00:00-06'),
  ('Historical Backer 28', 'historical28@presupabase.local', 1, 1400, 'PRE_SUPABASE_028', 'completed', 'Additional historical offline sale', '2025-10-19 13:00:00-06'),
  ('Historical Backer 29', 'historical29@presupabase.local', 1, 1400, 'PRE_SUPABASE_029', 'completed', 'Additional historical offline sale', '2025-10-19 14:00:00-06'),
  ('Historical Backer 30', 'historical30@presupabase.local', 1, 1400, 'PRE_SUPABASE_030', 'completed', 'Additional historical offline sale', '2025-10-19 15:00:00-06'),
  ('Historical Backer 31', 'historical31@presupabase.local', 1, 1400, 'PRE_SUPABASE_031', 'completed', 'Additional historical offline sale', '2025-10-19 16:00:00-06'),
  ('Historical Backer 32', 'historical32@presupabase.local', 1, 1400, 'PRE_SUPABASE_032', 'completed', 'Additional historical offline sale', '2025-10-20 10:00:00-06'),
  ('Historical Backer 33', 'historical33@presupabase.local', 1, 1400, 'PRE_SUPABASE_033', 'completed', 'Additional historical offline sale', '2025-10-20 11:00:00-06'),
  ('Historical Backer 34', 'historical34@presupabase.local', 1, 1400, 'PRE_SUPABASE_034', 'completed', 'Additional historical offline sale', '2025-10-20 12:00:00-06'),
  ('Historical Backer 35', 'historical35@presupabase.local', 1, 1400, 'PRE_SUPABASE_035', 'completed', 'Additional historical offline sale', '2025-10-20 13:00:00-06'),
  ('Historical Backer 36', 'historical36@presupabase.local', 1, 1400, 'PRE_SUPABASE_036', 'completed', 'Additional historical offline sale', '2025-10-20 14:00:00-06'),
  ('Historical Backer 37', 'historical37@presupabase.local', 1, 1400, 'PRE_SUPABASE_037', 'completed', 'Additional historical offline sale', '2025-10-20 15:00:00-06'),
  ('Historical Backer 38', 'historical38@presupabase.local', 1, 1400, 'PRE_SUPABASE_038', 'completed', 'Additional historical offline sale', '2025-10-20 16:00:00-06'),
  ('Historical Backer 39', 'historical39@presupabase.local', 1, 1400, 'PRE_SUPABASE_039', 'completed', 'Additional historical offline sale', '2025-10-21 10:00:00-06'),
  ('Historical Backer 40', 'historical40@presupabase.local', 1, 1400, 'PRE_SUPABASE_040', 'completed', 'Additional historical offline sale', '2025-10-21 11:00:00-06'),
  ('Historical Backer 41', 'historical41@presupabase.local', 1, 1400, 'PRE_SUPABASE_041', 'completed', 'Additional historical offline sale', '2025-10-21 12:00:00-06'),
  ('Historical Backer 42', 'historical42@presupabase.local', 1, 1400, 'PRE_SUPABASE_042', 'completed', 'Additional historical offline sale', '2025-10-21 13:00:00-06'),
  ('Historical Backer 43', 'historical43@presupabase.local', 1, 1400, 'PRE_SUPABASE_043', 'completed', 'Additional historical offline sale', '2025-10-21 14:00:00-06'),
  ('Historical Backer 44', 'historical44@presupabase.local', 1, 1400, 'PRE_SUPABASE_044', 'completed', 'Additional historical offline sale', '2025-10-21 15:00:00-06'),
  ('Historical Backer 45', 'historical45@presupabase.local', 1, 1400, 'PRE_SUPABASE_045', 'completed', 'Additional historical offline sale', '2025-10-21 16:00:00-06'),
  ('Historical Backer 46', 'historical46@presupabase.local', 1, 1400, 'PRE_SUPABASE_046', 'completed', 'Additional historical offline sale', '2025-10-22 10:00:00-06'),
  ('Historical Backer 47', 'historical47@presupabase.local', 1, 1400, 'PRE_SUPABASE_047', 'completed', 'Additional historical offline sale', '2025-10-22 11:00:00-06'),
  ('Historical Backer 48', 'historical48@presupabase.local', 1, 1400, 'PRE_SUPABASE_048', 'completed', 'Additional historical offline sale', '2025-10-22 12:00:00-06'),
  ('Historical Backer 49', 'historical49@presupabase.local', 1, 1400, 'PRE_SUPABASE_049', 'completed', 'Additional historical offline sale', '2025-10-22 13:00:00-06'),
  ('Historical Backer 50', 'historical50@presupabase.local', 1, 1400, 'PRE_SUPABASE_050', 'completed', 'Additional historical offline sale', '2025-10-22 14:00:00-06'),
  ('Historical Backer 51', 'historical51@presupabase.local', 1, 1400, 'PRE_SUPABASE_051', 'completed', 'Additional historical offline sale', '2025-10-22 15:00:00-06'),
  ('Historical Backer 52', 'historical52@presupabase.local', 1, 1400, 'PRE_SUPABASE_052', 'completed', 'Additional historical offline sale', '2025-10-22 16:00:00-06');

-- Total: 35 new backers, 35 additional pizzas (1 pizza each)

-- Step 3: Update aggregates to reflect the new totals
-- The trigger should handle this automatically, but we'll ensure it's correct
UPDATE public.crowdfund_aggregates
SET
  pizzas = (SELECT COALESCE(SUM(pizza_count), 0) FROM public.crowdfund_pledges WHERE status = 'completed'),
  backers = (SELECT COUNT(*) FROM public.crowdfund_pledges WHERE status = 'completed'),
  last_updated = now()
WHERE id = 'crowdfunding';

-- Step 4: Verify the final state (should show 142 pizzas)
SELECT
  'After Adding 35 Pizzas' as status,
  pizzas,
  backers,
  goal,
  last_updated
FROM public.crowdfund_aggregates
WHERE id = 'crowdfunding';

SELECT
  'Verification - All Completed Pledges' as source,
  COUNT(*) as total_backers,
  COALESCE(SUM(pizza_count), 0) as total_pizzas
FROM public.crowdfund_pledges
WHERE status = 'completed';

-- Expected result: 142 pizzas total
