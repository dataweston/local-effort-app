# PizzaFunder Page Issues - Fix Summary

**Date:** October 15, 2025  
**Issues Reported:**
1. ❌ Rewards/products for the campaign don't populate
2. ❌ Hero image is broken
3. ❌ No Square payment form for transactions

---

## ✅ COMPLETED FIXES

### 1. Updated Sanity Query to Include All Necessary Data

**File:** `src/pages/PizzaFunderPage.jsx`

**Changes Made:**
- ✅ Added `rewardTiers` field to query
- ✅ Expanded `heroImage` to include `asset.url` and `alt`
- ✅ Added `events` and `featuredPublicEvents` fields
- ✅ Added `piesSold` field
- ✅ Matched the query structure to CrowdfundingPage

**Before:**
```javascript
const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
  title,
  description,
  pizzaGoal,
  pizzasSold,
  goal,
  raisedAmount,
  backers,
  endDate,
  heroImage,  // ❌ Wrong format
  story,
  goals,
  faq,
  "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)[0...3]
}`;
```

**After:**
```javascript
const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
  title,
  description,
  pizzaGoal,
  pizzasSold,
  piesSold,
  goal,
  raisedAmount,
  backers,
  endDate,
  heroImage{
    asset->{
      _id,
      url
    },
    alt
  },  // ✅ Correct format
  story,
  goals,
  events[]{...},
  "featuredPublicEvents": featuredPublicEvents[]->{ ... },
  faq,
  "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),  // ✅ Added
  "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)[0...3]
}`;
```

---

### 2. Fixed Hero Image Display

**File:** `src/pages/PizzaFunderPage.jsx`

**Changes Made:**
- ✅ Updated to use `campaignData.heroImage.asset.url` instead of `urlFor()`
- ✅ Added support for `alt` text from Sanity
- ✅ Removed unused `imageUrlBuilder` and `urlFor` function

**Before:**
```jsx
{campaignData?.heroImage && (
  <img
    src={urlFor(campaignData.heroImage).width(1400).height(600).url()}
    alt={campaignData.title}
  />
)}
```

**After:**
```jsx
{campaignData?.heroImage?.asset?.url && (
  <img
    src={campaignData.heroImage.asset.url}
    alt={campaignData.heroImage.alt || campaignData.title}
  />
)}
```

---

### 3. Added Reward Tiers Display

**File:** `src/pages/PizzaFunderPage.jsx`

**Changes Made:**
- ✅ Added `selectedTier` state
- ✅ Created reward tiers grid section
- ✅ Displays reward tiers from Sanity data
- ✅ Click to select a tier
- ✅ Shows pizza count, price, title, description
- ✅ Highlights selected tier
- ✅ Opens pledge form when tier is selected

**New Code Added:**
```jsx
{campaignData?.rewardTiers && campaignData.rewardTiers.length > 0 && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {campaignData.rewardTiers.map((tier, index) => (
      <Card
        key={index}
        onClick={() => {
          setSelectedTier(tier);
          setShowPledgeForm(true);
        }}
      >
        {/* Tier details display */}
      </Card>
    ))}
  </div>
)}
```

---

## ⚠️ REMAINING ISSUES

### 4. Square Payment Integration

**Status:** ❌ NEEDS TO BE ADDED

**Problem:**
The `PizzaPledgeForm` component currently does NOT include Square Web Payments SDK. It only collects form data without processing payments.

**What Needs to Be Done:**

1. **Add Square Web Payments SDK to PizzaPledgeForm**
   - Initialize Square SDK on component mount
   - Create card payment element
   - Handle tokenization
   - Pass token to pledge API

2. **Update PizzaPledgeForm to accept selected tier**
   - Add `selectedTier` prop
   - Display tier information
   - Use tier amount for payment

3. **Modify pledge handler in PizzaFunderPage**
   - Remove the current Square integration from page level
   - Let PizzaPledgeForm handle payment tokenization
   - Update API call to use token from form

**Reference Implementation:**
See `src/pages/CrowdfundingPage.jsx` lines 2400-2700 for Square integration pattern

---

## 📝 RECOMMENDED NEXT STEPS

### Option A: Add Square to PizzaPledgeForm (Recommended)

**Pros:**
- Encapsulates payment logic in one component
- Reusable across different pages
- Cleaner separation of concerns

**Steps:**
1. Add Square SDK script loading to `PizzaPledgeForm`
2. Create card element container
3. Tokenize on form submit
4. Pass token to parent via `onPledge` callback

### Option B: Keep Square in PizzaFunderPage

**Pros:**
- Matches current pattern in CrowdfundingPage
- Less refactoring needed

**Steps:**
1. Move Square initialization from pledge effect to page level
2. Pass card/payments objects to form
3. Form calls tokenize, page handles payment

---

## 🧪 TESTING CHECKLIST

Once Square is integrated:

- [ ] Visit `/pizzafunder`
- [ ] Verify hero image displays
- [ ] Verify reward tiers show up in grid
- [ ] Click a reward tier
- [ ] Verify pledge form opens with tier pre-selected
- [ ] Fill in form fields
- [ ] Enter test card: `4111 1111 1111 1111`, exp: any future date, CVV: `111`
- [ ] Submit pledge
- [ ] Verify payment processes successfully
- [ ] Verify success toast appears
- [ ] Verify pledge counter updates

---

## 📄 FILES MODIFIED

1. `src/pages/PizzaFunderPage.jsx`
   - ✅ Updated Sanity query
   - ✅ Fixed hero image rendering
   - ✅ Added reward tiers display
   - ❌ Square payment needs integration

2. `src/components/pizzafunder/PizzaPledgeForm.jsx`
   - ✅ File restored to working state
   - ❌ Needs Square Web Payments SDK integration

3. `src/components/pizzafunder/FeedbackForm.jsx`
   - ✅ Fixed form submission (earlier fix)

---

## 🔧 CONFIGURATION NEEDED

Make sure these environment variables are set:

```bash
VITE_SQUARE_APP_ID=sandbox-sq0idb-...
VITE_SQUARE_LOCATION_ID=L...
```

Or set them in `index.html`:
```html
<script>
  window.__SQUARE_APP_ID__ = 'sandbox-sq0idb-...';
  window.__SQUARE_LOCATION_ID__ = 'L...';
</script>
```

---

## Summary

**Completed:** 3/4 issues  
**Remaining:** Square payment integration in PizzaPledgeForm  
**Estimated Time to Complete:** 30-45 minutes

The main remaining work is adding the Square Web Payments SDK to the `PizzaPledgeForm` component to enable actual payment processing.
