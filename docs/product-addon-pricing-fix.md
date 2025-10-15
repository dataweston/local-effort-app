# Product Add-On Pricing Fix (CORRECTED)

**Date:** October 15, 2024  
**Issue:** Pizza topping add-ons showing as hundreds of dollars (e.g., $300 instead of $3.00)  
**Updated:** Reverted incorrect fix after discovering all prices already in cents
**Files Modified:** `api/store/products.js`, `src/store/components/ProductCard.jsx`

## Problem Description

Add-ons for products on `/happy-monday` and `/tiny-diner` pages were displaying prices 100x too high:
- Expected: `+$3.00` for extra toppings
- Actual: `+$300.00` 

## Root Cause (CORRECTED UNDERSTANDING)

**IMPORTANT DISCOVERY**: The `PriceUsdInput` component in Sanity Studio **already stores ALL prices in cents**.

### How PriceUsdInput Works

From `studio/components/PriceUsdInput.jsx`:
```javascript
// Displays cents as dollars
const toDisplay = (v) => (typeof v === 'number' ? (v / 100).toFixed(2) : '')

// Stores dollars as cents
const cents = Math.round(num * 100)
onChange(set(cents))
```

**What this means:**
- User enters `$13.00` in Sanity Studio
- PriceUsdInput stores `1300` (cents) in the database
- When reading, it displays `1300 / 100 = $13.00`

### Which Fields Use PriceUsdInput?

From `studio/schemaTypes/product.js`:
```javascript
// Main price - USES PriceUsdInput (stored in cents)
{ name: 'price', components: { input: PriceUsdInput } }

// Sale price - USES PriceUsdInput (stored in cents)
{ name: 'salePrice', components: { input: PriceUsdInput } }

// Add-on cost - USES PriceUsdInput (stored in cents)
{ name: 'additionalCost', components: { input: PriceUsdInput } }

// Dairy-free cost - USES PriceUsdInput (stored in cents)
{ name: 'dairyFreeCost', components: { input: PriceUsdInput } }

// Variant prices - ALSO stored in cents (same pattern)
```

**Conclusion:** ALL prices in Sanity are stored in cents, not dollars!

## The Actual Bug

The original bug was NOT about currency conversion. It was about incorrect field access:

### Wrong Code (Original Bug)
```javascript
// Trying to multiply cents by 100 AGAIN
const price = basePrice + (addOnsTotal * 100) + (dairyFreePrice * 100);
```

This caused:
- basePrice: `1300` cents ($13.00) ✅ Correct
- addOnsTotal: `300` cents ($3.00)
- Multiplied: `300 * 100 = 30000` cents = $300.00 ❌ Wrong!
- Total: `1300 + 30000 = 31300` cents = $313.00 ❌ Wrong!

## Solution (CORRECTED)

### Fix 1: Remove Double Multiplication

**API - No Conversion Needed:**
```javascript
// BEFORE (WRONG - was converting cents to cents*100)
price: Math.round((d.price ?? 0) * 100),
addOns: d.addOns.map(a => ({
  ...a,
  additionalCost: Math.round((a.additionalCost ?? 0) * 100)
}))

// AFTER (CORRECT - pass through cents as-is)
price: d.price ?? 0,  // Already in cents from Sanity
addOns: d.addOns // Already in cents from Sanity
```

**ProductCard - Keep Division by 100:**
```javascript
// Display (converts cents to dollars for UI)
{addon.additionalCost > 0 ? `+$${(addon.additionalCost / 100).toFixed(2)}` : 'Free'}

// Calculation (all values in cents, no conversion needed)
const price = basePrice + addOnsTotal + dairyFreePrice;
```

## Data Flow (CORRECTED)

### Correct Flow
1. **Sanity Studio**: User enters `$3.00`
2. **PriceUsdInput**: Stores `300` (cents)
3. **Sanity Database**: Contains `300` (cents)
4. **API**: Passes through `300` (cents) unchanged
5. **ProductCard calculation**: `300` (cents)
6. **ProductCard display**: `300 / 100 = $3.00` ✅

### What Was Wrong
1. Sanity Database: `300` cents ✅
2. API: `300 * 100 = 30000` cents ❌ (WRONG - removed this)
3. ProductCard calculation: `30000` cents
4. ProductCard display: `30000 / 100 = $300.00` ❌

## Testing Checklist

- [x] Verify base product prices display correctly (e.g., $13.00, not $1300.00)
- [x] Verify add-on prices display correctly (e.g., +$3.00, not +$300.00)  
- [x] Verify dairy-free option prices display correctly
- [ ] Test total price calculation with multiple add-ons
- [ ] Test total price with add-ons + dairy-free option
- [ ] Verify sale prices work correctly
- [ ] Test variant prices
- [ ] Add item to cart and verify price is correct
- [ ] Check checkout panel shows correct unit prices
- [ ] Verify Square payment sends correct amounts (cents)

## Prevention

### Future Sanity Schema Changes

If updating the product schema, maintain consistency:

**Option A: Keep Dollars in Sanity (Current)**
- ✅ Sanity stores dollars
- ✅ API converts to cents
- ✅ Frontend uses cents everywhere

**Option B: Switch to Cents in Sanity**
- Change schema descriptions to "Enter cents"
- Remove `PriceUsdInput` component
- Remove API conversion
- Update all existing products (migration needed!)

**Recommendation:** Stick with Option A. It's more user-friendly in Sanity.

### Code Review Checklist

When working with prices:
1. ✅ Check what unit the value is in (dollars or cents)
2. ✅ Verify conversion happens exactly once
3. ✅ Use consistent units within each layer (API → cents, Sanity → dollars)
4. ✅ Add comments clarifying units: `// All prices in cents`
5. ✅ Use `Math.round()` when converting to avoid floating point issues

## Related Files

- `api/store/products.js` - Product API with dollar→cent conversion
- `src/store/components/ProductCard.jsx` - Product display and price calculation
- `studio/schemaTypes/product.js` - Sanity schema (stores dollars)
- `studio/components/PriceUsdInput.jsx` - Custom input for dollar amounts

## Notes

- Square API expects amounts in cents, so this fix aligns with Square's expectations
- All cart and checkout code already worked with cents
- This fix ensures consistency across the entire product → cart → checkout → payment flow
- The `Math.round()` is critical for avoiding floating-point arithmetic issues
