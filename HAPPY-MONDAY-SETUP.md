# Happy Monday Portal Setup Instructions

## Overview
The Happy Monday partner portal has been migrated from Firebase to Supabase with the following features:
- ✅ Role-based authentication (admin and client)
- ✅ Order/invoice management with email notifications
- ✅ Credit tracking system ($1500 opening credit)
- ✅ Square payment integration
- ✅ Costing worksheet
- ✅ Admin features (mark as paid, view all orders, adjust credits)

## 1. Database Setup

### Run Supabase Schema
Execute the schema file to create all necessary tables:

```bash
# In Supabase SQL Editor, run:
supabase/happymonday-schema.sql
```

This will create:
- `happymonday_users` - User accounts (admin & client)
- `happymonday_credits` - Credit balance tracking
- `happymonday_orders` - Order/invoice storage
- `happymonday_payments` - Payment records
- `happymonday_costing` - Costing worksheet data

### Initial Users
The schema automatically creates two users:
- **Admin**: `dataweston@gmail.com` (role: admin)
- **Client**: `hello@happymonday.company` (role: client)

The client is given an opening credit of $1,500 (stored as -$1500 in balance_cents).

## 2. Authentication Setup

### Create Supabase Auth Users
You need to manually create auth users in Supabase for these emails:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Create the following users:

**User 1 - Admin:**
- Email: `dataweston@gmail.com`
- Password: `superf00d`
- Auto Confirm User: Yes

**User 2 - Client:**
- Email: `hello@happymonday.company`
- Password: `superf00d`
- Auto Confirm User: Yes

## 3. Environment Variables

Ensure these environment variables are set (check `.env` or Vercel env):

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key  # For API endpoints

# Brevo (Email)
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=hello@localeffortfood.com
TEAM_INBOX_EMAIL=dataweston@gmail.com

# Square (Payments)
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_ENVIRONMENT=production  # or 'sandbox' for testing
VITE_SQUARE_APP_ID=your_square_app_id
VITE_SQUARE_LOCATION_ID=your_square_location_id
```

## 4. Features

### For Clients (hello@happymonday.company)
- View credit balance (starts at -$1500, meaning $1500 credit available)
- Create new orders
  - When client creates order, email is sent to both parties
  - Order amount is added to balance (reducing credit)
- View past orders
- Request refunds/credits
- Make payments via Square (credit card)

### For Admin (dataweston@gmail.com)
- View all orders (client and own)
- Create orders (no email sent for admin orders)
- Mark orders as paid
- View credit balances
- Access costing worksheet

### Credit System
- Balance is stored in cents
- **Negative balance** = credit available (e.g., -150000 = $1500 credit)
- **Positive balance** = amount owed (e.g., 5000 = $50 owed)
- When client creates order: balance increases (credit decreases)
- When payment is made: balance decreases (credit increases)

## 5. Email Flow

### Client Creates Order
1. Client submits order
2. Order saved to database
3. Balance updated automatically (via trigger)
4. Email sent to both `dataweston@gmail.com` and `hello@happymonday.company`
5. Email includes:
   - Order number and date
   - Itemized list
   - Total amount
   - Current balance status

### Admin Creates Order
1. Admin submits order
2. Order saved to database
3. No email sent (internal record)

## 6. Payment Flow

### Client Initiates Payment
1. Client clicks "Make Payment" button
2. Square payment form loads
3. Client enters amount and card details
4. Payment processed via Square
5. Payment recorded in `happymonday_payments` table
6. Balance updated automatically (via trigger)
7. Client sees updated balance

### Square Configuration
For ACH payments, client needs to be onboarded as a vendor in Square. For now, card payments are supported. The payment button shows a note about contacting for ACH setup.

## 7. API Endpoints

The following endpoints have been created:

### `/api/happymonday/send-invoice-email`
- POST endpoint
- Sends invoice notification emails
- Called automatically when client creates order

### `/api/happymonday/process-payment`
- POST endpoint
- Processes Square card payments
- Records payment in database
- Updates balance automatically

### `/api/happymonday/refund-request`
- POST endpoint
- Sends refund request notification to admin
- Triggered when user requests refund on an order

## 8. Testing

### Test the Complete Flow

1. **Login as Client**
   - Go to `/partners/happy-monday`
   - Click "Sign in with Google"
   - Use `hello@happymonday.company` / `superf00d`
   - Verify credit balance shows -$1500

2. **Create an Order**
   - Add items to cart
   - Add notes (optional)
   - Confirm and submit
   - Check that emails were sent to both parties
   - Verify balance updated

3. **Make a Payment** (if balance is positive)
   - Click "Make Payment"
   - Enter amount
   - Use Square test card: `4111 1111 1111 1111`
   - CVV: any 3 digits
   - Expiry: any future date
   - Verify payment processed and balance updated

4. **Login as Admin**
   - Sign out, then sign in with `dataweston@gmail.com` / `superf00d`
   - Verify you can see all orders
   - Open an unpaid order
   - Click "Mark as Paid"
   - Verify status updated

5. **Test Costing Worksheet**
   - Click "Costing" tab
   - Enter cost values
   - Click "Save Costs"
   - Click "Reload Costs" to verify persistence

## 9. Troubleshooting

### No emails being sent
- Check `BREVO_API_KEY` is set correctly
- Check Brevo dashboard for send logs
- Check browser console and API logs for errors

### Payment not processing
- Verify Square credentials are correct
- Check if using sandbox vs production
- Verify `SQUARE_ACCESS_TOKEN` has payment permissions
- Check Square dashboard for payment attempts

### User can't log in
- Verify user exists in Supabase Auth
- Check that email is confirmed
- Verify password is correct (`superf00d`)
- Check that user exists in `happymonday_users` table

### Balance not updating
- Check database triggers are active
- Verify payments/orders are being inserted correctly
- Check `happymonday_credits` table manually

## 10. Next Steps

### Future Enhancements
- [ ] Add ACH payment integration (requires Square vendor onboarding)
- [ ] Add ability to edit/delete orders (admin only)
- [ ] Add payment history view
- [ ] Add automated reminders for outstanding balances
- [ ] Add CSV export for orders
- [ ] Add order search/filter functionality

---

## Support

For issues or questions:
- Email: hello@localeffortfood.com
- GitHub Issues: [Create an issue](https://github.com/yourusername/local-effort-app/issues)
