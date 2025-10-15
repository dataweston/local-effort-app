# 🎯 SIMPLE GUIDE: Send Pizza Funder Email with Brevo

## Step-by-Step (No Technical Skills Needed!)

### Step 1: Get Your Data (2 minutes)

**Option A - EASIEST! Use the Web Tool:**
1. Go to: https://localeffortfood.com/brevo-email-helper.html
   (Or if testing locally: http://localhost:5173/brevo-email-helper.html)
2. Click the big "Fetch Latest Pizza Data" button
3. See all your variables in a nice table! 📊
4. Click "Copy All Variables as JSON"
5. Done! You have everything you need! ✅

**Option B - Command Line (if you have Node.js):**
1. Open your terminal
2. Run this command:
   ```bash
   node scripts/prepare-brevo-email-data.js --production
   ```
3. Look for the file `emails/brevo-variables.json` that was created
4. Open it - these are your values! 📋

**Option C - Manual (if nothing else works):**
1. Go to: https://localeffortfood.com/api/pizzafunder/status
2. You'll see something like:
   ```json
   {
     "pizzas": 247,
     "backers": 52,
     "goal": 1000
   }
   ```
3. Write these numbers down! ✍️
4. Do the math:
   - PROGRESS_PERCENT = (pizzas ÷ goal) × 100
   - REMAINING = goal - pizzas

---

### Step 2: Upload Template to Brevo (5 minutes)

1. **Log into Brevo** (https://app.brevo.com)

2. **Go to Campaigns → Email Templates**
   - Click "Templates" in the left menu
   - Click "Create a template"

3. **Choose "Paste HTML"**
   - Click "Paste HTML code"

4. **Copy the template**
   - Open `emails/pizzafunder-update-template.html`
   - Select ALL (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)

5. **Paste into Brevo**
   - Paste in the HTML editor
   - Click "Save"
   - Name it: "Pizza Funder Update"

✅ Template uploaded!

---

### Step 3: Create Your Email Campaign (10 minutes)

1. **Start New Campaign**
   - Click "Campaigns" → "Email"
   - Click "Create a campaign"
   - Choose "Regular campaign"

2. **Select Your Template**
   - Find "Pizza Funder Update" template
   - Click "Use this template"

3. **Fill in the Variables**

   Here's where you use those numbers from Step 1!

   **Required Variables** (you MUST fill these):
   
   | Variable Name | Where to Get Value | Example |
   |--------------|-------------------|---------|
   | `PIZZAS_SOLD` | From your API or script | `247` |
   | `BACKERS_COUNT` | From your API or script | `52` |
   | `GOAL` | Usually 1000 | `1000` |
   | `PROGRESS_PERCENT` | Calculate: (PIZZAS_SOLD ÷ GOAL) × 100 | `25` |
   | `REMAINING` | Calculate: GOAL - PIZZAS_SOLD | `753` |

   **In Brevo:**
   - Look for "Personalization" or "Variables" section
   - Add each variable:
     ```
     Name: PIZZAS_SOLD
     Value: 247
     
     Name: BACKERS_COUNT
     Value: 52
     
     [repeat for all...]
     ```

   **Optional Variables** (leave blank if you don't have events/updates):
   
   | Variable Name | What It Is | Example |
   |--------------|-----------|---------|
   | `EVENT_1_TITLE` | Name of upcoming event | `Pizza Party at Central Park` |
   | `EVENT_1_LOCATION` | Where the event is | `Madison, WI` |
   | `EVENT_1_DATE` | When it happens | `Saturday, Oct 21 • 5-8pm` |
   | `EVENT_1_TAGLINE` | Short description | `Bring the family!` |
   | `EVENT_1_FOOD_TYPE` | Type of food | `Wood-Fired Pizza` |
   | `UPDATE_1_TITLE` | Latest update headline | `We Hit 200 Pizzas!` |
   | `UPDATE_1_DATE` | When you posted it | `October 15, 2025` |
   | `UPDATE_1_EXCERPT` | Brief summary (150 chars) | `Amazing news! We've crossed...` |
   | `UPDATE_1_LINK` | Link to read more | `https://localeffortfood.com/pizzafunder` |

4. **Set Email Details**
   - **From Name:** `Local Effort` (or your name)
   - **From Email:** Your verified Brevo email
   - **Subject Line:** Use a variable! 
     ```
     🍕 We're at {{ PROGRESS_PERCENT }}% - {{ REMAINING }} pizzas to go!
     ```

5. **Choose Recipients**
   - Select your "Pizza Backers" list
   - Or upload a CSV with email addresses

---

### Step 4: Test Before Sending! (2 minutes)

1. **Send Test Email**
   - Look for "Send a test" button
   - Enter YOUR email address
   - Click "Send test"

2. **Check Your Inbox**
   - Open the test email on your phone
   - Check that numbers look correct
   - Click all the buttons to test links

3. **Problems?**
   - Numbers showing as `{{ PIZZAS_SOLD }}`? → You forgot to set the variable!
   - Layout looks broken? → Template might not have pasted correctly
   - Images not showing? → Check that logo URL is correct

---

### Step 5: Send! (1 minute)

1. **Final Review**
   - ✅ All variables filled in?
   - ✅ Test email looks good?
   - ✅ Recipients list is correct?
   - ✅ Subject line is engaging?

2. **Schedule or Send**
   - Send now: Click "Send campaign"
   - Or schedule for later: Choose date/time

3. **🎉 Done!**

---

## Quick Troubleshooting

### "I don't see where to add variables in Brevo"

Brevo calls them "Personalization" or "Attributes". Look for:
- Settings → Personalization
- Or when editing email, look for `{{ }}` symbol

### "My script isn't working"

Try the manual way:
1. Visit: https://localeffortfood.com/api/pizzafunder/status
2. Copy the numbers you see
3. Do the math:
   - `PROGRESS_PERCENT` = (pizzas ÷ goal) × 100
   - `REMAINING` = goal - pizzas

### "I don't have any events or updates"

That's okay! Leave those variables empty. The template will show:
- "More events coming soon!"
- "We're cooking up some exciting updates!"

### "The email looks different in Gmail vs Outlook"

This is normal! Email clients render HTML differently. The template is designed to look good in all of them, but minor differences are expected.

---

## Pro Tips

💡 **Subject Line Ideas:**
- `🍕 {{ PIZZAS_SOLD }} Pizzas Sold! Here's What's Next`
- `We're {{ PROGRESS_PERCENT }}% There - Thank You!`
- `Pizza Update: {{ REMAINING }} to Go!`

💡 **Best Time to Send:**
- Tuesday-Thursday, 10am-2pm (highest open rates)
- Avoid Monday mornings and Friday afternoons

💡 **Frequency:**
- Send every 1-2 weeks during campaign
- Send after hitting milestones (25%, 50%, 75%, 100%)
- Send 24-48 hours before events

---

## Need More Help?

1. **Brevo Documentation:** https://help.brevo.com/
2. **Check the detailed guide:** `PIZZAFUNDER-EMAIL-TEMPLATE-GUIDE.md`
3. **Test with yourself first** - always send to your own email before the full list!

---

**Remember:** You can always edit and resend! Don't stress about perfection. 🍕
