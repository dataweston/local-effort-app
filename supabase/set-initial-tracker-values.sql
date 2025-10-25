-- Set initial pizza sales tracker values
-- Run this in Supabase SQL Editor to set starting values
-- All new pledges will automatically increment from these values

-- Update the crowdfund_aggregates table with starting values
UPDATE public.crowdfund_aggregates
SET 
  pizzas = 71,
  backers = 17,
  last_updated = now()
WHERE id = 'crowdfunding';

-- Verify the update
SELECT 
  pizzas,
  backers,
  goal,
  last_updated
FROM public.crowdfund_aggregates
WHERE id = 'crowdfunding';

-- =====================================================
-- NOTES
-- =====================================================
-- Starting values: 71 pizzas, 17 backers
-- The trigger 'trigger_update_aggregates' will automatically
-- increment these values when new pledges are inserted
-- 
-- For example, if someone pledges 3 pizzas:
--   pizzas: 71 → 74
--   backers: 17 → 18
-- =====================================================
