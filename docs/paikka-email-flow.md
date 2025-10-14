# Paikka Email & Success Flow Documentation

**Date:** October 14, 2025  
**Status:** ✅ PRODUCTION READY

---

## Overview

The Paikka presale now includes a complete email notification system with QR code generation for customer pickup. When a customer completes their purchase, they receive a beautiful confirmation email with a QR code, and you receive an admin notification email.

---

## Complete Flow

```
Customer Checkout
    ↓
Square Payment Processing (api/paikka/pay.js)
    ↓
Redirect to /paikka/success?state=...&paymentId=...
    ↓
Success Page Calls POST /api/paikka/finalize
    ↓
┌─────────────────────────────────────────┐
│  api/paikka/finalize.js                 │
│  1. Decode checkout state               │
│  2. Calculate order totals              │
│  3. Generate QR code (base64)           │
│  4. Build HTML emails                   │
│  5. Send customer email via Brevo       │
│  6. Send admin email via Brevo          │
│  7. Return success response             │
└─────────────────────────────────────────┘
    ↓
Success Page Displays Confirmation
```

---

## Implementation Details

### File Modified

**`api/paikka/finalize.js`**

Complete rewrite to handle email generation and sending directly without requiring a separate backend service.

**Key Changes:**
- Removed dependency on external backend service (`/orders/create`)
- Added QR code generation using `qrcode` library
- Integrated Brevo email API directly
- Created professional HTML email templates
- Added comprehensive error handling

---

## Email Templates

### Customer Email

**Subject:** "🎉 Your Paikka Presale Order is Confirmed!"

**Features:**
- ✅ Orange gradient header with Local Effort x Paikka branding
- ✅ Personalized greeting ("Hi {firstName}!")
- ✅ QR code embedded as base64 image (300x300px)
- ✅ Complete order summary table
- ✅ Tip display (when applicable)
- ✅ Total amount
- ✅ Pickup instructions with location
- ✅ Payment reference ID for tracking
- ✅ Support contact information
- ✅ Fully responsive (mobile-friendly)

**QR Code Data:**
```json
{
  "paymentReference": "sq0...",
  "email": "customer@email.com",
  "firstName": "John",
  "lastName": "Doe",
  "totalCents": 4500,
  "timestamp": "2025-10-14T12:34:56.789Z"
}
```

### Admin Email

**Subject:** "New Paikka Order: John Doe - $45.00"

**Features:**
- ✅ Dark gray header with emoji indicator
- ✅ Customer details (name, email)
- ✅ Payment ID for Square reconciliation
- ✅ Full order table with quantities
- ✅ Subtotal, tip, total breakdown
- ✅ Timestamp in Central Time
- ✅ Clean, professional layout

**Purpose:** Quick reference for order fulfillment and payment tracking

---

## Environment Variables

### Required (All Already Configured)

```bash
# Brevo Email Service
BREVO_API_KEY="xkeysib-..." # ✅ Set in .env

# Email Addresses
SENDER_EMAIL="dataweston@gmail.com" # ✅ Default
SUPPORT_INBOX_EMAIL="dataweston@gmail.com" # ✅ Default
```

### Vercel Production

Ensure these are set in Vercel with **Production** scope:
- ✅ `BREVO_API_KEY`
- ✅ `SENDER_EMAIL` (optional, has default)
- ✅ `SUPPORT_INBOX_EMAIL` (optional, has default)

---

## Dependencies

### `qrcode` Package

**Status:** ✅ Already installed in monorepo

```bash
# Already available in:
# - apps/api/package.json
# - local-office/services/labeler/package.json
```

**Usage:**
```javascript
const QRCode = require('qrcode');
const qrCodeDataUrl = await QRCode.toDataURL(data, {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.92,
  margin: 1,
  width: 300,
});
```

---

## API Endpoint

### POST `/api/paikka/finalize`

**Request Body:**
```json
{
  "state": "base64-encoded-checkout-state",
  "paymentReference": "sq0idp-..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "paymentReference": "sq0idp-...",
  "qrCode": "data:image/png;base64,...",
  "order": {
    "items": [
      {
        "sku": "presale-muffuletta",
        "qty": 2,
        "title": "Muffuletta",
        "isDairyFree": false,
        "price": 1200,
        "subtotal": 2400
      }
    ],
    "subtotalCents": 2400,
    "tipCents": 360,
    "totalCents": 2760,
    "customer": {
      "email": "customer@email.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Response (Error):**
```json
{
  "error": "Missing checkout state."
}
```

**Error Handling:**
- Missing state → 400 error
- Invalid items → 400 error
- Missing payment reference → 400 error
- Email sending failure → Logged, but doesn't fail request
- QR code generation failure → Logged, email still sent (without QR code)

---

## Testing

### Local Development

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Visit Paikka page:**
   ```
   http://localhost:5173/paikka
   ```

3. **Complete test order:**
   - Add sandwiches to cart
   - Fill in YOUR email address
   - Use Square test card: `4111 1111 1111 1111`
   - CVV: `111`, ZIP: `12345`
   - Click "Pay"

4. **Verify success:**
   - Redirected to `/paikka/success`
   - Success message displayed
   - Check email inbox for:
     * Customer email with QR code
     * Admin notification email

### Production Testing

Same steps as local, but use production URL:
```
https://localeffortfood.com/paikka
```

**Important:** Use a real email address to receive QR code.

---

## Email Service (Brevo)

### API Endpoint

```
POST https://api.brevo.com/v3/smtp/email
```

### Headers

```javascript
{
  'api-key': process.env.BREVO_API_KEY,
  'accept': 'application/json',
  'content-type': 'application/json'
}
```

### Payload Structure

```javascript
{
  sender: { 
    name: 'Local Effort', 
    email: 'dataweston@gmail.com' 
  },
  to: [{ 
    email: 'customer@email.com', 
    name: 'John Doe' 
  }],
  subject: 'Your Order Confirmation',
  htmlContent: '<html>...</html>'
}
```

### Rate Limits

- Brevo free tier: 300 emails/day
- No rate limiting in code (Brevo handles it)

---

## Error Handling

### Email Sending Failures

**Strategy:** Non-blocking

```javascript
try {
  await sendBrevoEmail(customerEmail);
  await sendBrevoEmail(adminEmail);
} catch (emailError) {
  console.error('[paikka/finalize] Email sending failed:', emailError);
  // Continue - order is still valid even if email fails
}
```

**Rationale:**
- Payment already processed via Square
- Order data is in response
- Customer can still complete pickup
- Email failure shouldn't fail the entire order

### QR Code Generation Failures

**Strategy:** Graceful degradation

```javascript
const qrCodeDataUrl = await generateQRCode(qrData);
// If null, email still sends but shows fallback message
```

**Fallback Message:**
```html
<p style="color: #dc2626;">
  QR code generation failed. Please show your confirmation email.
</p>
```

---

## Success Page Integration

### `src/pages/PaikkaSuccessPage.jsx`

**Current Behavior:**
1. Reads `state` and `paymentReference` from URL params
2. Calls `/api/paikka/finalize` on mount
3. Displays order confirmation
4. Shows QR code (if returned in response)

**No changes needed** - the page already handles the finalize endpoint correctly.

---

## Customization

### Changing Email Sender

Update environment variables:

```bash
# .env or Vercel
SENDER_EMAIL="yourname@example.com"
SUPPORT_INBOX_EMAIL="support@example.com"
```

### Changing Email Design

Edit HTML templates in `api/paikka/finalize.js`:

```javascript
const customerEmailHtml = `
  <!DOCTYPE html>
  <html>
  ...
  </html>
`;
```

**Tips:**
- Inline CSS only (email clients don't support external stylesheets)
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Keep design simple for better compatibility
- Use tables for layout (better email client support)

### Changing QR Code Size

Adjust QR code generation options:

```javascript
const qrCodeDataUrl = await QRCode.toDataURL(data, {
  errorCorrectionLevel: 'M', // L, M, Q, H
  type: 'image/png',
  quality: 0.92,
  margin: 1,
  width: 300, // Change this
});
```

---

## Architecture Comparison

### Old Flow (Broken)

```
finalize.js → fetch(API_BASE_URL/orders/create) → ❌ 404 Error
```

**Problem:** External backend service didn't exist

### New Flow (Working)

```
finalize.js → Generate QR → Send Brevo Emails → ✅ Success
```

**Benefits:**
- ✅ Self-contained (no external dependencies)
- ✅ Direct Brevo API integration
- ✅ QR code generation inline
- ✅ Better error handling
- ✅ Faster (no extra HTTP roundtrip)

---

## Security Considerations

### API Key Protection

✅ `BREVO_API_KEY` is server-side only (not exposed to browser)

### Email Validation

✅ Email addresses validated before sending

### QR Code Data

⚠️ QR codes contain:
- Payment reference (public ID)
- Email address (customer's own)
- Name (customer's own)
- Total amount (not sensitive)

**Recommendation:** QR codes are safe for customer use at pickup.

---

## Monitoring

### Check Email Delivery

**Brevo Dashboard:**
```
https://app.brevo.com/
→ Campaigns → Transactional Emails
```

**Metrics:**
- Sent count
- Delivered count
- Opened count
- Failed deliveries

### Check Server Logs

```bash
# Local development
# Check terminal output for errors

# Vercel production
# Check Vercel logs for [paikka/finalize] entries
```

---

## Troubleshooting

### Emails Not Sending

**Checklist:**
1. ✅ `BREVO_API_KEY` set in environment
2. ✅ API key valid and not expired
3. ✅ Brevo account has email quota available
4. ✅ Sender email verified in Brevo
5. ✅ Network connectivity to api.brevo.com

**Debug:**
```javascript
console.error('[paikka/finalize] Email sending failed:', emailError);
```

### QR Code Not Showing

**Possible Causes:**
1. QR code generation failed (check logs)
2. Email client blocking base64 images (rare)
3. Image too large for email client

**Solution:**
- Email includes fallback message
- Customer can still show confirmation email

### Success Page Not Loading

**Checklist:**
1. ✅ `state` param in URL
2. ✅ `paymentReference` param in URL
3. ✅ Valid checkout state (not corrupted)
4. ✅ `/api/paikka/finalize` endpoint responding

---

## Future Enhancements

### Potential Improvements

1. **Database Storage**
   - Store orders in Firestore/database
   - Enable order lookup and history
   - Track pickup status

2. **SMS Notifications**
   - Send SMS via Brevo
   - Text customer when order ready
   - Reminder 1 hour before pickup

3. **QR Code Scanning App**
   - Build staff app to scan QR codes
   - Mark orders as fulfilled
   - Track pickup times

4. **Email Customization**
   - Allow dynamic email templates from Sanity CMS
   - A/B test different email designs
   - Personalize based on order items

5. **Receipt Attachments**
   - Generate PDF receipts
   - Attach to customer email
   - Include tax information

---

## Conclusion

The Paikka presale now has a **complete, production-ready email and success flow**:

✅ Square payment processing  
✅ Beautiful customer emails with QR codes  
✅ Admin notification emails  
✅ Success page confirmation  
✅ Professional, responsive design  
✅ Comprehensive error handling  
✅ No external dependencies  

The system is **simple, reliable, and ready to use** for the Paikka presale event.
