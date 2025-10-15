-- Add discount code columns to crowdfund_pledges table
-- Run this in Supabase SQL Editor after initial schema setup

ALTER TABLE public.crowdfund_pledges 
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0;

-- Add index for discount code queries
CREATE INDEX IF NOT EXISTS idx_crowdfund_pledges_discount_code 
ON public.crowdfund_pledges(discount_code) 
WHERE discount_code IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.crowdfund_pledges.discount_code IS 'Discount code applied to this pledge (e.g., "since2022")';
COMMENT ON COLUMN public.crowdfund_pledges.discount_amount_cents IS 'Amount discounted in cents (for 100% discount, this equals original amount)';
