# PizzaFunder & Crowdfunding Schema - Content Sharing Guide

## Current Architecture ✅

**Good news!** Both `/pizzafunder` and `/crowdfunding` already use the **same schema**: `crowdfundingCampaign`

### How It Works

Both pages query the same Sanity document type but filter by different slugs:

**PizzaFunderPage.jsx:**
```javascript
const query = `*[_type == "crowdfundingCampaign" && slug.current == "pizzafunder"][0]{...}`;
```

**CrowdfundingPage.jsx:**
```javascript
const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{...}`;
```

## Content Sharing Options

### Option 1: Separate Campaigns (Recommended)

Create **two separate campaign documents** in Sanity Studio:

1. **Document 1:**
   - Title: "PizzaFunder Campaign"
   - Slug: `pizzafunder`
   - Used by: `/pizzafunder` page

2. **Document 2:**
   - Title: "Main Crowdfunding Campaign"
   - Slug: `main-campaign` (or any other slug)
   - Used by: `/crowdfunding/main-campaign` page

**Pros:**
- Independent content management
- Different goals, timelines, and stories
- Clear separation in Sanity Studio
- Can run multiple campaigns simultaneously

**Cons:**
- Must update content in two places if you want same info

---

### Option 2: Single Shared Campaign

Use the **same campaign document** for both pages:

1. Create one campaign with slug: `pizzafunder`
2. Visit both URLs:
   - `/pizzafunder` - works automatically
   - `/crowdfunding/pizzafunder` - also works!

**Pros:**
- Single source of truth
- Update once, reflects on both pages
- Less duplicate content

**Cons:**
- Both pages show identical content
- Can't have different campaigns running

---

### Option 3: Hybrid Approach (Advanced)

Modify PizzaFunderPage to accept a slug parameter and fall back to "pizzafunder":

```javascript
// In PizzaFunderPage.jsx
const slug = new URLSearchParams(window.location.search).get('campaign') || 'pizzafunder';
const data = await groqFetch(query, { slug });
```

Then you can:
- `/pizzafunder` → shows campaign with slug "pizzafunder"
- `/pizzafunder?campaign=summer-2025` → shows different campaign

## Schema Fields Available

The `crowdfundingCampaign` schema includes everything you need:

### Overview
- ✅ Title, description, slug
- ✅ Pizza goal & pizzas sold
- ✅ Pies sold
- ✅ Backers count
- ✅ End date
- ✅ Hero image
- ✅ Video URL

### Content Sections
- ✅ Story (rich text with images)
- ✅ Goals (rich text)
- ✅ FAQ (question/answer pairs)
- ✅ Updates (linked campaign updates)

### Events
- ✅ Featured public events (references)
- ✅ Pizza reward pickup opportunities

### Rewards
- ✅ Reward tiers (linked documents)

## How to Set Up in Sanity Studio

### 1. Create a PizzaFunder Campaign

1. Open Sanity Studio: `/studio`
2. Click "Crowdfunding Campaign" in the left sidebar
3. Click "Create new" (+ button)
4. Fill in the fields:
   - **Title:** "PizzaFunder 2025"
   - **Slug:** Click "Generate" or manually enter `pizzafunder`
   - **Pizza Goal:** 1000 (or your target)
   - **Pizzas Sold:** 0 (will be updated by API)
   - **Hero Image:** Upload your campaign image
   - **Story:** Write your pizza campaign story
   - **FAQ:** Add frequently asked questions
5. Click "Publish"

### 2. Test the Page

Visit `/pizzafunder` and verify your Sanity content appears!

## Content Synchronization

If you want to **share some content** but not all:

### Manual Approach
Copy/paste content between campaign documents in Sanity Studio.

### Programmatic Approach (Future Enhancement)
Create a Sanity plugin or script that syncs specific fields:
- Share: story, FAQ, hero image
- Keep separate: goals, pizzas sold, end date

## Current PizzaFunder Query

```groq
*[_type == "crowdfundingCampaign" && slug.current == "pizzafunder"][0]{
  title,
  description,
  pizzaGoal,
  pizzasSold,
  goal,
  raisedAmount,
  backers,
  endDate,
  heroImage,
  story,
  goals,
  faq,
  "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)[0...3]
}
```

## Recommendations

**For most use cases:**
1. ✅ Create a separate campaign document with slug `pizzafunder`
2. ✅ Use the existing `crowdfundingCampaign` schema
3. ✅ Manage content independently in Sanity Studio
4. ✅ Let the API handle live data (pizzas sold, backers)

**If you need the exact same content on both pages:**
1. ✅ Create one campaign with slug `pizzafunder`
2. ✅ Link to both `/pizzafunder` and `/crowdfunding/pizzafunder`
3. ✅ Content stays in sync automatically

## Next Steps

1. Open `/studio` in your browser
2. Navigate to "Crowdfunding Campaign"
3. Create a new campaign with slug `pizzafunder`
4. Fill in your pizza campaign content
5. Publish and test on `/pizzafunder`

The schema is already ready - you just need to create the content! 🍕
