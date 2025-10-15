-- Quick update: Set tracker to 61 pizzas, 11 backers
UPDATE public.crowdfund_aggregates
SET pizzas = 61, backers = 11, last_updated = now()
WHERE id = 'crowdfunding';

-- Verify
SELECT pizzas, backers, goal FROM public.crowdfund_aggregates WHERE id = 'crowdfunding';
