# Store Pickup Information Implementation

## Overview
Added prominent pickup information to store pages and customer receipt emails for Tiny Diner and Happy Monday sales.

## Pickup Details

### Tiny Diner
- **Date:** October 31, 2025
- **Time:** 4-7pm
- **Location:** Tiny Diner, 1024 E 38th St, Minneapolis

### Happy Monday
- **Date:** October 23, 2025
- **Time:** 4-7pm
- **Location:** Happy Monday Coffee, 2420 Cleveland Ave N, Roseville

## Implementation Details

### 1. Store Pages - Visual Notices

**TinyDinerSalePage.jsx** and **HappyMondaySalePage.jsx**
- Added prominent notice boxes with pickup information
- Tiny Diner: Amber-themed alert box
- Happy Monday: Blue-themed alert box
- Positioned directly below page header, above product grid
- Includes icon, formatted date/time, and full address

### 2. Checkout Flow - Store Context

**CheckoutPanel.jsx**
- Accepts `store` prop (default: 'sale')
- Passes store identifier to checkout API
- Tiny Diner pages pass `store="tiny-diner"`
- Happy Monday pages pass `store="happy-monday"`

### 3. Customer Emails - Pickup Information

**api/store/checkout.js**
- Added `storePickupInfo` object mapping store identifiers to pickup details
- Stores supported:
  - `'tiny-diner'`: Full pickup info for Tiny Diner
  - `'happy-monday'`: Full pickup info for Happy Monday
  - `'sale'`: Default fallback (TBD details)
- Customer receipt emails now include:
  ```
  📍 PICKUP INFORMATION:
  When: [date] at [time]
  Where: [location name]
  [address]
  ```
- Admin notification emails also include pickup information

## Email Template Example

```
Hi [Customer Name],

Thanks for your order! We're on it. Here's a quick summary:

• Product 1 x2 — $20.00
• Product 2 x1 — $15.00

Subtotal: $35.00

📍 PICKUP INFORMATION:
When: October 31, 2025 at 4-7pm
Where: Tiny Diner
1024 E 38th St, Minneapolis

We'll be in touch soon.

— Local Effort
```

## Files Modified

1. **src/pages/TinyDinerSalePage.jsx**
   - Added pickup information notice box
   - Passes `store="tiny-diner"` to CheckoutPanel

2. **src/pages/HappyMondaySalePage.jsx**
   - Added pickup information notice box
   - Passes `store="happy-monday"` to CheckoutPanel

3. **src/store/components/CheckoutPanel.jsx**
   - Accepts `store` prop with default 'sale'
   - Passes store to checkout API

4. **api/store/checkout.js**
   - Added store pickup information mapping
   - Includes pickup details in customer and admin emails

## Testing Checklist

- [ ] Visit `/tiny-diner` and verify pickup notice displays correctly
- [ ] Visit `/happy-monday` and verify pickup notice displays correctly
- [ ] Complete test purchase on `/tiny-diner`
- [ ] Verify customer receipt email includes Tiny Diner pickup information
- [ ] Complete test purchase on `/happy-monday`
- [ ] Verify customer receipt email includes Happy Monday pickup information
- [ ] Verify admin notification emails include pickup information
- [ ] Test that `/sale` still works without explicit store prop

## Future Enhancements

- Consider adding calendar (.ics) attachment to emails
- Add Google Maps link to pickup locations
- Include reminder email 24 hours before pickup
- Add ability to configure pickup details via Sanity CMS
