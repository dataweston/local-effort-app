# Fix Credit Double-Counting Bug

## Problem Summary

The credit calculator had a **double-counting bug** where credits were applied twice when marking orders as paid:

1. The `mark_happymonday_order_paid` function manually updated the balance
2. Then it created a payment record
3. The payment trigger automatically updated the balance again

**Result:** If you had $1500 credit and marked a $500 order as paid, the system would deduct $1000 instead of $500.

## What Was Fixed

Modified the `mark_happymonday_order_paid` function in:
- `supabase/migrations/20250122_happymonday_enhancements.sql`

The fix removes the manual balance update (lines 117-120 were removed) so only the payment trigger handles the balance update.

## Step 1: Check Current State

Run this diagnostic query in your **Supabase SQL Editor** to see if double-counting has occurred:

```sql
-- Copy and paste from: scripts/check-happymonday-credit-balance.sql
```

Or manually run this query:

```sql
-- Get Happy Monday client info
SELECT
  u.email,
  c.balance_cents / 100.0 as current_balance_dollars,
  c.opening_credit_cents / 100.0 as opening_credit_dollars,
  CASE
    WHEN c.balance_cents < 0 THEN 'Credit Available: $' || ABS(c.balance_cents / 100.0)
    WHEN c.balance_cents > 0 THEN 'Amount Owed: $' || (c.balance_cents / 100.0)
    ELSE 'Zero Balance'
  END as balance_status
FROM happymonday_users u
JOIN happymonday_credits c ON c.user_id = u.id
WHERE u.email = 'hello@happymonday.company';

-- Show all orders
SELECT
  order_number,
  order_date,
  status,
  total_cents / 100.0 as amount_dollars,
  created_at
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY order_date, created_at;

-- Show all payments
SELECT
  created_at,
  payment_type,
  amount_cents / 100.0 as amount_dollars,
  notes
FROM happymonday_payments p
JOIN happymonday_users u ON p.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY created_at;

-- Calculate what the balance SHOULD be
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT
  'Opening Credit' as line_item,
  -1500.00 as amount_dollars
UNION ALL
SELECT
  'Total Orders',
  SUM(total_cents) / 100.0
FROM happymonday_orders
WHERE user_id = (SELECT id FROM client)
UNION ALL
SELECT
  'Total Payments',
  -SUM(amount_cents) / 100.0
FROM happymonday_payments
WHERE user_id = (SELECT id FROM client)
UNION ALL
SELECT
  'CORRECT BALANCE',
  -1500.00 + COALESCE(SUM(o.total_cents), 0) / 100.0 - COALESCE(SUM(p.amount_cents), 0) / 100.0
FROM client c
LEFT JOIN happymonday_orders o ON o.user_id = c.id
LEFT JOIN happymonday_payments p ON p.user_id = c.id;
```

## Step 2: Apply the Fix

Run the migration in your **Supabase SQL Editor**:

```sql
-- Copy and paste from: supabase/migrations/20250208_fix_credit_double_counting.sql
```

This will update the `mark_happymonday_order_paid` function to prevent future double-counting.

## Step 3: Fix Existing Data (If Needed)

If Step 1 showed a discrepancy between the current balance and what it should be, run this to recalculate:

```sql
DO $$
DECLARE
  v_client_id uuid;
  v_opening_credit integer := 150000; -- $1500 opening credit
  v_total_orders integer;
  v_total_payments integer;
  v_correct_balance integer;
  v_current_balance integer;
BEGIN
  -- Get Happy Monday client ID
  SELECT id INTO v_client_id FROM public.happymonday_users
  WHERE email = 'hello@happymonday.company';

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Happy Monday client not found';
  END IF;

  -- Get current balance
  SELECT balance_cents INTO v_current_balance
  FROM public.happymonday_credits
  WHERE user_id = v_client_id;

  -- Calculate total from all orders created by client
  SELECT COALESCE(SUM(total_cents), 0) INTO v_total_orders
  FROM public.happymonday_orders
  WHERE user_id = v_client_id;

  -- Calculate total payments (negative amounts are credits applied)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_payments
  FROM public.happymonday_payments
  WHERE user_id = v_client_id;

  -- Calculate correct balance
  -- Formula: -$1500 (opening credit) + orders - payments
  v_correct_balance := -v_opening_credit + v_total_orders - v_total_payments;

  -- Show the calculation
  RAISE NOTICE '=== Credit Balance Recalculation ===';
  RAISE NOTICE 'Opening credit: -$%', (v_opening_credit / 100.0);
  RAISE NOTICE 'Total orders: +$%', (v_total_orders / 100.0);
  RAISE NOTICE 'Total payments: -$%', (v_total_payments / 100.0);
  RAISE NOTICE '';
  RAISE NOTICE 'Current (wrong) balance: $%', (v_current_balance / 100.0);
  RAISE NOTICE 'Correct balance should be: $%', (v_correct_balance / 100.0);
  RAISE NOTICE 'Difference: $%', ((v_current_balance - v_correct_balance) / 100.0);
  RAISE NOTICE '';

  -- Update the credit balance
  UPDATE public.happymonday_credits
  SET balance_cents = v_correct_balance,
      updated_at = now()
  WHERE user_id = v_client_id;

  RAISE NOTICE 'Balance updated successfully!';
  RAISE NOTICE 'New balance: $%', (v_correct_balance / 100.0);
  RAISE NOTICE 'Balance type: %',
    CASE
      WHEN v_correct_balance < 0 THEN 'Credit Available: $' || ABS(v_correct_balance / 100.0)
      WHEN v_correct_balance > 0 THEN 'Amount Owed: $' || (v_correct_balance / 100.0)
      ELSE 'Zero Balance'
    END;
END $$;
```

## Step 4: Verify the Fix

After applying the fix and recalculating (if needed), verify everything is correct:

1. Run the diagnostic query from Step 1 again
2. The "Difference" should now be $0.00
3. Log into the portal at `/partners/happy-monday`
4. Check that the displayed balance matches your calculations

## Understanding the Balance System

- **Negative balance** = credit available (e.g., -$750 means $750 credit remaining)
- **Positive balance** = amount owed (e.g., $250 means customer owes $250)
- **Zero** = all settled

### Formula:
```
balance = -$1500 (opening credit) + orders - payments

Example:
-$1500 + $800 (orders) - (-$100 credit applied) = -$800 remaining credit
```

## Common Scenarios

### Scenario 1: Started with $1500 credit, created $750 in orders, marked them as paid
**Expected balance:** -$750 (still have $750 credit left)
**If double-counted:** $0 (incorrectly shows all credit used)

### Scenario 2: Started with $1500 credit, created $2000 in orders
**Expected balance:** +$500 (owe $500)
**If double-counted:** +$1000 (incorrectly shows owing more)

## Need Help?

If you're seeing unexpected results:
1. Share the output from Step 1 (the diagnostic query)
2. Let me know which scenario matches your situation
3. I can help debug further

---

**Note:** This fix prevents future double-counting. Any past orders that were already marked as paid may have been affected and should be checked.
