# ✅ Brevo Auto-Sync Setup Complete!

## What Just Happened?

I've implemented **automatic Brevo contact sync** for your Pizza Funder campaign! 🎉

When someone makes a purchase on `/pizzafunder`, they will now **automatically** be:
- ✅ Added to Brevo as a contact
- ✅ Added to your specified email list(s)
- ✅ Tagged with custom attributes (pizza count, amount, preference, etc.)

## 📁 Files Created/Modified

### New Files:
1. **`api/_lib/brevo.js`** - Brevo integration utilities
2. **`docs/brevo-integration.md`** - Complete setup guide
3. **`scripts/test-brevo-integration.js`** - Test script
4. **`.env.brevo.example`** - Environment variable template

### Modified Files:
1. **`api/pizzafunder/pledge.js`** - Added automatic Brevo sync
2. **`emails/README.md`** - Updated with integration info

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Brevo Credentials

**A) Get API Key:**
1. Go to: https://app.brevo.com/settings/keys/api
2. Click "Generate a new API key"
3. Name it: `Pizza Funder`
4. Copy the key (starts with `xkeysib-`)

**B) Get List ID:**
1. Go to: https://app.brevo.com/contact/list
2. Create a list called "Pizza Backers" (or use existing)
3. Click on the list
4. Look at URL: `https://app.brevo.com/contact/list/id/123`
5. The number `123` is your List ID

### Step 2: Add to .env File

Add these two lines to your `.env` file:

```bash
BREVO_API_KEY=xkeysib-your-actual-key-here
BREVO_PIZZAFUNDER_LIST_IDS=123
```

**Replace:**
- `xkeysib-your-actual-key-here` with your actual API key from Step 1A
- `123` with your actual List ID from Step 1B

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C if running)
# Then restart:
npm run dev
```

### Step 4: Test It!

```bash
node scripts/test-brevo-integration.js
```

You should see:
```
✅ SUCCESS! Contact added to Brevo
```

If it works, go to Brevo and search for `test@example.com` - you should see the test contact!

## 🎯 How It Works

### When a Customer Makes a Pledge:

**Before (what was happening):**
1. ✅ Payment processed via Square
2. ✅ Saved to Supabase database
3. ✅ Email sent to customer
4. ❌ You had to manually export and import to Brevo

**Now (automatic!):**
1. ✅ Payment processed via Square
2. ✅ Saved to Supabase database
3. ✅ Email sent to customer
4. ✅ **Automatically added to Brevo** 🎉
5. ✅ **Added to your "Pizza Backers" list**
6. ✅ **Tagged with all their info**

### Contact Attributes in Brevo:

Every backer will have these custom fields you can use in emails:

```
FIRSTNAME: John
LASTNAME: Doe
PIZZA_COUNT: 5
PLEDGE_AMOUNT: 75.00
REWARD_PREFERENCE: pickup
PLEDGE_DATE: 2025-10-15
DISCOUNT_CODE: since2022 (if used)
SMS: +15551234567 (if provided)
```

## 📧 Using in Emails

Now you can personalize your Brevo campaigns:

```html
<p>Hey {{ contact.FIRSTNAME }}!</p>
<p>Thanks for pledging {{ contact.PIZZA_COUNT }} pizzas!</p>
<p>Your total: ${{ contact.PLEDGE_AMOUNT }}</p>
<p>You chose: {{ contact.REWARD_PREFERENCE }}</p>
```

## 🔍 Verify It's Working

### Method 1: Make a Test Pledge
1. Go to your `/pizzafunder` page
2. Make a small test pledge ($1 or use a test card)
3. Check Brevo → Contacts
4. Search for the email you used
5. Should see the contact with all attributes!

### Method 2: Check Server Logs
When pledge succeeds, you should see in logs:
```
[Brevo] ✅ Contact added: john@example.com (Lists: 123)
```

If it fails (won't affect pledge):
```
[pizzafunder.pledge] Brevo sync failed (non-critical): ...
```

## 🛡️ Important: Non-Blocking

The Brevo sync is **non-blocking** and **non-critical**:
- ✅ If Brevo is down, pledges still work
- ✅ If API key is wrong, pledges still work
- ✅ Errors logged but don't break the payment flow
- ✅ Your revenue is never at risk!

## 📊 What You Can Do Now

### 1. Welcome Email Automation
Create an automated welcome series in Brevo:
- Trigger: When contact joins "Pizza Backers" list
- Send immediately: Welcome + next steps
- Send in 1 day: Campaign updates
- Send in 3 days: Pickup/delivery info

### 2. Campaign Updates
Use the template from `emails/pizzafunder-update-template.html`:
- Send to "Pizza Backers" list only
- Personalize with {{ contact.FIRSTNAME }}
- Show progress toward goal

### 3. Segment Your Audience
Filter backers by attributes:
- **High value:** `PLEDGE_AMOUNT > 100`
- **Pickup only:** `REWARD_PREFERENCE = pickup`
- **Discount users:** `DISCOUNT_CODE is not empty`
- **Recent backers:** `PLEDGE_DATE > 2025-10-01`

## 🆘 Troubleshooting

**"Test script fails"**
- Check `BREVO_API_KEY` is correct in `.env`
- Check List ID exists in Brevo
- Restart server after adding .env variables

**"Contact not showing in Brevo"**
- Make sure server is restarted
- Check server logs for errors
- Verify API key has write permissions

**"Want to disable temporarily"**
- Just comment out `BREVO_API_KEY` in `.env`
- Integration will skip silently

## 📖 Full Documentation

- **Setup Guide:** `docs/brevo-integration.md`
- **API Reference:** `api/_lib/brevo.js`
- **Integration Code:** `api/pizzafunder/pledge.js`
- **Email Templates:** `emails/` folder

## ✨ You're All Set!

Once you add those two environment variables and restart, you're done! Every pizza backer will automatically sync to Brevo. 

**Need help?** Check `docs/brevo-integration.md` for detailed troubleshooting.

---

**Questions?** The integration is already coded and ready to go. Just add the credentials! 🍕
