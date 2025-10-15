# 📧 Pizza Funder Email - Quick Reference Card

## 🎯 Three Ways to Get Your Data

### 1️⃣ Web Tool (EASIEST!)
**URL:** https://localeffortfood.com/brevo-email-helper.html

✅ No technical skills needed  
✅ One-click data fetch  
✅ Copy/paste ready  
✅ Works on any device  

**Steps:**
1. Open the URL
2. Click "Fetch Latest Pizza Data"
3. Click "Copy All Variables as JSON"
4. Paste into Brevo!

---

### 2️⃣ Command Line Script
**Command:** `node scripts/prepare-brevo-email-data.js --production`

✅ Automated  
✅ Saves to files  
✅ Good for regular updates  

**Output Files:**
- `emails/brevo-variables.json` - All variables
- `emails/brevo-import.json` - Brevo import format

---

### 3️⃣ Manual Method
**URL:** https://localeffortfood.com/api/pizzafunder/status

✅ Always works  
✅ No tools needed  

**Math Required:**
```
PROGRESS_PERCENT = (pizzas ÷ goal) × 100
REMAINING = goal - pizzas
```

---

## 📋 Required Variables (Always Needed)

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `PIZZAS_SOLD` | `247` | API or web tool |
| `BACKERS_COUNT` | `52` | API or web tool |
| `GOAL` | `1000` | API or web tool |
| `PROGRESS_PERCENT` | `25` | Calculate or use tool |
| `REMAINING` | `753` | Calculate or use tool |

---

## 📅 Optional Variables (Events)

Only fill these if you have upcoming events:

| Variable | Example |
|----------|---------|
| `EVENT_1_TITLE` | `Pizza Party at Central Park` |
| `EVENT_1_LOCATION` | `Madison, WI` |
| `EVENT_1_DATE` | `Saturday, Oct 21 • 5-8pm` |
| `EVENT_1_TAGLINE` | `Bring the family!` |
| `EVENT_1_FOOD_TYPE` | `Wood-Fired Pizza` |

(Same pattern for `EVENT_2_*`)

---

## 📰 Optional Variables (Updates)

Only fill these if you have campaign updates:

| Variable | Example |
|----------|---------|
| `UPDATE_1_TITLE` | `We Hit 200 Pizzas!` |
| `UPDATE_1_DATE` | `October 15, 2025` |
| `UPDATE_1_EXCERPT` | `Amazing news! We've crossed...` |
| `UPDATE_1_LINK` | `https://localeffortfood.com/pizzafunder` |

(Same pattern for `UPDATE_2_*`)

---

## 🚀 Quick Brevo Setup

1. **Upload Template**
   - File: `emails/pizzafunder-update-template.html`
   - Location: Campaigns → Templates → Create

2. **Create Campaign**
   - Type: Regular email campaign
   - Template: Pizza Funder Update

3. **Add Variables**
   - Paste JSON from web tool
   - Or enter each variable manually

4. **Subject Line Ideas**
   ```
   🍕 We're at {{ PROGRESS_PERCENT }}% - {{ REMAINING }} pizzas to go!
   Pizza Update: {{ PIZZAS_SOLD }} Sold!
   {{ REMAINING }} Pizzas Left - Help Us Reach Our Goal!
   ```

5. **Test First!**
   - Send to your own email
   - Check on mobile and desktop
   - Verify all links work

---

## ✅ Pre-Send Checklist

- [ ] All required variables filled in
- [ ] Subject line includes variables (optional)
- [ ] Sent test email to myself
- [ ] Test email looks good on phone
- [ ] All links work in test email
- [ ] Recipients list is correct
- [ ] From name/email is correct
- [ ] Unsubscribe link works

---

## 💡 Pro Tips

**Best Send Times:**
- Tuesday-Thursday
- 10am-2pm local time
- Avoid Monday mornings

**Send Frequency:**
- Weekly during active campaign
- After milestones (25%, 50%, 75%)
- 24-48 hours before events

**Personalization:**
Use Brevo's contact fields:
```
Hey {{ FIRSTNAME | default:"pizza lover" }}!
```

---

## 🆘 Troubleshooting

**Variables showing as {{ PIZZAS_SOLD }}?**
→ You forgot to set the variable values in Brevo

**Numbers look wrong?**
→ Re-fetch data, cache might be old

**Template looks broken?**
→ Re-paste HTML, might have been modified

**Images not loading?**
→ Check logo URL is accessible: https://localeffortfood.com/gallery/logo.png

---

## 📞 Resources

- **Simple Guide:** `SIMPLE-BREVO-GUIDE.md`
- **Detailed Guide:** `PIZZAFUNDER-EMAIL-TEMPLATE-GUIDE.md`
- **Web Tool:** https://localeffortfood.com/brevo-email-helper.html
- **Brevo Help:** https://help.brevo.com/

---

**Remember:** You can always edit and resend! 🍕
