# 🍕 PizzaFunder Tracker - Quick Reference

## Set Initial Values (Run Once)

```sql
UPDATE public.crowdfund_aggregates
SET 
  pizzas = 61,
  backers = 11,
  last_updated = now()
WHERE id = 'crowdfunding';
```

## Check Current Values

```sql
SELECT pizzas, backers, goal FROM public.crowdfund_aggregates WHERE id = 'crowdfunding';
```

## How Auto-Update Works

1. User submits pledge on `/pizzafunder`
2. Frontend calls `POST /api/pizzafunder/pledge`
3. Backend inserts row into `crowdfund_pledges` table
4. **Trigger automatically runs** → updates aggregates
5. Frontend refreshes status from `GET /api/pizzafunder/status`

## File to Run

**File**: `supabase/set-initial-tracker-values.sql`

Copy the SQL above and paste it into:
**Supabase Dashboard → SQL Editor → New Query → Run**

## Verify It Worked

After running the SQL, visit:
```
https://www.localeffortfood.com/pizzafunder
```

The tracker should show:
- **61 pizzas**
- **11 backers**
- Progress bar at ~6% (61/1000)

## Test Auto-Update

1. Make a test pledge for 2 pizzas
2. Check tracker updates to: **63 pizzas, 12 backers**
3. Verify in database:

```sql
SELECT 
  pizzas,
  backers,
  (SELECT COUNT(*) FROM crowdfund_pledges) as db_pledges
FROM crowdfund_aggregates 
WHERE id = 'crowdfunding';
```

Expected:
```
pizzas: 63
backers: 12
db_pledges: 1
```

## Done! ✅

New pledges will automatically increment from 61 pizzas and 11 backers.
