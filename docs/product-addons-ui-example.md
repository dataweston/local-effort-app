# Product Schema Example - Pizza with Add-Ons

## How it appears in Sanity Studio:

```
┌─────────────────────────────────────────────────────┐
│ Product: Margherita Pizza                           │
├─────────────────────────────────────────────────────┤
│ Title: Margherita Pizza                             │
│ Price (USD): $12.00                                 │
│ Display on Store Pages: [✓] Tiny Diner             │
│                                                     │
│ ┌─ Add-Ons ──────────────────────────────────────┐ │
│ │ [+ Add item]                                    │ │
│ │                                                 │ │
│ │ ┌─ Add-On 1 ───────────────────────────────┐   │ │
│ │ │ Add-On Name: Pepperoni                   │   │ │
│ │ │ Additional Cost (USD): $2.00             │   │ │
│ │ │ Square Modifier ID: (optional)           │   │ │
│ │ │ Default Selected: [ ] (unchecked)        │   │ │
│ │ └──────────────────────────────────────────┘   │ │
│ │                                                 │ │
│ │ ┌─ Add-On 2 ───────────────────────────────┐   │ │
│ │ │ Add-On Name: Extra Cheese                │   │ │
│ │ │ Additional Cost (USD): $1.50             │   │ │
│ │ │ Square Modifier ID: (optional)           │   │ │
│ │ │ Default Selected: [ ] (unchecked)        │   │ │
│ │ └──────────────────────────────────────────┘   │ │
│ │                                                 │ │
│ │ ┌─ Add-On 3 ───────────────────────────────┐   │ │
│ │ │ Add-On Name: Mushrooms                   │   │ │
│ │ │ Additional Cost (USD): $1.00             │   │ │
│ │ │ Square Modifier ID: (optional)           │   │ │
│ │ │ Default Selected: [ ] (unchecked)        │   │ │
│ │ └──────────────────────────────────────────┘   │ │
│ │                                                 │ │
│ │ [+ Add item]                                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Offer Dairy-Free Option: [✓] (checked)             │
│ Dairy-Free Additional Cost (USD): $1.50            │
│   ↑ This field appears because checkbox is checked │
│                                                     │
│ ─────────────────────────────────────────────────  │
│                                                     │
│ Variants (Legacy - deprecated): (collapsed)         │
│   ⚠️  Deprecated: Use Add-Ons instead              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## How Customers See It on /tiny-diner:

```
┌──────────────────────────────────────────┐
│  🍕 Margherita Pizza                     │
│  $12.00                                  │
│                                          │
│  Fresh mozzarella, basil, tomato sauce  │
│                                          │
│  ┌─ Customize Your Pizza ─────────────┐ │
│  │                                     │ │
│  │ Toppings:                           │ │
│  │ [ ] Pepperoni         +$2.00        │ │
│  │ [ ] Extra Cheese      +$1.50        │ │
│  │ [ ] Mushrooms         +$1.00        │ │
│  │                                     │ │
│  │ Options:                            │ │
│  │ [ ] Dairy-Free        +$1.50        │ │
│  │                                     │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Total: $12.00                           │
│                                          │
│  [Add to Cart]                           │
└──────────────────────────────────────────┘
```

## With Selections:

```
┌──────────────────────────────────────────┐
│  🍕 Margherita Pizza                     │
│  $12.00                                  │
│                                          │
│  ┌─ Customize Your Pizza ─────────────┐ │
│  │ Toppings:                           │ │
│  │ [✓] Pepperoni         +$2.00  ←───  │ │
│  │ [✓] Extra Cheese      +$1.50  ←───  │ │
│  │ [ ] Mushrooms         +$1.00        │ │
│  │                                     │ │
│  │ Options:                            │ │
│  │ [✓] Dairy-Free        +$1.50  ←───  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  Base Price:              $12.00         │
│  + Pepperoni:              $2.00         │
│  + Extra Cheese:           $1.50         │
│  + Dairy-Free:             $1.50         │
│  ────────────────────────────────        │
│  Total:                   $17.00         │
│                                          │
│  [Add to Cart]                           │
└──────────────────────────────────────────┘
```

## Product WITHOUT Dairy-Free Option:

If "Offer Dairy-Free Option" is unchecked in Sanity:

```
┌──────────────────────────────────────────┐
│  🥤 Soda                                 │
│  $2.50                                   │
│                                          │
│  ┌─ Customize ────────────────────────┐ │
│  │ (No options available)             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Total: $2.50                            │
│  [Add to Cart]                           │
└──────────────────────────────────────────┘
```

## Product WITHOUT Add-Ons or Dairy-Free:

Simple product - just add to cart:

```
┌──────────────────────────────────────────┐
│  🥤 Bottled Water                        │
│  $1.50                                   │
│                                          │
│  Cold, refreshing water                  │
│                                          │
│  [Add to Cart]                           │
└──────────────────────────────────────────┘
```

## Key Features:

✅ Add-ons only appear if configured in Sanity
✅ Dairy-free only appears if "Offer Dairy-Free Option" is checked
✅ Each add-on shows its additional cost clearly
✅ Total price updates automatically as options are selected
✅ Clean UI - no clutter for products without options
