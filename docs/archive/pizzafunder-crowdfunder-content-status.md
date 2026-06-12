# PizzaFunder vs Crowdfunder Content Status Report

**Date:** October 15, 2025  
**Issue:** User wants `/pizzafunder` to contain all the same Sanity content as `/crowdfunder`

---

## ⚠️ Current Status: DIFFERENT CONTENT

### The Problem

**Both pages query different campaigns:**

1. **`/pizzafunder`** queries for:
   ```javascript
   slug.current == "pizzafunder"
   ```

2. **`/crowdfunding`** (main page) queries for:
   ```javascript
   slug.current == "local-pizza-by-local-effort-let-s-make-1000-pizzas"
   ```

**Result:** They're showing **different campaign documents** from Sanity, not the same content!

---

## 📊 Current Architecture

### Schema ✅
- **Both pages use the same schema:** `crowdfundingCampaign`
- Located in: `studio/schemaTypes/crowdfundingCampaign.js`
- **This is correct and doesn't need to change**

### Content Documents ❌
- **Document 1:** Slug = `"pizzafunder"` (used by `/pizzafunder`)
- **Document 2:** Slug = `"local-pizza-by-local-effort-let-s-make-1000-pizzas"` (used by `/crowdfunding`)
- **These are SEPARATE documents with SEPARATE content**

---

## 🔧 Solutions to Make Them Share Content

### Option 1: Change PizzaFunderPage to Use Same Slug (Recommended)

**Update PizzaFunderPage to query for the same campaign as CrowdfundingPage:**

**File:** `src/pages/PizzaFunderPage.jsx`

**Change from:**
```javascript
const data = await groqFetch(query, { slug: 'pizzafunder' });
```

**Change to:**
```javascript
const data = await groqFetch(query, { slug: 'local-pizza-by-local-effort-let-s-make-1000-pizzas' });
```

**Pros:**
- ✅ Single source of truth
- ✅ Update content once in Sanity, shows on both pages
- ✅ No duplicate content management

**Cons:**
- ❌ Both pages show identical content
- ❌ Can't have different campaigns running simultaneously

---

### Option 2: Copy Content from Main Campaign to PizzaFunder

**Manually duplicate the content:**

1. Open Sanity Studio at `/studio`
2. Find the campaign: `"local-pizza-by-local-effort-let-s-make-1000-pizzas"`
3. Copy all content fields (story, goals, FAQ, etc.)
4. Create/update campaign with slug `"pizzafunder"`
5. Paste the content
6. Publish

**Pros:**
- ✅ Each page can be customized independently
- ✅ Can run different campaigns

**Cons:**
- ❌ Must update content in TWO places
- ❌ Content can drift out of sync
- ❌ More maintenance work

---

### Option 3: Make PizzaFunder Accept Dynamic Slug

**Modify PizzaFunderPage to accept a slug parameter:**

```javascript
// Get slug from URL query param or default to main campaign
const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('campaign') || 'local-pizza-by-local-effort-let-s-make-1000-pizzas';
```

Then you can:
- `/pizzafunder` → shows main campaign
- `/pizzafunder?campaign=summer-special` → shows different campaign

**Pros:**
- ✅ Flexible - can show any campaign
- ✅ Default to main campaign
- ✅ Can override when needed

**Cons:**
- ❌ More complex
- ❌ URL becomes less clean

---

## 🎯 Recommended Action Plan

### For Immediate Content Sharing:

**Change one line in `PizzaFunderPage.jsx`:**

```javascript
// Line ~68 in src/pages/PizzaFunderPage.jsx
const data = await groqFetch(query, { 
  slug: 'local-pizza-by-local-effort-let-s-make-1000-pizzas' 
});
```

This makes `/pizzafunder` show the exact same content as `/crowdfunding`.

---

## 📝 Current File Locations

### Frontend Pages
- **PizzaFunderPage:** `src/pages/PizzaFunderPage.jsx` (Line 68 - slug query)
- **CrowdfundingPage:** `src/pages/CrowdfundingPage.jsx` (Line 936 - slug query)

### Schema
- **crowdfundingCampaign:** `studio/schemaTypes/crowdfundingCampaign.js`

### APIs
- **PizzaFunder API:** `api/pizzafunder/` (status, pledge, feedback)
- **Crowdfund API:** `api/crowdfund/` (contribute, status)

---

## 🧪 How to Verify

### After Making Changes:

1. **Visit both pages:**
   - http://localhost:5173/pizzafunder
   - http://localhost:5173/crowdfunding

2. **Check that they show:**
   - Same title
   - Same hero image
   - Same story content
   - Same FAQ
   - Same goals

3. **Open browser console and check:**
   ```javascript
   // On /pizzafunder page
   console.log('PizzaFunder campaign data:', campaignData);
   
   // On /crowdfunding page  
   console.log('Crowdfunding campaign data:', campaignData);
   ```

Both should reference the same campaign slug.

---

## ⚡ Quick Fix Command

Want me to update the code right now to make them share content?

I can change `PizzaFunderPage.jsx` to query for the same campaign as `CrowdfundingPage`.

**Confirm to proceed with Option 1.**

---

## 📚 Related Documentation

- `docs/pizzafunder-crowdfunding-schema-sharing.md` - Content sharing strategies
- `docs/PIZZAFUNDER-SCHEMA-ANSWER.md` - Original implementation notes
- `docs/PIZZAFUNDER-SANITY-SETUP-COMPLETE.md` - Setup guide
- `QUICKSTART-PIZZAFUNDER.md` - Quick reference

---

## Summary

**Current State:** ❌ Different content (different slugs)  
**Desired State:** ✅ Same content (same slug)  
**Solution:** Update one line in `PizzaFunderPage.jsx` to use the same slug  
**Time to Fix:** < 1 minute
