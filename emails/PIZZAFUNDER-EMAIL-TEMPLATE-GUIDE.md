# Pizza Funder Email Template Guide

## Overview
This Brevo email template provides a mobile-optimized, clean newsletter format for Pizza Funder campaign updates. It displays progress stats, upcoming events, recent updates, and calls-to-action.

## Template Location
- **File**: `emails/pizzafunder-update-template.html`
- **Type**: Brevo-compatible HTML email template
- **Mobile**: Fully responsive and optimized for mobile devices

## Features
✅ **Clean Design**: Light, uncluttered layout optimized for mobile  
✅ **Local Effort Logo**: Automatically included from your domain  
✅ **Live Progress**: Pizza sales, backers, and funding percentage  
✅ **Event Previews**: Up to 2 upcoming events with details  
✅ **Update Previews**: Latest 2 campaign updates with excerpts  
✅ **CTA Buttons**: Clear calls-to-action for backing and viewing more  
✅ **Mobile-First**: Responsive design that looks great on any device  

## Brevo Variable Mapping

### Required Variables (Progress Section)
```
{{ PIZZAS_SOLD }}        - Number of pizzas sold (e.g., "247")
{{ BACKERS_COUNT }}      - Number of backers (e.g., "52")
{{ GOAL }}               - Pizza goal (e.g., "1000")
{{ PROGRESS_PERCENT }}   - Percentage funded (e.g., "25")
{{ REMAINING }}          - Pizzas remaining (e.g., "753")
```

### Event Variables (Optional)
```
{{ EVENT_1_TITLE }}      - Event name (e.g., "Pizza Party at Central Park")
{{ EVENT_1_LOCATION }}   - Location (e.g., "Madison, WI")
{{ EVENT_1_DATE }}       - Date/time (e.g., "Saturday, Oct 21 • 5-8pm")
{{ EVENT_1_TAGLINE }}    - Optional tagline (e.g., "Family-friendly fun!")
{{ EVENT_1_FOOD_TYPE }}  - Food tag (e.g., "Wood-Fired Pizza")

{{ EVENT_2_TITLE }}      - Second event (same structure as EVENT_1)
{{ EVENT_2_LOCATION }}
{{ EVENT_2_DATE }}
{{ EVENT_2_TAGLINE }}
{{ EVENT_2_FOOD_TYPE }}
```

### Update Variables (Optional)
```
{{ UPDATE_1_TITLE }}     - Update headline (e.g., "We Hit 200 Pizzas!")
{{ UPDATE_1_DATE }}      - Date (e.g., "October 15, 2025")
{{ UPDATE_1_EXCERPT }}   - Brief excerpt (150 chars max)
{{ UPDATE_1_LINK }}      - Full link to update (e.g., "https://localeffortfood.com/pizzafunder#updates")

{{ UPDATE_2_TITLE }}     - Second update (same structure as UPDATE_1)
{{ UPDATE_2_DATE }}
{{ UPDATE_2_EXCERPT }}
{{ UPDATE_2_LINK }}
```

### System Variables
```
{{ unsubscribe }}        - Brevo unsubscribe link (automatically provided)
```

## Setup in Brevo

### 1. Upload Template
1. Go to **Campaigns** → **Templates** in Brevo
2. Click **Create a new template**
3. Choose **Paste HTML code**
4. Copy the entire `pizzafunder-update-template.html` content
5. Paste into Brevo's HTML editor
6. Save as "Pizza Funder Update Template"

### 2. Create Campaign
1. Go to **Campaigns** → **Email**
2. Click **Create a campaign**
3. Select your saved template
4. Configure recipients (your pizza backers list)

### 3. Set Variables

**EASY WAY**: Run the script and copy the output:
```bash
node scripts/prepare-brevo-email-data.js --production
```

Then open `emails/brevo-variables.json` and copy ALL the values.

**In Brevo:**
1. Click on your email campaign
2. Go to "Define campaign settings"
3. Scroll to "Variables" section
4. Paste each variable name and value

**Manual Entry Example:**
- Variable: `PIZZAS_SOLD` → Value: `247`
- Variable: `BACKERS_COUNT` → Value: `52`
- Variable: `GOAL` → Value: `1000`
- Variable: `PROGRESS_PERCENT` → Value: `25`
- Variable: `REMAINING` → Value: `753`
- (etc...)

**Or Import JSON** (if Brevo supports it):
Upload `emails/brevo-import.json` directly in Brevo's import feature.

## 🚀 EASY MODE: Auto-Generate Variables

### Option 1: Run the Automated Script (Recommended!)

We've created a script that does ALL the work for you:

```bash
# If your dev server is running (npm run dev):
node scripts/prepare-brevo-email-data.js

# Or fetch from production site:
node scripts/prepare-brevo-email-data.js --production
```

**What it does:**
1. ✅ Fetches current pizza stats from your API
2. ✅ Gets latest events and updates from Sanity
3. ✅ Formats everything perfectly for Brevo
4. ✅ Saves to `emails/brevo-variables.json` for easy copy/paste
5. ✅ Creates `emails/brevo-import.json` for direct import

**Output example:**
```
📊 Fetching campaign status...
✅ Status: 247 pizzas, 52 backers
📅 Fetching events and updates...
✅ Found 2 events, 2 updates

============================================================
📧 BREVO EMAIL VARIABLES
============================================================

PIZZAS_SOLD              = "247"
BACKERS_COUNT            = "52"
GOAL                     = "1000"
PROGRESS_PERCENT         = "25"
REMAINING                = "753"
EVENT_1_TITLE            = "Pizza Party at Central Park"
...

✅ Saved to: ./emails/brevo-variables.json
```

### Option 2: Manual API Fetch

If you prefer to do it manually:

```javascript
// 1. Fetch current status
const statusRes = await fetch('https://localeffortfood.com/api/pizzafunder/status');
const status = await statusRes.json();

// 2. Calculate values
const brevoVars = {
  PIZZAS_SOLD: status.pizzas.toString(),
  BACKERS_COUNT: status.backers.toString(),
  GOAL: status.goal.toString(),
  PROGRESS_PERCENT: Math.round((status.pizzas / status.goal) * 100).toString(),
  REMAINING: (status.goal - status.pizzas).toString()
};

// 3. Copy these values into Brevo
console.log(brevoVars);
```

## Mobile Optimization Features

✅ **Responsive Tables**: Email containers adapt to screen width  
✅ **Stacked Layout**: Elements stack vertically on mobile  
✅ **Large Touch Targets**: Buttons are 44px+ for easy tapping  
✅ **Readable Text**: Minimum 14px font size on mobile  
✅ **Optimized Images**: Logo scales down on smaller screens  
✅ **Gmail/Outlook Compatible**: Works across all major email clients  

## Testing Checklist

Before sending:
- [ ] Preview in Brevo's email preview tool
- [ ] Test on mobile (iOS Mail, Gmail app)
- [ ] Test on desktop (Gmail, Outlook)
- [ ] Verify all links work
- [ ] Check unsubscribe link
- [ ] Validate variable substitution
- [ ] Send test to yourself

## Best Practices

### Frequency
- Send updates every 1-2 weeks during active campaign
- Send immediately after major milestones (25%, 50%, 75%, 100%)
- Send 24-48 hours before events

### Subject Lines (Examples)
- "🍕 We're at {{ PROGRESS_PERCENT }}% - {{ REMAINING }} pizzas to go!"
- "Pizza Party This Weekend + Campaign Update"
- "{{ PIZZAS_SOLD }} Pizzas Sold! Here's What's Next"

### Personalization
Add to the intro section:
```html
<p>Hey {{ CONTACT.FIRSTNAME | default:"pizza lover" }}! 👋</p>
```

## Customization Tips

### Change Colors
Update these CSS variables in the `<style>` section:
```css
/* Primary gradient (header, buttons) */
background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);

/* Progress card background */
background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
```

### Add More Events
Duplicate the event card block and increment numbers:
```html
{% if EVENT_3_TITLE %}
<div class="event-card">
  <h3 class="event-title">{{ EVENT_3_TITLE }}</h3>
  <!-- ... -->
</div>
{% endif %}
```

## Troubleshooting

**Variables not showing?**
- Ensure variable names match exactly (case-sensitive)
- Check that you're using Brevo's Jinja2 syntax: `{{ VAR_NAME }}`

**Images not loading?**
- Logo must be accessible at: `https://localeffortfood.com/gallery/logo.png`
- Test the logo URL in your browser
- Ensure HTTPS (not HTTP)

**Layout broken on mobile?**
- Clear cache and test again
- Check that HTML wasn't modified during paste
- Use Brevo's mobile preview tool

**Progress bar not showing?**
- Verify `{{ PROGRESS_PERCENT }}` is a number (no % symbol in value)
- Should be between 0 and 100

## Support

For questions about this template:
- Check the PizzaFunderPage.jsx for reference structure
- Review Brevo documentation: https://developers.brevo.com/
- Test with sample data before sending to full list

---

**Last Updated**: October 15, 2025
