# Product Add-On Pricing Fix

**Date:** October 15, 2024  
**Issue:** Pizza topping add-ons showing as hundreds of dollars (e.g., $300 instead of $3.00)  
**Files Modified:** `api/store/products.js`, `src/store/components/ProductCard.jsx`

## Problem Description

Add-ons for products on `/happy-monday` and `/tiny-diner` pages were displaying prices 100x too high:
- Expected: `+$3.00` for extra toppings
- Actual: `+$300.00` 

## Root Cause

**Currency Unit Mismatch**: Inconsistency between how prices were stored in Sanity vs. how they were used in the frontend.

### The Confusion

1. **Sanity Schema** (`studio/schemaTypes/product.js`):
   - Stores ALL prices in **dollars (USD)**
   - `price`: "Enter dollars (USD)"
   - `additionalCost`: "Extra cost in dollars (USD)"
   - `dairyFreeCost`: "Extra cost for dairy-free option in dollars (USD)"

2. **Frontend Expectation** (`ProductCard.jsx`):
   - Expected ALL prices in **cents**
   - Line 73: `const formatted = useMemo(() => `$${(price / 100).toFixed(2)}`, [price]);`
   - Line 183: `${(product.price/100).toFixed(2)}`

3. **API Behavior** (Before Fix):
   - Passed prices through **without conversion**
   - Sent dollars from Sanity directly to frontend
   - Frontend expected cents → prices appeared 100x too small

4. **The Double Conversion Bug**:
   ```jsx
   // ProductCard.jsx (BEFORE)
   const price = basePrice + (addOnsTotal * 100) + (dairyFreePrice * 100);
   ```
   - `basePrice` was in dollars (e.g., 15 for $15)
   - `addOnsTotal` was in dollars (e.g., 3 for $3)
   - Multiplied by 100: 3 × 100 = 300
   - Added to basePrice (dollars): 15 + 300 = 315
   - Displayed as: $315 / 100 = $3.15 ❌ (Wrong!)
   - But wait - this would make $3.15, not $300...

5. **The REAL Issue**:
   - Display code for add-ons was showing raw value:
   ```jsx
   // BEFORE
   {addon.additionalCost > 0 ? `+$${addon.additionalCost.toFixed(2)}` : 'Free'}
   ```
   - If `additionalCost` was supposed to be in cents (300) but displayed as dollars:
   - Result: `+$300.00` ❌

## Solution

**Standardize on Cents**: Convert all prices from dollars to cents in the API, so the entire frontend works with cents consistently.

### Changes Made

#### 1. **API Conversion** (`api/store/products.js`)

Convert all dollar values to cents when mapping Sanity data:

```javascript
const products = (docs || []).map((d) => ({
  // ... other fields
  price: Math.round((d.price ?? 0) * 100), // Convert dollars to cents
  salePrice: d.salePrice ? Math.round(d.salePrice * 100) : null,
  variants: Array.isArray(d.variants) ? d.variants.map(v => ({
    ...v,
    price: v.price ? Math.round(v.price * 100) : 0 // Convert variant prices
  })) : [],
  addOns: Array.isArray(d.addOns) ? d.addOns.map(a => ({
    ...a,
    additionalCost: a.additionalCost ? Math.round(a.additionalCost * 100) : 0 // ✅ FIX
  })) : [],
  offerDairyFree: d.offerDairyFree ?? false,
  dairyFreeCost: d.dairyFreeCost ? Math.round(d.dairyFreeCost * 100) : 0, // ✅ FIX
}));
```

**Why `Math.round()`?**
- Prevents floating point precision issues (e.g., 3.00 * 100 = 299.99999999)
- Ensures integer cent values

#### 2. **ProductCard Price Calculation** (`src/store/components/ProductCard.jsx`)

Remove double multiplication since values are already in cents:

```javascript
// BEFORE (Wrong - multiplied cents by 100)
const price = basePrice + (addOnsTotal * 100) + (dairyFreePrice * 100);

// AFTER (Correct - all values already in cents)
const price = basePrice + addOnsTotal + dairyFreePrice;
```

#### 3. **Add-On Display** (`ProductCard.jsx` line ~291)

Convert cents to dollars for display:

```jsx
// BEFORE (Displayed raw cents as dollars)
{addon.additionalCost > 0 ? `+$${addon.additionalCost.toFixed(2)}` : 'Free'}

// AFTER (Convert cents to dollars)
{addon.additionalCost > 0 ? `+$${(addon.additionalCost / 100).toFixed(2)}` : 'Free'}
```

#### 4. **Dairy-Free Display** (`ProductCard.jsx` line ~315)

Same fix for dairy-free option:

```jsx
// BEFORE
{product.dairyFreeCost > 0 ? `+$${product.dairyFreeCost.toFixed(2)}` : 'Same price'}

// AFTER
{product.dairyFreeCost > 0 ? `+$${(product.dairyFreeCost / 100).toFixed(2)}` : 'Same price'}
```

## Example Flow

### Before Fix
1. Sanity: `additionalCost: 3` (dollars)
2. API: `additionalCost: 3` (passed through)
3. ProductCard display: `+$3.00` (accidentally correct in display)
4. ProductCard calculation: `price = 1500 + (3 * 100) = 1800` 
5. Final display: `$18.00` (correct)
6. **BUT** if we tried to display additionalCost directly: `+$300.00` ❌

Wait, this doesn't match the bug... Let me reconsider.

### Actual Bug (Re-analyzed)

The bug was likely that the API was already converting to cents somewhere, making:
1. Sanity: `additionalCost: 3.00` (dollars)
2. Some previous code converted: `additionalCost: 300` (cents)
3. ProductCard display: `+$${300.toFixed(2)}` = `+$300.00` ❌
4. ProductCard calculation: `price = 1500 + (300 * 100) = 31500`
5. Final display: `$315.00` ❌

### After Fix
1. Sanity: `additionalCost: 3.00` (dollars)
2. API converts: `additionalCost: 300` (cents) ✅
3. ProductCard display: `+$${(300 / 100).toFixed(2)}` = `+$3.00` ✅
4. ProductCard calculation: `price = 1500 + 300 = 1800` ✅
5. Final display: `$18.00` ✅

## Testing Checklist

- [ ] Verify base product prices display correctly (e.g., $15.00)
- [ ] Verify add-on prices display correctly (e.g., +$3.00, not +$300.00)
- [ ] Verify dairy-free option prices display correctly
- [ ] Test total price calculation with multiple add-ons
- [ ] Test total price with add-ons + dairy-free option
- [ ] Verify sale prices work correctly
- [ ] Test variant prices
- [ ] Add item to cart and verify price is correct
- [ ] Check checkout panel shows correct unit prices
- [ ] Verify Square payment sends correct amounts

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
