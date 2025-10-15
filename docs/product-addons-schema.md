# Product Add-Ons & Dairy-Free Options - Sanity Schema Update

## Overview
The product schema has been updated to support flexible add-ons (like pizza toppings) and conditional dairy-free options for Tiny Diner and Happy Monday sale pages.

## What Changed

### 1. **Add-Ons Module** (Replaces Variants)

**Location:** Product document → "Add-Ons" field

**Purpose:** Allow customers to add optional extras like pizza toppings, side items, or customizations with additional costs.

**Fields:**
- **Add-On Name** (required): e.g., "Extra Cheese", "Pepperoni", "Mushrooms"
- **Additional Cost (USD)** (required): Extra charge in dollars (use 0 for free add-ons)
- **Square Modifier ID** (optional): For Square integration
- **Default Selected**: Pre-select this add-on by default

**Example Use Cases:**
```
Pizza Toppings:
  - Pepperoni: +$2.00
  - Extra Cheese: +$1.50
  - Mushrooms: +$1.00
  - Olives: +$1.00

Sandwich Extras:
  - Add Bacon: +$2.50
  - Extra Meat: +$3.00
  - Avocado: +$1.50

Coffee Add-Ons:
  - Extra Shot: +$1.00
  - Oat Milk: +$0.75
  - Vanilla Syrup: +$0.50 (free)
```

### 2. **Dairy-Free Option** (Conditional)

**Location:** Product document → "Offer Dairy-Free Option" checkbox

**Purpose:** Show a dairy-free checkbox option only for products that offer it.

**How It Works:**
1. **Offer Dairy-Free Option** (checkbox): Check to enable dairy-free option for this product
2. **Dairy-Free Additional Cost** (appears when checked): Enter extra cost or 0 if same price

**When to Use:**
- ✅ Pizza (dairy-free cheese)
- ✅ Sandwiches (dairy-free cheese, no butter)
- ✅ Coffee drinks (dairy-free milk alternatives)
- ✅ Baked goods (dairy-free versions)
- ❌ Products that don't offer dairy-free options (checkbox unchecked = won't show to customers)

### 3. **Variants Field** (Deprecated)

The old "Variants" field is now labeled as deprecated but kept for backward compatibility. 

**Migration Path:**
- Existing products with variants will continue to work
- New products should use Add-Ons instead
- Gradually migrate existing variant-based products to use Add-Ons

## How to Set Up Products

### Example 1: Pizza with Toppings

1. Create/Edit a product in Sanity
2. Set basic details (title, price, images, etc.)
3. Scroll to **Add-Ons** section
4. Click "+ Add item" to add each topping:
   ```
   Name: "Pepperoni"
   Additional Cost: 2.00
   Default Selected: (unchecked)
   ```
5. Enable **Offer Dairy-Free Option**: ✓
6. Set **Dairy-Free Additional Cost**: 1.50 (for dairy-free cheese)
7. Publish

### Example 2: Sandwich with Optional Extras

1. Create/Edit sandwich product
2. Add-Ons:
   ```
   Name: "Add Bacon"
   Additional Cost: 2.50
   
   Name: "Extra Meat"
   Additional Cost: 3.00
   
   Name: "Avocado"
   Additional Cost: 1.50
   ```
3. Dairy-Free Option:
   - Check ✓ if offering dairy-free cheese
   - Set cost (or 0 if same price)
4. Publish

### Example 3: Simple Product (No Add-Ons or Dairy-Free)

1. Create product (e.g., chips, drinks)
2. Leave **Add-Ons** empty
3. Leave **Offer Dairy-Free Option** unchecked
4. Product will show normally without customization options

## Frontend Implementation Notes

### For Developers:

The frontend will need to:

1. **Check for Add-Ons:**
   ```javascript
   if (product.addOns && product.addOns.length > 0) {
     // Show add-ons selection UI
     product.addOns.forEach(addon => {
       // Display checkbox/selector for: addon.name
       // Show price: +$${addon.additionalCost}
       // Use defaultSelected to pre-check
     });
   }
   ```

2. **Check for Dairy-Free Option:**
   ```javascript
   if (product.offerDairyFree) {
     // Show dairy-free checkbox
     const dairyFreeCost = product.dairyFreeCost || 0;
     // Display: "Dairy-Free" checkbox
     if (dairyFreeCost > 0) {
       // Show: +$${dairyFreeCost}
     }
   }
   ```

3. **Calculate Total:**
   ```javascript
   let total = product.price;
   
   // Add selected add-ons
   selectedAddOns.forEach(addon => {
     total += addon.additionalCost;
   });
   
   // Add dairy-free cost if selected
   if (isDairyFreeSelected && product.dairyFreeCost) {
     total += product.dairyFreeCost;
   }
   ```

## Benefits

✅ **Flexible**: Support any type of add-on (toppings, extras, upgrades)
✅ **Conditional**: Dairy-free option only shows when offered
✅ **Scalable**: Easy to add new add-ons without schema changes
✅ **User-Friendly**: Clear pricing for each option
✅ **Square Compatible**: Optional Square modifier IDs for integration
✅ **Default Selections**: Can pre-select popular add-ons

## Schema Structure

```javascript
{
  title: "Margherita Pizza",
  price: 12.00,
  stores: ["tiny-diner"],
  
  addOns: [
    {
      name: "Pepperoni",
      additionalCost: 2.00,
      squareModifierId: "ABC123",
      defaultSelected: false
    },
    {
      name: "Extra Cheese",
      additionalCost: 1.50,
      defaultSelected: false
    }
  ],
  
  offerDairyFree: true,
  dairyFreeCost: 1.50,
  
  // Legacy field (deprecated)
  variants: []
}
```

## Migration Guide

### If You Have Existing Products with Variants:

1. **Short Term**: Products will continue to work with variants
2. **Long Term**: Gradually convert variants to add-ons:
   - If variants are different sizes/versions: Keep as separate products
   - If variants are customizations: Convert to add-ons

### Example Conversion:

**Before (Variants):**
```javascript
variants: [
  { name: "Small (12\")", price: 10.00 },
  { name: "Medium (14\")", price: 12.00 },
  { name: "Large (16\")", price: 14.00 }
]
```

**After (Better as separate products):**
- Create 3 products: "Pizza - Small", "Pizza - Medium", "Pizza - Large"
- Each with their own add-ons

**Before (Variants as customizations):**
```javascript
variants: [
  { name: "With Pepperoni", price: 14.00 },
  { name: "With Mushrooms", price: 13.00 }
]
```

**After (Add-Ons):**
```javascript
price: 12.00,
addOns: [
  { name: "Pepperoni", additionalCost: 2.00 },
  { name: "Mushrooms", additionalCost: 1.00 }
]
```

## Testing in Sanity Studio

1. Deploy updated schema: `cd studio && sanity deploy`
2. Open Sanity Studio
3. Create a test product
4. Verify you see:
   - ✅ "Add-Ons" array field
   - ✅ "Offer Dairy-Free Option" checkbox
   - ✅ "Dairy-Free Additional Cost" (appears when checkbox checked)
   - ✅ "Variants" field labeled as deprecated

## Questions?

See the product schema at: `studio/schemaTypes/product.js`
