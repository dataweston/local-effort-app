# PizzaFunder Sales Tracker Setup

## Overview
The pizza sales tracker displays campaign progress on the `/pizzafunder` page. It shows:
- **Pizzas**: Total number of pizzas pledged
- **Backers**: Total number of people who pledged
- **Goal**: Campaign goal (currently 1000 pizzas)

## Initial Values
Starting values set on October 15, 2025:
- **61 pizzas** sold
- **11 backers**
- **Goal**: 1000 pizzas

## How It Works

### 1. Database Storage
The tracker values are stored in the `crowdfund_aggregates` table:

```sql
SELECT * FROM public.crowdfund_aggregates;
```

Result:
```
id            | pizzas | backers | goal | last_updated
crowdfunding  | 61     | 11      | 1000 | 2025-10-15 ...
```

### 2. Automatic Updates
A database trigger automatically updates the tracker when new pledges are inserted:

**Trigger**: `trigger_update_aggregates`
- Fires after each INSERT into `crowdfund_pledges`
- Increments `pizzas` by the pledge's `pizza_count`
- Increments `backers` by 1
- Updates `last_updated` timestamp

**Example**:
```sql
-- Starting values: 61 pizzas, 11 backers

-- User pledges 3 pizzas
INSERT INTO crowdfund_pledges (funder_name, email, pizza_count, amount_cents, payment_id)
VALUES ('John Doe', 'john@example.com', 3, 6000, 'SQUARE_PAYMENT_123');

-- Trigger automatically runs:
-- pizzas: 61 → 64
-- backers: 11 → 12
```

### 3. API Endpoint
The frontend fetches tracker values from:
```
GET /api/pizzafunder/status
```

This endpoint queries:
```sql
SELECT pizzas, backers, goal, last_updated
FROM public.crowdfund_aggregates
WHERE id = 'crowdfunding';
```

Response:
```json
{
  "pizzas": 61,
  "backers": 11,
  "goal": 1000,
  "lastUpdated": "2025-10-15T...",
  "source": "supabase"
}
```

### 4. Frontend Display
The `PizzaFunderPage` component displays the tracker in the hero section:
- Progress bar showing pizzas/goal percentage
- "X pizzas from Y backers" text
- Auto-refreshes after each successful pledge

## Setup Instructions

### Step 1: Run Initial Values SQL
Copy and run this in Supabase SQL Editor:

```sql
UPDATE public.crowdfund_aggregates
SET 
  pizzas = 61,
  backers = 11,
  last_updated = now()
WHERE id = 'crowdfunding';
```

Or use the pre-made file:
```bash
# File: supabase/set-initial-tracker-values.sql
```

### Step 2: Verify Values
Check the values were set correctly:

```sql
SELECT 
  pizzas,
  backers,
  goal,
  last_updated
FROM public.crowdfund_aggregates
WHERE id = 'crowdfunding';
```

Expected result:
```
pizzas | backers | goal | last_updated
61     | 11      | 1000 | 2025-10-15 ...
```

### Step 3: Test Auto-Update
Make a test pledge to verify auto-increment works:

1. Go to `/pizzafunder` on your site
2. Click "Make a Pledge"
3. Fill out the form and submit
4. Check the tracker updates automatically

### Step 4: Verify in Database
After test pledge, run:

```sql
SELECT 
  pizzas,
  backers,
  (SELECT COUNT(*) FROM crowdfund_pledges) as total_pledges
FROM public.crowdfund_aggregates
WHERE id = 'crowdfunding';
```

If you pledged 2 pizzas, you should see:
```
pizzas | backers | total_pledges
63     | 12      | 1
```

## Monitoring

### Check Current Status
```sql
SELECT * FROM public.get_crowdfund_status();
```

### View All Pledges
```sql
SELECT 
  funder_name,
  pizza_count,
  amount_cents / 100.0 as amount_dollars,
  created_at
FROM public.crowdfund_pledges
ORDER BY created_at DESC;
```

### Calculate Totals Manually
Verify aggregates match actual data:

```sql
SELECT 
  SUM(pizza_count) as total_pizzas,
  COUNT(*) as total_backers
FROM public.crowdfund_pledges;
```

This should match the aggregates table (plus initial offset of 61 pizzas, 11 backers).

### Daily Sales Report
```sql
SELECT 
  DATE(created_at) as date,
  SUM(pizza_count) as pizzas_sold,
  COUNT(*) as new_backers,
  SUM(amount_cents) / 100.0 as revenue_dollars
FROM public.crowdfund_pledges
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Troubleshooting

### Problem: Tracker Not Updating
**Check 1**: Verify trigger exists
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_aggregates';
```

Expected: One row showing the trigger on `crowdfund_pledges`

**Check 2**: Test trigger manually
```sql
-- Insert test pledge
INSERT INTO crowdfund_pledges (
  funder_name, email, pizza_count, amount_cents, payment_id, status
) VALUES (
  'Test User', 'test@example.com', 1, 2000, 'TEST_123', 'completed'
);

-- Check if aggregates updated
SELECT pizzas, backers FROM crowdfund_aggregates WHERE id = 'crowdfunding';

-- Delete test pledge
DELETE FROM crowdfund_pledges WHERE payment_id = 'TEST_123';
```

**Check 3**: Verify RLS policies allow reads
```sql
-- Should return data (not empty)
SELECT * FROM crowdfund_aggregates;
```

### Problem: Tracker Shows Wrong Initial Values
**Solution**: Re-run the initial values SQL

```sql
-- Reset to 61 pizzas, 11 backers
UPDATE public.crowdfund_aggregates
SET 
  pizzas = 61,
  backers = 11,
  last_updated = now()
WHERE id = 'crowdfunding';
```

### Problem: Need to Adjust Values
**Scenario**: Manual adjustment needed (e.g., refund, correction)

```sql
-- Subtract 2 pizzas and 1 backer (for a refund)
UPDATE public.crowdfund_aggregates
SET 
  pizzas = pizzas - 2,
  backers = backers - 1,
  last_updated = now()
WHERE id = 'crowdfunding';
```

## Manual Override

If you need to set specific values at any time:

```sql
UPDATE public.crowdfund_aggregates
SET 
  pizzas = [YOUR_VALUE],
  backers = [YOUR_VALUE],
  last_updated = now()
WHERE id = 'crowdfunding';
```

Example - set to 100 pizzas, 25 backers:
```sql
UPDATE public.crowdfund_aggregates
SET 
  pizzas = 100,
  backers = 25,
  last_updated = now()
WHERE id = 'crowdfunding';
```

## Understanding the Initial Offset

The initial values (61 pizzas, 11 backers) represent pre-existing sales before the Supabase migration. This means:

1. **Old Sales (before migration)**: 61 pizzas from 11 backers
2. **New Sales (in Supabase)**: Tracked in `crowdfund_pledges` table
3. **Total Displayed**: 61 + new sales

### Example Timeline
```
Oct 15, 2025 - 10:00 AM
- Set initial values: 61 pizzas, 11 backers
- Database pledges table: empty

Oct 15, 2025 - 10:30 AM
- User A pledges 2 pizzas
- Tracker shows: 63 pizzas, 12 backers
- Database pledges table: 1 row (2 pizzas)

Oct 15, 2025 - 11:00 AM
- User B pledges 5 pizzas
- Tracker shows: 68 pizzas, 13 backers
- Database pledges table: 2 rows (7 pizzas total)

Total pizzas shown: 61 (initial) + 7 (new) = 68 ✓
Total backers shown: 11 (initial) + 2 (new) = 13 ✓
```

## Related Files
- `supabase/pizzafunder-schema.sql` - Full database schema with trigger
- `supabase/set-initial-tracker-values.sql` - SQL to set starting values
- `api/pizzafunder/status.js` - API endpoint that returns tracker values
- `api/pizzafunder/pledge.js` - Creates new pledges (triggers auto-update)
- `src/pages/PizzaFunderPage.jsx` - Displays tracker on frontend

## Support

If tracker values seem incorrect:
1. Check current values in database
2. Compare with actual pledge count
3. Manually recalculate if needed
4. Contact admin if persistent issues

For audit trail of all changes:
```sql
SELECT 
  funder_name,
  pizza_count,
  created_at,
  payment_id
FROM crowdfund_pledges
ORDER BY created_at;
```
