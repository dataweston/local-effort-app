# Date Display Fix for Happy Monday Portal

## Problem
Invoice dates were displaying incorrectly - showing a different date than what was set. This was caused by timezone conversion issues when JavaScript's `Date` object parsed date strings.

## Root Cause
When using `new Date(dateString).toLocaleDateString()`, JavaScript interprets the date string as UTC and then converts it to the local timezone, which can shift the date by +/- 1 day depending on your timezone.

Example:
- Database stores: `2025-01-15`
- JavaScript parses as: `2025-01-15T00:00:00Z` (UTC midnight)
- Converts to local (EST): `2025-01-14T19:00:00` (previous day, 7pm)
- Displays: `1/14/2025` ❌ (wrong day)

## Solution
Created a `formatDate()` helper function that parses dates as local dates instead of UTC, preventing timezone shifts.

```javascript
const formatDate = (dateString) => {
  if (!dateString) return '';
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
};
```

This ensures:
- Database: `2025-01-15`
- Parses as: Local date January 15, 2025
- Displays: `1/15/2025` ✅ (correct day)

## Changes Made

**File:** `src/partners/happymonday/App.jsx`

1. **Added formatDate helper** (line 17-23)
   - Parses date strings as local dates
   - Prevents timezone conversion issues

2. **Updated date displays** (3 locations):
   - Past Orders list: `formatDate(order.order_date)` (line 887)
   - Invoice detail view: `formatDate(selectedInvoice.order_date)` (line 980)
   - Print invoice: `formatDate(invoice.order_date)` (line 506)

3. **Normalized edit mode date** (line 229)
   - Extracts `YYYY-MM-DD` portion for date input field
   - Ensures date picker shows correct value

## Testing
To verify the fix works:

1. Create an invoice with today's date
2. View it in Past Orders - should show today's date
3. Open invoice details - should show today's date
4. Edit the invoice - date picker should show today's date
5. Print invoice - should show today's date

All dates should now match exactly what was entered, regardless of your timezone.

## Technical Notes

### Why Not Use UTC Everywhere?
While we could standardize on UTC throughout, date inputs (`<input type="date">`) work with local dates, and users think in terms of local dates. The fix ensures consistency between what users enter and what they see.

### Database Storage
PostgreSQL's `date` type stores dates without timezone info, which is correct for this use case. The issue was purely in the JavaScript display layer.

### Alternative Solutions Considered
1. **Store as timestamps with timezone** - Overkill for date-only fields
2. **Use moment.js or date-fns** - Adds dependency for a simple fix
3. **Format on backend** - Would require API changes

The chosen solution is lightweight, doesn't require dependencies, and fixes the issue at the display layer where it occurs.
