# Store Source Tracking for /tiny-diner and /happy-monday

## Problem
When customers purchase from `/tiny-diner` or `/happy-monday`, the menus are similar, making it difficult to determine which page the order came from. Need clear indicators to organize sales correctly.

## Solution Implemented

### 1. **Square Payment Records** ✅
**Location:** `api/store/checkout.js` (Lines 59-68)

Each payment now includes:
- **Note Field**: `[Tiny Diner] Customer Name - 3 item(s)` or `[Happy Monday Coffee] Customer Name - 2 item(s)`
- **Reference ID**: `tiny-diner-1729000000000` or `happy-monday-1729000000000`

This appears in your Square Dashboard for each transaction.

### 2. **Email Receipts** ✅
**Location:** `api/store/checkout.js` (Lines 105-142)

#### Team Notification Email:
- **Subject**: `🛒 New Order - Tiny Diner` or `🛒 New Order - Happy Monday Coffee`
- **Body Header**: 
  ```
  NEW ORDER FROM: TINY DINER
  Store ID: tiny-diner
  
  Order [payment-id]
  Customer: John Doe
  Email: john@example.com
  ...
  
  This order was placed via Tiny Diner page.
  ```

#### Customer Receipt Email:
- **Subject**: `Thanks for your order from Tiny Diner!` (or Happy Monday Coffee)
- **Body includes**: 
  ```
  🏪 STORE: TINY DINER
  📍 PICKUP INFORMATION:
  When: October 31, 2025 at 4-7pm
  Where: Tiny Diner
  1024 E 38th St, Minneapolis
  ```

### 3. **Firestore Database Records** ✅
**Location:** `api/store/checkout.js` (Lines 85-111)

Each order is logged to Firestore collection: `store_orders`

**Document Structure:**
```json
{
  "store": "tiny-diner",           // or "happy-monday" or "sale"
  "storeName": "Tiny Diner",       // Human-readable name
  "paymentId": "abc123",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234"
  },
  "items": [
    {
      "productId": "...",
      "title": "Sandwich",
      "qty": 2,
      "unitPrice": 1500
    }
  ],
  "amount": 3000,                  // In cents
  "amountUsd": "30.00",           // Formatted
  "pickup": {
    "name": "Tiny Diner",
    "date": "October 31, 2025",
    "time": "4-7pm",
    "address": "1024 E 38th St, Minneapolis"
  },
  "createdAt": "2025-10-15T12:00:00.000Z",
  "createdAtMs": 1729000000000
}
```

### 4. **Existing Infrastructure** ✅
**Already in place:**
- Frontend pages (`TinyDinerSalePage.jsx`, `HappyMondaySalePage.jsx`) pass `store` prop to `CheckoutPanel`
- `CheckoutPanel` sends `store` field to API
- Store-specific pickup information configured in `storePickupInfo` object

## How to Query Orders by Store

### In Firestore Console:
1. Go to `store_orders` collection
2. Filter by `store == "tiny-diner"` or `store == "happy-monday"`
3. Orders are timestamped with `createdAt` and `createdAtMs`

### In Square Dashboard:
1. Look for payment notes starting with `[Tiny Diner]` or `[Happy Monday Coffee]`
2. Check Reference ID field for `tiny-diner-` or `happy-monday-` prefix

### In Email Inbox:
1. Search for subject: "New Order - Tiny Diner" or "New Order - Happy Monday Coffee"
2. Each email clearly states the store in the header

## Store Identifiers

| Page URL | Store ID | Store Name | Pickup Location |
|----------|----------|------------|-----------------|
| `/tiny-diner` | `tiny-diner` | Tiny Diner | 1024 E 38th St, Minneapolis |
| `/happy-monday` | `happy-monday` | Happy Monday Coffee | 2420 Cleveland Ave N, Roseville |
| `/sale` (fallback) | `sale` | Local Effort | TBD |

## Benefits

✅ **Square Dashboard**: Every payment shows store name in notes and reference ID
✅ **Email Sorting**: Filter inbox by "Tiny Diner" or "Happy Monday Coffee"
✅ **Database Queries**: Easy to generate store-specific sales reports
✅ **Customer Clarity**: Receipts clearly show which location they ordered from
✅ **No Manual Work**: Automatic categorization on every order

## Testing

1. Place test order on `/tiny-diner`
2. Check Square Dashboard for `[Tiny Diner]` in payment note
3. Check email for "New Order - Tiny Diner" subject
4. Check Firestore `store_orders` collection for `store: "tiny-diner"`

Repeat for `/happy-monday`
