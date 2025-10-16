# Pizzafunder Email Integration

This document describes the Brevo email automation for the Pizza Funder campaign after successful pledges.

## Overview

The Pizza Funder campaign sends **two transactional emails** after each successful pledge:

1. **Customer Confirmation Email** - Sent to the backer with pledge details
2. **Admin Notification Email** - Sent to the team for order tracking

This follows the same pattern as other endpoints:
- `/api/crowdfund/*` - Crowdfunding receipts
- `/api/store/checkout` - Store order confirmations  
- `/api/paikka/finalize` - Paikka presale confirmations

## Architecture

### Email Service Module
**Location:** `api/pizzafunder/_lib/sendReceipt.js`

This module provides the `sendPizzafunderReceipts()` function that:
- Formats pledge data into customer and admin emails
- Sends both HTML and plain text versions
- Handles Brevo API integration
- Provides comprehensive error handling

### Integration Point
**Location:** `api/pizzafunder/pledge.js`

After a successful pledge is saved to Supabase, the endpoint:
1. Adds the backer to Brevo contact lists (via `addPizzaBackerToBrevo()`)
2. Sends transactional receipt emails (via `sendPizzafunderReceipts()`)

Both operations run **asynchronously** and don't block the API response to the customer.

## Email Templates

### Customer Confirmation Email

**Subject:** `🍕 Thank You for Your Pizza Funder Pledge!`

**Content includes:**
- Personalized greeting with backer name
- Pizza count and total amount
- Reward preference (if specified)
- Discount information (if applied)
- Payment reference ID
- Next steps and updates information

**Design:**
- Gradient header with pizza emoji
- Responsive HTML layout
- Highlighted pledge summary in yellow/gold box
- Green "What's Next" section
- Mobile-optimized

### Admin Notification Email

**Subject:** `🍕 New Pledge: [Name] - $X.XX`

**Content includes:**
- Customer contact details (name, email, phone)
- Pledge details (pizza count, amount, reward preference)
- Discount code/label (if used)
- Customer notes (if provided)
- Payment and pledge IDs for tracking
- Timestamp in Central Time

**Design:**
- Dark gradient header
- Organized tables for customer and pledge info
- Highlighted total amount
- Clean, scannable layout for quick order processing

## Environment Variables

Configure these in `.env` or Vercel environment variables:

```bash
# Required - Brevo API key
BREVO_API_KEY=xkeysib-xxx...

# Optional - Customize sender/recipient emails
PIZZAFUNDER_SENDER_EMAIL=noreply@localeffort.com
PIZZAFUNDER_SENDER_NAME="Local Effort Pizza Funder"
PIZZAFUNDER_ADMIN_EMAIL=team@localeffort.com

# Fallback email addresses (used if pizzafunder-specific vars not set)
SENDER_EMAIL=dataweston@gmail.com
SUPPORT_INBOX_EMAIL=team@localeffort.com
TEAM_INBOX_EMAIL=team@localeffort.com
CROWDFUND_RECEIPT_EMAIL=team@localeffort.com
```

### Email Hierarchy

The system uses this fallback hierarchy for sender/admin emails:

**Sender Email (From address):**
1. `PIZZAFUNDER_SENDER_EMAIL`
2. `SENDER_EMAIL`
3. Admin email (see below)

**Admin Email (Notification recipient):**
1. `PIZZAFUNDER_ADMIN_EMAIL`
2. `CROWDFUND_RECEIPT_EMAIL`
3. `SUPPORT_INBOX_EMAIL`
4. `TEAM_INBOX_EMAIL`
5. `SENDER_EMAIL`

## Email Flow

```
Customer Pledge → Square Payment → Supabase Database
                                         ↓
                              ┌──────────┴──────────┐
                              ↓                     ↓
                    Add to Brevo List    Send Receipt Emails
                    (Contact Mgmt)       (Transactional)
                                                ↓
                                    ┌───────────┴──────────┐
                                    ↓                      ↓
                          Customer Email           Admin Email
                          Confirmation             Notification
```

## Error Handling

The email system is designed to be **non-critical**:

- Emails send asynchronously in background
- Failures are logged but don't affect pledge success
- Customer still sees success message if payment completes
- Admins can manually send confirmation if needed

### Logs to Monitor

```javascript
// Success logs
✅ Customer email sent to customer@email.com
✅ Admin email sent to team@localeffort.com

// Warning logs
⚠️ BREVO_API_KEY not configured - skipping email send
⚠️ Email addresses not configured - skipping email send

// Error logs
❌ Failed to send customer email: [error message]
❌ Failed to send admin email: [error message]
```

## Testing

### Test in Development

```bash
# Set environment variables
export BREVO_API_KEY=xkeysib-your-test-key
export PIZZAFUNDER_ADMIN_EMAIL=your-test-email@example.com

# Make test pledge via frontend or API
curl -X POST http://localhost:3000/api/pizzafunder/pledge \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnon:card-nonce-ok",
    "funderName": "Test User",
    "email": "test@example.com",
    "phone": "555-1234",
    "pizzaCount": 2,
    "totalCents": 10000,
    "rewardPreference": "Pickup",
    "notes": "Test pledge"
  }'
```

### Verify Emails

1. Check inbox for customer confirmation
2. Check admin inbox for notification
3. Verify all pledge details are correct
4. Test discount codes
5. Test complimentary ($0) pledges

## Comparison with Other Endpoints

### Similarities
- All use Brevo API (`https://api.brevo.com/v3/smtp/email`)
- All send both customer and admin emails
- All include payment/order details
- All use HTML + plain text format
- All handle errors gracefully

### Differences

| Feature | Pizzafunder | Crowdfund | Store/Sale | Paikka |
|---------|------------|-----------|------------|--------|
| **QR Code** | ❌ | ❌ | ❌ | ✅ |
| **Discount Codes** | ✅ | ✅ | ❌ | ❌ |
| **Reward Options** | ✅ | ✅ | ❌ | ❌ |
| **Pickup Info** | Future | ✅ | ✅ | ✅ |
| **Item Breakdown** | Simple count | Items list | Items list | Items list |
| **Contact List Sync** | ✅ | ✅ | ❌ | ❌ |

## Future Enhancements

Potential improvements for pizzafunder emails:

1. **QR Code Generation** - Add QR codes for pickup (like Paikka)
2. **Campaign Updates** - Send progress updates when funding goals reached
3. **Fulfillment Tracking** - Notify when pizzas are ready
4. **Email Templates** - Move to Brevo template system for easier updates
5. **A/B Testing** - Test different email formats for better engagement
6. **Unsubscribe Links** - Add preference management links
7. **Attachments** - Include PDF receipts or thank-you cards

## Troubleshooting

### Emails not sending

1. **Check API key:**
   ```bash
   echo $BREVO_API_KEY
   ```

2. **Check logs:**
   ```bash
   # Vercel logs
   vercel logs
   
   # Local logs
   # Check terminal output for [pizzafunder.receipts] messages
   ```

3. **Verify Brevo account:**
   - Login to Brevo dashboard
   - Check API key is active
   - Check sender email is verified
   - Check daily sending limits

### Customer not receiving email

1. Check spam/junk folder
2. Verify email address is correct in database
3. Check Brevo logs for delivery status
4. Verify sender email is authenticated (SPF/DKIM)

### Admin not receiving email

1. Check `PIZZAFUNDER_ADMIN_EMAIL` is set correctly
2. Check fallback email variables
3. Verify email isn't filtered by rules
4. Check Brevo dashboard for delivery logs

## Related Documentation

- [Brevo API Documentation](https://developers.brevo.com/docs)
- [Brevo SMTP Email Endpoint](https://developers.brevo.com/reference/sendtransacemail)
- `docs/BREVO-SETUP-COMPLETE.md` - General Brevo integration setup
- `docs/brevo-integration.md` - Brevo configuration guide
- `docs/pizzafunder-email-flow.md` - Email flow documentation
- `api/crowdfund/_lib/sendReceipt.js` - Crowdfunding email reference
- `api/paikka/finalize.js` - Paikka email reference (with QR codes)

## Support

For issues or questions:
1. Check logs for error messages
2. Verify environment variables are set
3. Test with Brevo dashboard sending tool
4. Contact Brevo support for API issues
5. Check this repository's issues for known problems
