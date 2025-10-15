## 📧 Pizza Funder Email Templates

Complete email system for sending Pizza Funder campaign updates via Brevo.

**✨ NEW:** Automatic contact sync! Pizza backers are automatically added to Brevo when they pledge.  
📖 **Setup Guide:** See `docs/brevo-integration.md`

## 🎯 What's Included

### 📄 Files

1. **pizzafunder-update-template.html** - Mobile-optimized Brevo email template
2. **brevo-email-helper.html** - Web tool to generate variables (access at `/brevo-email-helper.html`)
3. **SIMPLE-BREVO-GUIDE.md** - Step-by-step guide for non-technical users
4. **PIZZAFUNDER-EMAIL-TEMPLATE-GUIDE.md** - Detailed technical documentation
5. **QUICK-REFERENCE.md** - One-page cheat sheet
6. **scripts/prepare-brevo-email-data.js** - Node.js script to fetch data

### 🚀 Quick Start (Choose One)

#### Option 1: Web Tool (Easiest!)
1. Visit: https://localeffortfood.com/brevo-email-helper.html
2. Click "Fetch Latest Pizza Data"
3. Copy the JSON output
4. Upload template to Brevo
5. Paste variables and send!

#### Option 2: Command Line
```bash
node scripts/prepare-brevo-email-data.js --production
cat emails/brevo-variables.json
```

#### Option 3: Manual
1. Visit: https://localeffortfood.com/api/pizzafunder/status
2. Write down the numbers
3. Calculate: `PROGRESS_PERCENT = (pizzas / goal) × 100`
4. Fill into Brevo manually

---

## 📖 Documentation

**New to this?** Start here:
- Read: `SIMPLE-BREVO-GUIDE.md` (step-by-step with screenshots)

**Need quick answers?** Reference:
- Read: `QUICK-REFERENCE.md` (one-page cheat sheet)

**Technical details?** Deep dive:
- Read: `PIZZAFUNDER-EMAIL-TEMPLATE-GUIDE.md` (full documentation)

---

## ✨ Features

✅ **Mobile-Optimized** - Looks great on all devices  
✅ **Auto-Fetch Data** - Live pizza stats from your API  
✅ **Events & Updates** - Pulls from Sanity CMS  
✅ **Branded** - Includes your Local Effort logo  
✅ **Clean Design** - Light, uncluttered layout  
✅ **Easy Variables** - Copy/paste ready  

---

## 📊 Variables Reference

### Required (5)
- `PIZZAS_SOLD` - Current pizza count
- `BACKERS_COUNT` - Number of supporters
- `GOAL` - Target pizza count
- `PROGRESS_PERCENT` - Funding percentage
- `REMAINING` - Pizzas left to goal

### Optional Events (10)
- `EVENT_1_TITLE`, `EVENT_1_LOCATION`, `EVENT_1_DATE`, etc.
- `EVENT_2_TITLE`, `EVENT_2_LOCATION`, `EVENT_2_DATE`, etc.

### Optional Updates (8)
- `UPDATE_1_TITLE`, `UPDATE_1_DATE`, `UPDATE_1_EXCERPT`, `UPDATE_1_LINK`
- `UPDATE_2_TITLE`, `UPDATE_2_DATE`, `UPDATE_2_EXCERPT`, `UPDATE_2_LINK`

---

## 🎨 Template Preview

The email includes:
- **Header** - Logo and title with gradient
- **Progress Section** - Visual stats and progress bar
- **Events** - Upcoming pizza parties (if available)
- **Updates** - Recent campaign news (if available)
- **CTA Buttons** - "Back This Project" and "View All Events"
- **Footer** - Contact info and unsubscribe

---

## 🔧 Customization

### Change Colors
Edit the CSS in `pizzafunder-update-template.html`:
```css
/* Primary gradient */
background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);

/* Progress card */
background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
```

### Add More Sections
Duplicate any section block and increment variable names (EVENT_3, UPDATE_3, etc.)

---

## 📅 Best Practices

**When to Send:**
- Weekly during active campaign
- After hitting milestones (25%, 50%, 75%, 100%)
- 24-48 hours before events

**Subject Lines:**
- Use variables for personalization
- Keep under 50 characters
- Include emoji for attention: 🍕

**Testing:**
- Always send to yourself first
- Check on mobile AND desktop
- Verify all links work

---

## 🆘 Troubleshooting

**Web tool not working?**
- Make sure you're accessing through the dev server or live site
- Check browser console for errors

**Script errors?**
- Ensure dev server is running for local testing
- Use `--production` flag for live data

**Variables not showing in email?**
- You forgot to fill them in Brevo
- Variable names are case-sensitive

**Template looks broken?**
- Re-paste the HTML (it might have been modified)
- Clear browser cache and try again

---

## 📞 Support

- **Brevo Integration:** See `../docs/brevo-integration.md` for automatic contact sync
- **Technical Issues:** Check `PIZZAFUNDER-EMAIL-TEMPLATE-GUIDE.md`
- **Step-by-Step Help:** Read `SIMPLE-BREVO-GUIDE.md`
- **Quick Answers:** See `QUICK-REFERENCE.md`
- **Brevo Docs:** https://help.brevo.com/

---

## 🎉 You're Ready!

**Setup Brevo Auto-Sync (Recommended!):**
1. Read `../docs/brevo-integration.md`
2. Add `BREVO_API_KEY` and `BREVO_PIZZAFUNDER_LIST_IDS` to `.env`
3. Test with `node scripts/test-brevo-integration.js`
4. Now backers are automatically added when they pledge! 🎉

**Send Email Campaigns:**
1. Choose your method (web tool recommended)
2. Get your data
3. Upload template to Brevo
4. Fill in variables
5. Test and send!

**Good luck with your pizza campaign! 🍕**

---

*Last updated: October 15, 2025*
