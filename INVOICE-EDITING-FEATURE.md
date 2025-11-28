# Invoice Editing & Credit Feature for Happy Monday Portal

## Overview
Added the ability for admins to edit unpaid invoices and for both admins and customers to use negative quantities to give/receive credit on the partners/happy-monday page.

## Changes Made

### 1. Database Changes
**File:** `supabase/migrations/20250122_add_invoice_editing.sql`

Created a new PostgreSQL function `update_happymonday_order()` that:
- Allows editing unpaid, unclosed invoices
- Updates items, total, notes, and order date
- Supports negative quantities for credit entries (e.g., -3 sandwiches = $15.30 credit)
- Automatically adjusts customer credit balance when totals change
- Prevents editing of paid, closed, or refunded orders
- Tracks all changes via the existing order history audit system

**To Apply:** Run this SQL in Supabase SQL Editor:
```sql
-- Copy and paste the contents of supabase/migrations/20250122_add_invoice_editing.sql
```

### 2. Client-Side Function
**File:** `src/partners/happymonday/supabaseClient.js`

Added `updateOrder()` function that calls the database RPC function with proper parameters.

### 3. UI Changes
**File:** `src/partners/happymonday/App.jsx`

**A) Invoice Editing Interface (Admin Only):**
- **"Edit Invoice" button** - Shows for admin users on unpaid, unclosed invoices
- **Edit mode UI** with:
  - Date picker to change order date
  - Current items list with +/- buttons (allows negative quantities)
  - "Add More Items" section to add new items
  - Notes editor
  - Real-time total calculation (shows in red if negative/credit)
  - Clear instructions about using negative quantities for credits
- **Save/Cancel buttons** - Save commits changes, Cancel returns to view mode

**B) New Order Interface (Both Admin & Customer):**
- **Negative quantity support** - Both users can now use negative quantities when creating orders
- **Visual indicators** - Negative quantities and totals show in red
- **Help text** - Blue info box explains how to use negative quantities for credit
- **Order summary** - Shows "Credit amount" label when total is negative

## How to Use

### For Customers: Creating Orders with Credits

1. Navigate to **New Order** tab
2. Add items as normal using the + button
3. To receive credit (for returns, damages, etc.):
   - Click the **minus (-)** button to go into negative quantities
   - Negative items show in **red**
   - Example: -3 sandwiches = -$15.30 credit
4. Review your order summary:
   - Negative line items show in red
   - Total can be negative (you receive credit)
   - "Credit amount" label appears for negative totals
5. Add notes if needed, confirm, and submit
6. Your credit balance updates automatically

### For Admins: Editing an Invoice

1. Navigate to **Past Orders** tab
2. Click on an **unpaid invoice** to view details
3. Click **"Edit Invoice"** button (only visible for unpaid, unclosed orders)
4. Make changes:
   - Adjust quantities using +/- buttons
   - Use negative quantities to give credit (e.g., -3 items)
   - Add new items from the "Add More Items" section
   - Update notes or order date as needed
5. Review the new total (negative = credit)
6. Click **"Save Changes"** to apply edits
7. The system automatically updates:
   - The invoice items and total
   - Customer credit balance (if applicable)
   - Order history audit log

### For Admins: Creating Orders with Credits

Same as customer process above - use the **New Order** tab and negative quantities to give instant credit.

### Example Credit Scenarios

**Scenario 1: Customer Returns Damaged Items**
- Customer creates new order with -2 damaged sandwiches
- Add: -2 Egg Salad Sandwiches @ $5.10 = -$10.20
- Submit order with negative total
- Customer receives $10.20 credit immediately
- Shows as reduced balance in their account

**Scenario 2: Admin Edits Invoice for Partial Credit**
- Original invoice: 10 sandwiches = $51.00
- Customer received 2 damaged sandwiches
- Admin edits invoice: Change quantity from 10 to 8
- New total: $40.80 (automatically adjusted)
- Customer credit balance updated by $10.20

**Scenario 3: Pure Credit Invoice (Promotional)**
- Admin creates new order with negative quantities
- Add: -5 sandwiches @ $5.10 = -$25.50
- Customer receives $25.50 credit
- Shows as negative balance in their account

**Scenario 4: Mixed Invoice (Order + Credit)**
- Customer orders: 10 sandwiches = $51.00
- Customer adds return credit: -2 sandwiches = -$10.20
- Net total: $40.80
- Single invoice handles both charge and credit

## Technical Details

### Database Function Logic
```sql
-- Updates unpaid orders only
-- Calculates difference between old and new total
-- Adjusts customer credit balance accordingly
-- Prevents editing of closed/paid/refunded orders
```

### Credit Balance Impact
- **Positive quantities:** Increase customer balance (money owed)
- **Negative quantities:** Decrease customer balance (credit given)
- Changes are reflected immediately in credit balance display
- All adjustments are audited in `happymonday_order_history` table

### Security
- Only admin users can edit invoices
- RLS policies enforce admin-only access
- Order history tracks all changes with timestamps
- Closed orders cannot be edited (prevents tampering with paid invoices)

## Testing Checklist

- [x] Admin can see "Edit Invoice" button on unpaid orders
- [x] Client users cannot see edit button
- [x] Edit mode shows current invoice items
- [x] Can add/remove items and adjust quantities
- [x] Negative quantities are allowed and shown in red
- [x] Total calculates correctly including negative items
- [x] Save updates invoice and credit balance
- [x] Cancel returns to view mode without changes
- [x] Cannot edit paid or closed orders
- [x] Order history tracks all edits

## Files Changed

1. `supabase/migrations/20250122_add_invoice_editing.sql` - New database function
2. `src/partners/happymonday/supabaseClient.js` - Added updateOrder function
3. `src/partners/happymonday/App.jsx` - Added edit UI and state management

## Migration Instructions

Run the SQL migration in Supabase:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250122_add_invoice_editing.sql`
3. Paste and execute
4. Verify function created: `public.update_happymonday_order()`

The feature will be available immediately after migration.
