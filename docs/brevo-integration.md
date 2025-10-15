# Brevo Integration for Pizza Funder

## Overview
Automatically add pizza backers to your Brevo email list when they make a purchase on `/pizzafunder`.

## ✅ What's Already Done

The integration is **already implemented** in your pledge endpoint (`api/pizzafunder/pledge.js`). When someone backs the campaign:

1. ✅ Payment is processed via Square
2. ✅ Pledge is saved to Supabase
3. ✅ **NEW:** Contact is automatically added to Brevo
4. ✅ Contact is added to your specified email list(s)

## 🔧 Setup Required

### Step 1: Get Your Brevo API Key

1. Log into Brevo: https://app.brevo.com
2. Go to **Settings** → **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Name it: `Pizza Funder Integration`
5. Copy the API key (starts with `xkeysib-`)

### Step 2: Get Your List ID(s)

1. In Brevo, go to **Contacts** → **Lists**
2. Find or create a list called **"Pizza Backers"** or similar
3. Click on the list
4. Look at the URL - it will be like: `https://app.brevo.com/contact/list/id/123`
5. The number (`123`) is your **List ID**
6. You can use multiple lists by separating with commas: `123,456`

### Step 3: Add Environment Variables

Add these to your `.env` file:

```bash
# Brevo (SendinBlue) Integration
BREVO_API_KEY=xkeysib-your-api-key-here
BREVO_PIZZAFUNDER_LIST_IDS=123,456
```

**Replace:**
- `xkeysib-your-api-key-here` with your actual Brevo API key
- `123,456` with your actual List ID(s)

### Step 4: Restart Your Server

```bash
# Stop and restart to load new environment variables
npm run dev
```

## 🎉 That's It!

Now when someone makes a pledge on `/pizzafunder`, they will automatically be:
- ✅ Added to Brevo as a contact
- ✅ Added to your specified list(s)
- ✅ Tagged with custom attributes (pizza count, amount, etc.)

## 📊 Contact Attributes

Each pizza backer will have these custom attributes in Brevo:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `FIRSTNAME` | First name from pledge | `John` |
| `LASTNAME` | Last name from pledge | `Doe` |
| `PIZZA_COUNT` | Number of pizzas pledged | `5` |
| `PLEDGE_AMOUNT` | Amount paid in dollars | `75.00` |
| `REWARD_PREFERENCE` | Delivery/pickup preference | `pickup` |
| `PLEDGE_DATE` | Date of pledge | `2025-10-15` |
| `DISCOUNT_CODE` | Discount code used | `since2022` |
| `SMS` | Phone number (if provided) | `+1234567890` |

## 📧 Using in Email Campaigns

You can now use these in your Brevo email templates:

```html
<p>Hey {{ contact.FIRSTNAME }}!</p>
<p>Thanks for pledging {{ contact.PIZZA_COUNT }} pizzas!</p>
<p>Your preference: {{ contact.REWARD_PREFERENCE }}</p>
```

## 🔍 Testing

### Test the Integration

1. Make a test pledge on `/pizzafunder` (use a test credit card)
2. Check Brevo → Contacts
3. Search for the email you used
4. Verify the contact exists with all attributes

### What If It Fails?

**Don't worry!** The Brevo integration is **non-blocking**:
- ✅ Pledge will still succeed
- ✅ Payment will still process
- ✅ Data is saved to Supabase
- ❌ Brevo sync fails silently in background

Check your server logs for errors:
```
[pizzafunder.pledge] Brevo sync failed (non-critical): ...
```

## 🎛️ Advanced Configuration

### Multiple Lists

You can add backers to multiple lists simultaneously:

```bash
# Add to "Pizza Backers" (123) and "All Customers" (456)
BREVO_PIZZAFUNDER_LIST_IDS=123,456,789
```

### Disable Brevo Integration

To temporarily disable without removing code:

```bash
# Just comment out or remove the API key
# BREVO_API_KEY=xkeysib-...
```

The integration will detect missing API key and skip silently.

### Update Existing Contacts

The integration automatically updates existing contacts:
- If email already exists in Brevo → Updates attributes and adds to lists
- If email is new → Creates new contact

## 📝 Example Workflow

1. **Customer pledges** 5 pizzas on `/pizzafunder`
2. **Payment processed** via Square ($75)
3. **Saved to Supabase** with all details
4. **Added to Brevo:**
   - Email: `john@example.com`
   - Name: `John Doe`
   - List: "Pizza Backers" (ID: 123)
   - Attributes: `PIZZA_COUNT=5`, `PLEDGE_AMOUNT=75.00`, etc.
5. **You can now email them** using Brevo campaigns!

## 🚀 Next Steps

Now that backers are in Brevo, you can:

1. **Send Welcome Email**
   - Create a welcome series in Brevo
   - Trigger when someone joins "Pizza Backers" list

2. **Send Campaign Updates**
   - Use the email template from `emails/pizzafunder-update-template.html`
   - Send to the "Pizza Backers" list

3. **Segment Your Backers**
   - High pledgers: `PLEDGE_AMOUNT > 100`
   - Pickup vs Delivery: Filter by `REWARD_PREFERENCE`
   - Discount users: Filter by `DISCOUNT_CODE`

## 🆘 Troubleshooting

### "Contact not appearing in Brevo"

1. Check server logs for errors
2. Verify `BREVO_API_KEY` is set correctly
3. Verify `BREVO_PIZZAFUNDER_LIST_IDS` is set
4. Test API key with a manual API call:
   ```bash
   curl -X GET "https://api.brevo.com/v3/account" \
     -H "api-key: YOUR_API_KEY"
   ```

### "Duplicate parameter error"

This is normal! It means contact already exists. The system will automatically update them instead.

### "List ID not found"

Double-check your List ID in Brevo. Make sure it's a number, not a name.

## 📞 Support

- **Brevo API Docs:** https://developers.brevo.com/reference/createcontact
- **Integration Code:** `api/_lib/brevo.js`
- **Pledge Handler:** `api/pizzafunder/pledge.js`

---

**Last Updated:** October 15, 2025
