# PizzaFunder Totals Fix - October 25, 2025

## Problem
The pizza tracker totals were incorrect because we manually set aggregate values instead of accounting for actual pledge records.

## Situation
- **Pre-Supabase sales**: 71 pizzas, 17 backers (offline, not in database)
- **Post-Supabase sales**: 32 pizzas, 6 backers (in `crowdfund_pledges` table)
- **Desired total**: 103 pizzas, 23 backers

## Solution
Insert historical pledge records for the 71 pre-Supabase pizzas and 17 backers. The existing trigger (`trigger_update_aggregates`) will automatically update the `crowdfund_aggregates` table.

## Steps to Fix

### 1. Run the fix SQL
Execute `supabase/fix-pizzafunder-totals.sql` in your Supabase SQL Editor.

This will:
- Insert 17 historical pledge records totaling 71 pizzas
- Recalculate aggregates to include all pledges (historical + current)
- Verify the final totals are correct

### 2. Verify the results
After running the SQL, you should see:
- **Total backers**: 23 (17 historical + 6 current)
- **Total pizzas**: 103 (71 historical + 32 current)

### 3. Confirm trigger still works
The trigger `trigger_update_aggregates` will continue to automatically increment totals when new pledges are added. No changes needed to the application code.

## Why This Approach?

✅ **Maintains data integrity**: Historical sales are tracked in the database  
✅ **Trigger continues to work**: Future pledges auto-update totals  
✅ **Audit trail**: All sales have records in `crowdfund_pledges`  
✅ **Accurate reporting**: Can query actual pledges at any time  

## Alternative (NOT Recommended)
Manually updating aggregates bypasses the pledge system and breaks when new pledges are added. The trigger expects aggregates to be calculated from pledge records.

## Files Modified
- `supabase/fix-pizzafunder-totals.sql` - New file with the fix
- `supabase/set-initial-tracker-values.sql` - Updated with deprecation notice

## Going Forward
Any future historical sales should be added the same way:
1. Insert pledge records with `status = 'completed'`
2. Use `payment_id` like `'OFFLINE_XXX'` or `'HISTORICAL_XXX'`
3. Add note: `'Pre-Supabase offline sale'` or similar
4. The trigger handles the rest automatically
