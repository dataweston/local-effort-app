# Product Add-Ons Display Fix

## Issue
Add-ons (toppings) configured in Sanity Studio were not showing on customer-facing product pages (/tiny-diner and /happy-monday).

## Root Cause
1. **API not fetching add-ons data**: The `/api/store/products` endpoint was not querying the `addOns`, `offerDairyFree`, and `dairyFreeCost` fields from Sanity
2. **ProductCard not rendering add-ons**: The `ProductCard` component only handled legacy `variants` field, not the new `addOns` structure

## Files Modified

### 1. API - Fetch Add-Ons Data
**File**: `api/store/products.js`

**Changes**:
- Added `addOns`, `offerDairyFree`, `dairyFreeCost` to Sanity query
- Added these fields to the product mapping

**Before**:
```javascript
const query = `*[_type == "product" && active == true && $store in stores]{
  // ... other fields
  variants[]{name, squareVariationId, price},
  stores
}`;

const products = docs.map((d) => ({
  // ... other fields
  variants: Array.isArray(d.variants) ? d.variants : [],
  stores: Array.isArray(d.stores) ? d.stores : [],
}));
```

**After**:
```javascript
const query = `*[_type == "product" && active == true && $store in stores]{
  // ... other fields
  variants[]{name, squareVariationId, price},
  addOns[]{name, additionalCost, squareModifierId, defaultSelected},
  offerDairyFree,
  dairyFreeCost,
  stores
}`;

const products = docs.map((d) => ({
  // ... other fields
  variants: Array.isArray(d.variants) ? d.variants : [],
  addOns: Array.isArray(d.addOns) ? d.addOns : [],
  offerDairyFree: d.offerDairyFree ?? false,
  dairyFreeCost: d.dairyFreeCost ?? 0,
  stores: Array.isArray(d.stores) ? d.stores : [],
}));
```

### 2. ProductCard - Display Add-Ons UI
**File**: `src/store/components/ProductCard.jsx`

**Changes**:
- Added state for selected add-ons: `selectedAddOns`
- Added state for dairy-free option: `isDairyFree`
- Calculate total price including add-ons and dairy-free
- Initialize default selected add-ons when modal opens
- Display add-ons checkboxes in product details modal
- Display dairy-free option checkbox if offered

**New State**:
```javascript
const [selectedAddOns, setSelectedAddOns] = useState({});
const [isDairyFree, setIsDairyFree] = useState(false);
const hasAddOns = Array.isArray(product.addOns) && product.addOns.length > 0;
```

**Price Calculation**:
```javascript
const basePrice = chosen?.price ?? (product.salePrice ?? product.price);
const addOnsTotal = hasAddOns 
  ? Object.keys(selectedAddOns).reduce((sum, idx) => {
      if (selectedAddOns[idx]) {
        return sum + (product.addOns[idx]?.additionalCost || 0);
      }
      return sum;
    }, 0)
  : 0;
const dairyFreePrice = (isDairyFree && product.offerDairyFree) 
  ? (product.dairyFreeCost || 0) 
  : 0;
const price = basePrice + (addOnsTotal * 100) + (dairyFreePrice * 100);
```

**UI Components Added**:

1. **Add-Ons Section** (only shows if product has add-ons):
```jsx
<div className="mt-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
  <h4 className="text-sm font-semibold mb-2">Customize Your Order</h4>
  <div className="space-y-2">
    {product.addOns.map((addon, idx) => (
      <label className="flex items-center justify-between gap-2">
        <input type="checkbox" checked={selectedAddOns[idx]} />
        <span>{addon.name}</span>
        <span>+${addon.additionalCost.toFixed(2)}</span>
      </label>
    ))}
  </div>
</div>
```

2. **Dairy-Free Option** (only shows if offerDairyFree is true):
```jsx
<div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
  <label className="flex items-center justify-between gap-2">
    <input type="checkbox" checked={isDairyFree} />
    <span>Dairy-Free Option</span>
    <span>+${product.dairyFreeCost.toFixed(2)}</span>
  </label>
</div>
```

## How It Works Now

### Customer Experience

1. **Browse Products**: Customer sees products on /tiny-diner or /happy-monday
2. **Click Product**: Opens product details modal
3. **See Add-Ons**: If product has add-ons configured in Sanity, they appear in a "Customize Your Order" section
4. **Select Add-Ons**: Customer can check/uncheck add-ons (e.g., Pepperoni +$2.00)
5. **Dairy-Free Option**: If offered, a separate checkbox appears for dairy-free
6. **Price Updates**: Total price automatically updates with selections
7. **Add to Cart**: When added to cart, price includes all selected customizations

### Example Product Display

**Pizza with Add-Ons**:
```
┌─────────────────────────────────────┐
│ 🍕 Margherita Pizza                 │
│ $12.00                              │
│                                     │
│ ┌─ Customize Your Order ──────────┐│
│ │ [ ] Pepperoni         +$2.00    ││
│ │ [✓] Extra Cheese      +$1.50    ││
│ │ [ ] Mushrooms         +$1.00    ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─ Dairy-Free Option ─────────────┐│
│ │ [✓] Dairy-Free        +$1.50    ││
│ └─────────────────────────────────┘│
│                                     │
│ Total: $15.00                       │
│ [Add to Cart]                       │
└─────────────────────────────────────┘
```

**Simple Product (No Add-Ons)**:
```
┌─────────────────────────────────────┐
│ 🥤 Bottled Water                    │
│ $1.50                               │
│                                     │
│ Cold, refreshing water              │
│                                     │
│ [Add to Cart]                       │
└─────────────────────────────────────┘
```

## Features Implemented

✅ **Conditional Display**: Add-ons only show if configured in Sanity
✅ **Dairy-Free Option**: Separate checkbox for dairy-free if offered
✅ **Price Calculation**: Automatic price updates with selections
✅ **Default Selections**: Pre-select add-ons marked as default in Sanity
✅ **Clean UI**: Styled sections with borders and background colors
✅ **Responsive**: Works in product details modal
✅ **Backward Compatible**: Legacy variants still work

## Testing Checklist

### Test 1: Product with Add-Ons
1. Go to Sanity Studio
2. Edit a product (e.g., pizza)
3. Add some add-ons:
   - Pepperoni: $2.00
   - Extra Cheese: $1.50
4. Publish
5. Visit /tiny-diner or /happy-monday
6. Click on the product
7. ✅ Should see "Customize Your Order" section
8. ✅ Checkboxes for each add-on with prices
9. ✅ Total price updates when checking boxes

### Test 2: Dairy-Free Option
1. Edit product in Sanity
2. Check "Offer Dairy-Free Option"
3. Set dairy-free cost (e.g., $1.50)
4. Publish
5. View product on site
6. ✅ Should see "Dairy-Free Option" checkbox
7. ✅ Price updates when checked

### Test 3: Default Selected Add-Ons
1. Edit product in Sanity
2. Mark an add-on as "Default Selected"
3. Publish
4. Open product details
5. ✅ That add-on should be pre-checked
6. ✅ Price should include it by default

### Test 4: Product Without Add-Ons
1. View a simple product (no add-ons configured)
2. ✅ No "Customize Your Order" section
3. ✅ No dairy-free option
4. ✅ Just shows regular add to cart button

### Test 5: Multiple Add-Ons
1. Configure product with 5+ add-ons
2. ✅ All should display in scrollable list
3. ✅ Can select multiple at once
4. ✅ Price updates correctly for all combinations

## Known Limitations

⚠️ **Cart Integration**: Currently, the selected add-ons and dairy-free option affect the displayed price, but this customization data needs to be passed to the cart and checkout flow. Future enhancement needed to:
- Store selected add-ons with cart items
- Display customizations in cart
- Pass to Square payment with modifiers
- Show in order confirmation

⚠️ **Square Modifier IDs**: The `squareModifierId` field is fetched but not yet used for Square integration. Future enhancement needed to:
- Link add-ons to Square modifiers
- Apply modifiers during payment processing
- Sync inventory for add-ons

## Future Enhancements

### Phase 1: Cart Customization Storage
```javascript
// Store add-ons with cart item
add({ 
  productId: product.id,
  variationId,
  unitPrice: price,
  qty: 1,
  title: product.title,
  image: primary,
  // NEW: Store customizations
  customizations: {
    addOns: selectedAddOns,
    isDairyFree: isDairyFree
  }
});
```

### Phase 2: Display in Cart
Show selected add-ons under each cart item:
```
Pizza Margherita - $15.00
  + Extra Cheese ($1.50)
  + Dairy-Free ($1.50)
  Base: $12.00
```

### Phase 3: Square Integration
Apply Square modifiers during checkout:
```javascript
// Pass modifier IDs to Square payment
const modifiers = Object.keys(selectedAddOns)
  .filter(idx => selectedAddOns[idx])
  .map(idx => product.addOns[idx].squareModifierId)
  .filter(Boolean);
```

## Related Documentation

- `docs/product-addons-schema.md` - Sanity schema documentation
- `docs/product-addons-ui-example.md` - UI mockups
- `studio/schemaTypes/product.js` - Sanity schema definition

## Support

If add-ons still don't show:
1. Check Sanity Studio - verify add-ons are configured
2. Check API response: `/api/store/products?store=tiny-diner`
3. Verify product has correct store assigned
4. Clear browser cache and refresh
5. Check browser console for errors
