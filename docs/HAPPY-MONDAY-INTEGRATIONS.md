# Happy Monday Integration Setup Guide

This guide explains how to connect your QuickBooks and Square accounts to the Local Effort partner portal for automated invoicing and inventory management.

## Overview

The integration provides two key features:

1. **QuickBooks Integration** - Receive bookkeeping copies of Local Effort invoices in QuickBooks
2. **Square Inventory Sync** - Automatically update your Square POS inventory when you receive products from Local Effort

---

## Part 1: QuickBooks Setup

### Prerequisites
- QuickBooks Online account (Simple Start, Essentials, Plus, or Advanced)
- Admin access to your QuickBooks company

### Step 1: Connect QuickBooks

1. Log in to the Happy Monday portal at `/partners/happy-monday`
2. Click the **Settings** tab in the navigation
3. Expand the **QuickBooks Online** section
4. Click **Connect QuickBooks**
5. You'll be redirected to Intuit's authorization page
6. Sign in with your QuickBooks credentials
7. Select your company if you have multiple
8. Click **Connect** to authorize the integration
9. You'll be redirected back to the portal with a success message

### Step 2: Set Up Customer in QuickBooks

For invoices to sync properly, you should have a customer set up in QuickBooks:

1. In QuickBooks, go to **Sales** → **Customers**
2. Create a new customer named **"Local Effort Cooperative"**
3. Add the email: `hello@localeffortfood.com`
4. Save the customer

### How It Works

Once connected:
- When Local Effort creates an invoice for you, it can be sent to your QuickBooks
- The invoice includes all line items, quantities, and prices
- QuickBooks is for bookkeeping only; payments stay in Local Effort (Square/ACH/check)
- Payment status does not sync from QuickBooks

---

## Part 2: Square Inventory Setup

### Prerequisites
- Square account with POS access
- Items already created in your Square catalog that correspond to Local Effort products
- Admin access to your Square account

### Step 1: Connect Square

1. In the Happy Monday portal, go to the **Settings** tab
2. Expand the **Square POS** section
3. Click **Connect Square**
4. You'll be redirected to Square's authorization page
5. Sign in with your Square credentials
6. Click **Allow** to grant inventory permissions
7. You'll be redirected back with a success message

### Step 2: Map Catalog Items

After connecting Square, you need to map Local Effort menu items to your Square catalog:

1. In the **Settings** tab, scroll down to **Item Catalog Mapping**
2. Click **Load Square Catalog** to fetch your Square items
3. For each Local Effort item, select the corresponding Square catalog item from the dropdown
4. If an item has variations (e.g., sizes), select the appropriate variation
5. Click **Save Mappings** when done

#### Example Mappings:
| Local Effort Item | Your Square Item |
|-------------------|------------------|
| Egg Salad Sandwich | Egg Salad Sandwich |
| 12" Cheese Pizza | Pizza - Cheese Large |
| Beet Salad | Beet Salad |

**Note:** Only items with mappings will have their inventory synced. Unmapped items will be skipped.

### Step 3: Sync Inventory (Manual Trigger)

When you receive an order from Local Effort:

1. Go to **Past Orders** tab
2. Click on the order/invoice you want to sync
3. Click the **Sync to Square** button (purple button)
4. Confirm the sync
5. Your Square inventory will be increased by the ordered quantities

The button will show "Synced to Square" badge once complete.

---

## Environment Variables (for developers)

The following environment variables must be configured in Vercel/your hosting:

### QuickBooks
```
QUICKBOOKS_CLIENT_ID=your_quickbooks_app_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_app_client_secret
QUICKBOOKS_REDIRECT_URI=https://localeffortfood.com/api/happymonday/quickbooks-callback
QUICKBOOKS_ENVIRONMENT=production  # or 'sandbox' for testing
```

### Square (for inventory sync - separate from payment processing)
```
SQUARE_APP_ID=your_square_app_id
SQUARE_APP_SECRET=your_square_app_secret
SQUARE_OAUTH_REDIRECT_URI=https://localeffortfood.com/api/happymonday/square-callback
```

---

## Database Setup

Run the migration to create integration tables:

```bash
# In Supabase SQL Editor:
supabase/migrations/happymonday-integrations.sql
```

This creates:
- `happymonday_integrations` - Stores OAuth tokens for QuickBooks and Square
- `happymonday_item_catalog_mapping` - Maps Local Effort items to Square catalog
- `happymonday_inventory_syncs` - Logs of inventory sync operations

---

## Troubleshooting

### QuickBooks connection failed
- Ensure you're using QuickBooks Online (not Desktop)
- Check that QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET are correct
- Verify the redirect URI matches exactly

### Square connection failed
- Ensure SQUARE_APP_ID and SQUARE_APP_SECRET are set
- The Square app must have INVENTORY_WRITE and ITEMS_READ permissions

### Inventory not syncing
- Verify items are mapped in the Catalog Mapping section
- Check that the Square location is set (shown in Settings)
- Ensure quantities are positive (credits/returns are skipped)

### Token expired errors
- Tokens auto-refresh, but if issues persist, click "Reconnect" in Settings
- QuickBooks tokens expire after ~100 days if not used
- Square tokens expire after ~30 days if not refreshed

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/happymonday/integration-status` | GET | Get current integration status |
| `/api/happymonday/quickbooks-connect` | GET | Initiate QuickBooks OAuth |
| `/api/happymonday/quickbooks-callback` | GET | QuickBooks OAuth callback |
| `/api/happymonday/quickbooks-invoice` | POST | Create QuickBooks invoice |
| `/api/happymonday/square-connect` | GET | Initiate Square OAuth |
| `/api/happymonday/square-callback` | GET | Square OAuth callback |
| `/api/happymonday/square-catalog` | GET | Fetch Square catalog items |
| `/api/happymonday/catalog-mapping` | GET/POST | Manage item mappings |
| `/api/happymonday/sync-inventory` | POST | Sync order to Square inventory |

---

## Support

For issues or questions:
- Email: hello@localeffortfood.com
- Portal issues: Contact Local Effort support
