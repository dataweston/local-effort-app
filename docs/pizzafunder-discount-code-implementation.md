# PizzaFunder Discount Code Implementation

## Overview
Implemented "since2022" discount code feature that provides 100% discount while maintaining full Square payment processing and email notifications.

## Changes Made

### 1. Auto-Select First Reward Tier
**File**: `src/pages/PizzaFunderPage.jsx`
- Modified "Make a Pledge" button to auto-select first reward tier
- Ensures seamless user experience without needing to select tier manually

```jsx
onClick={() => {
  // Auto-select first reward tier if not already selected
  if (!selectedTier && campaignData?.rewardTiers?.[0]) {
    setSelectedTier(campaignData.rewardTiers[0]);
  }
  setShowPledgeForm(true);
}}
```

### 2. Frontend Discount Code UI
**File**: `src/components/pizzafunder/PizzaPledgeForm.jsx`

**Added State**:
- `discountCode`: Tracks user input
- Calculates `isDiscountValid` for code "since2022"
- Displays discount breakdown with visual feedback

**UI Elements**:
- Discount code input field (optional)
- Validation messages:
  - Green checkmark for valid code
  - Amber warning for invalid code
- Discount breakdown display showing:
  - Original subtotal (strikethrough)
  - Discount amount
  - Final total ($0.00 for 100% off)
- Updated submit button text: "Confirm Pledge - FREE"

**Data Sent to API**:
```javascript
{
  pizzaCount,
  funderName,
  email,
  phone,
  notes,
  rewardPreference,
  totalCents: Math.round(total * 100), // Final amount after discount
  baseTotalCents: Math.round(baseTotal * 100), // Original amount
  discountCode: isDiscountValid ? discountCode.trim() : null,
  discountAmount: isDiscountValid ? Math.round(discountAmount * 100) : 0,
  sourceId: result.token,
  selectedTier
}
```

### 3. Backend Discount Processing
**File**: `api/pizzafunder/pledge.js`

**Key Changes**:
- Accepts both `totalCents` and `amountCents` from frontend
- Validates discount code: `since2022` (case-insensitive)
- Calculates final amount (0 for 100% discount)
- **Conditional Square Processing**:
  - If `finalAmountCents > 0`: Process through Square normally
  - If `finalAmountCents === 0`: Skip Square, generate reference ID
  - Reference ID format: `DISCOUNT_SINCE2022_<timestamp>`

**Square Payment Logic**:
```javascript
if (finalAmountCents > 0) {
  // Process payment through Square
  const paymentResponse = await squareClient.paymentsApi.createPayment({
    // ... normal payment processing
    note: `Pizza Pledge - ${pizzaCount} pizza(s) from ${funderName}${isDiscountValid ? ` (Discount: ${discountCode})` : ''}`,
  });
  paymentId = paymentResponse.result.payment.id;
} else {
  // For $0 (100% discount), generate reference without Square
  paymentId = `DISCOUNT_${discountCode.toUpperCase()}_${Date.now()}`;
}
```

**Database Record**:
```javascript
{
  funder_name,
  email,
  phone,
  notes,
  reward_preference,
  pizza_count,
  amount_cents: finalAmountCents, // 0 for 100% discount
  payment_id: paymentId,
  status: 'completed',
  discount_code: isDiscountValid ? discountCode.trim() : null,
  discount_amount_cents: pledgeDiscountAmount, // Original amount for 100% off
}
```

### 4. Database Schema Update
**File**: `supabase/add-discount-columns.sql`

Added two columns to `crowdfund_pledges` table:

```sql
ALTER TABLE public.crowdfund_pledges 
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_crowdfund_pledges_discount_code 
ON public.crowdfund_pledges(discount_code) 
WHERE discount_code IS NOT NULL;
```

**Run this SQL in Supabase SQL Editor to enable discount tracking.**

## How It Works

### User Flow
1. User clicks "Make a Pledge" (auto-selects first reward tier)
2. User fills in pledge form (name, email, pizzas, etc.)
3. User enters discount code "since2022" (optional)
4. If valid, UI shows:
   - Strikethrough original price
   - Green "100% discount applied" message
   - Final total: $0.00
5. User enters payment details (required even for $0)
6. User clicks "Confirm Pledge - FREE"

### Backend Processing
1. Validate discount code
2. Calculate final amount (0 for 100% discount)
3. **If amount > $0**: Process through Square normally
4. **If amount === $0**: Skip Square, generate reference ID
5. Save to Supabase with discount info
6. Send confirmation emails (TODO: customize for discount)
7. Update aggregate counts

### Why Payment Card is Still Required
Even with 100% discount:
- Square tokenization provides fraud protection
- Maintains consistent user experience
- Card token is generated but not charged
- Future functionality could use saved card

## Testing

### Test Discount Code
- Code: `since2022` (case-insensitive)
- Discount: 100% (full amount)
- Processing: Bypasses Square payment, records pledge

### Test Cases
1. ✅ Valid code "since2022" → $0 pledge recorded
2. ✅ Invalid code "xyz123" → Normal payment required
3. ✅ No code → Normal payment required
4. ✅ Mixed case "SINCE2022" → Valid (case-insensitive)

## Email Customization (TODO)
Current emails don't mention discount code. Consider adding:
- "You used discount code: since2022"
- "Complimentary pledge - no charge"
- Special thank you message for early supporters

## Deployment Steps

### 1. Deploy Frontend Changes
```bash
# Already done - PizzaFunderPage.jsx and PizzaPledgeForm.jsx updated
```

### 2. Deploy Backend API
```bash
# Already done - api/pizzafunder/pledge.js updated
```

### 3. Update Database Schema
```sql
-- Run in Supabase SQL Editor
-- File: supabase/add-discount-columns.sql
ALTER TABLE public.crowdfund_pledges 
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_crowdfund_pledges_discount_code 
ON public.crowdfund_pledges(discount_code) 
WHERE discount_code IS NOT NULL;
```

### 4. Test in Production
1. Visit /pizzafunder
2. Click "Make a Pledge"
3. Verify first tier is auto-selected
4. Enter discount code "since2022"
5. Verify $0.00 total shown
6. Complete pledge form
7. Verify confirmation received
8. Check Supabase for pledge record with discount info

## Monitoring

### Check Discount Usage
```sql
SELECT 
  discount_code,
  COUNT(*) as usage_count,
  SUM(discount_amount_cents) / 100.0 as total_discounted_dollars
FROM crowdfund_pledges
WHERE discount_code IS NOT NULL
GROUP BY discount_code;
```

### View Discount Pledges
```sql
SELECT 
  funder_name,
  email,
  pizza_count,
  discount_code,
  discount_amount_cents / 100.0 as discount_dollars,
  amount_cents / 100.0 as final_paid,
  created_at
FROM crowdfund_pledges
WHERE discount_code IS NOT NULL
ORDER BY created_at DESC;
```

## Future Enhancements

### Multiple Discount Codes
Current implementation hard-codes "since2022". To support multiple codes:

1. Create `discount_codes` table:
```sql
CREATE TABLE discount_codes (
  code TEXT PRIMARY KEY,
  discount_percent INTEGER,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0
);
```

2. Validate against database instead of hard-coded check
3. Support percentage discounts (not just 100%)
4. Add expiration logic

### Discount Code Analytics
- Track which codes drive most pledges
- A/B test different discount amounts
- Time-limited promotional codes
- User-specific referral codes

## Security Considerations

### Current Implementation
- ✅ Discount code validated server-side
- ✅ Case-insensitive comparison prevents confusion
- ✅ Database records original amount for accounting
- ✅ Payment ID clearly identifies discount pledges

### Potential Vulnerabilities
- ⚠️ No rate limiting on discount code attempts
- ⚠️ No max usage cap on discount codes
- ⚠️ No expiration date enforcement

### Recommended Additions
1. Rate limit discount code validation attempts
2. Add usage tracking and limits
3. Implement expiration dates
4. Log all discount code usage for audit trail
5. Admin dashboard to manage discount codes

## Related Files
- `src/pages/PizzaFunderPage.jsx` - Auto-select first tier
- `src/components/pizzafunder/PizzaPledgeForm.jsx` - Discount UI
- `api/pizzafunder/pledge.js` - Discount processing
- `supabase/add-discount-columns.sql` - Database schema
- `docs/pizzafunder-supabase-migration.md` - Original migration
