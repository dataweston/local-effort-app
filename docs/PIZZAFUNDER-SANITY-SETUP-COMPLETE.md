# PizzaFunder + Crowdfunding: Sanity CMS Setup Complete ✅

## Summary

**Good news!** Both `/pizzafunder` and `/crowdfunding` pages already share the same Sanity schema: `crowdfundingCampaign`

No new schema needs to be created. The content can be routed to both pages!

---

## How It Currently Works

### Schema: `crowdfundingCampaign`
- **Location:** `studio/schemaTypes/crowdfundingCampaign.js`
- **Registered in:** `studio/schemaTypes/index.ts`
- **Used by:** Both PizzaFunderPage and CrowdfundingPage

### Query Pattern

**PizzaFunderPage:**
```javascript
// Hardcoded to look for slug "pizzafunder"
*[_type == "crowdfundingCampaign" && slug.current == "pizzafunder"][0]
```

**CrowdfundingPage:**
```javascript
// Dynamic slug from URL
*[_type == "crowdfundingCampaign" && slug.current == $slug][0]
```

### Content Routing Options

#### ✅ Option 1: Separate Campaigns (Recommended for Independence)
Create two distinct campaign documents:

1. **PizzaFunder Campaign**
   - Slug: `pizzafunder`
   - URL: `/pizzafunder`
   - Purpose: Dedicated pizza crowdfunding

2. **Main Campaign**
   - Slug: `main` (or any name)
   - URL: `/crowdfunding/main`
   - Purpose: General crowdfunding

#### ✅ Option 2: Shared Campaign (Recommended for Consistency)
Create ONE campaign document:

- Slug: `pizzafunder`
- URLs that work:
  - `/pizzafunder` ← hardcoded query
  - `/crowdfunding/pizzafunder` ← dynamic query
- Both pages show identical content automatically

#### ✅ Option 3: Multiple Campaigns
Create as many campaigns as you want:

- `pizzafunder` → `/pizzafunder`
- `summer-2025` → `/crowdfunding/summer-2025`
- `winter-special` → `/crowdfunding/winter-special`

Each has independent content in Sanity!

---

## Step-by-Step Setup Guide

### Quick Start: Create PizzaFunder Campaign in Studio

1. **Open Sanity Studio**
   ```
   Visit: http://localhost:3333/studio
   (or your production studio URL)
   ```

2. **Create New Campaign**
   - Click "Crowdfunding Campaign" in left sidebar
   - Click the "+" button to create new document
   
3. **Essential Fields**
   
   **Overview Tab:**
   - Title: `PizzaFunder 2025` (or your choice)
   - Slug: Click "Generate" or enter `pizzafunder` manually
   - Pizza Goal: `1000` (or your target)
   - Pizzas Sold: `0` (auto-updated by API)
   - Backers: `0` (auto-updated by API)
   - End Date: Choose your campaign end date
   - Hero Image: Upload a compelling pizza image!

   **Story Tab:**
   - Campaign Story: Write your pizza mission
   - Featured Public Events: Link to related events

   **FAQ Tab:**
   - Add questions like:
     - "When will I receive my pizza?"
     - "What flavors are available?"
     - "Can I donate without ordering pizza?"

4. **Publish**
   - Click the "Publish" button
   - Visit `/pizzafunder` to see your content live!

---

## Available Schema Fields

The `crowdfundingCampaign` schema includes everything you need:

### 📊 Overview
- Title, description, slug
- **Pizza Goal** (number of pizzas to sell)
- **Pizzas Sold** (tracked by API)
- **Pies Sold** (separate counter)
- Backers count
- End date
- Hero image
- Video URL (optional)
- Legacy monetary goal/raised (backwards compatible)

### 📝 Content
- **Campaign Story** (rich text with images)
- **Goals** (rich text)
- **FAQ** (question/answer pairs)
- **Updates** (linked campaign update documents)

### 🎉 Events
- **Featured Public Events** (reference existing events)
- **Pizza Reward Pickup Opportunities** (custom event objects)
  - Location, dates, times
  - Status (scheduled, sold out, etc.)
  - Descriptions with images
  - Ticket links

### 🎁 Rewards
- **Reward Tiers** (linked reward tier documents)

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SANITY CMS                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │   crowdfundingCampaign Schema                     │  │
│  │   ├── title, description, slug                    │  │
│  │   ├── pizzaGoal, pizzasSold, piesSold            │  │
│  │   ├── heroImage, story, goals, faq               │  │
│  │   └── events, rewardTiers, updates               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ GROQ Query
                           ▼
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────┐                  ┌─────────▼────────┐
│ PizzaFunderPage│                  │ CrowdfundingPage │
│                │                  │                  │
│ Query:         │                  │ Query:           │
│ slug ==        │                  │ slug == $slug    │
│ "pizzafunder"  │                  │ (dynamic)        │
│                │                  │                  │
│ URL:           │                  │ URL:             │
│ /pizzafunder   │                  │ /crowdfunding/*  │
└────────────────┘                  └──────────────────┘
```

---

## Live Data vs Static Content

### Static Content (From Sanity)
- Title, description, story
- Hero image
- FAQ items
- Events
- All editorial content

### Live Data (From API)
- **Pizzas Sold** - Updated in real-time from `/api/pizzafunder/status`
- **Backers Count** - Live pledge count
- **Amount Raised** - Calculated from pledges

The PizzaFunderPage combines both:
1. Fetches static content from Sanity (campaign details)
2. Fetches live stats from API (current pledges)
3. Merges them for display

---

## Testing Checklist

- [ ] Open `/studio`
- [ ] Create new crowdfunding campaign
- [ ] Set slug to `pizzafunder`
- [ ] Fill in title, hero image, story
- [ ] Add at least one FAQ item
- [ ] Publish the document
- [ ] Visit `/pizzafunder`
- [ ] Verify Sanity content displays correctly
- [ ] Check that hero image appears
- [ ] Confirm story section renders
- [ ] Verify FAQ tab works

---

## Example Campaign Setup

Here's a complete example for copy/paste inspiration:

**Title:** PizzaFunder 2025

**Slug:** `pizzafunder`

**Description:**
```
Support Local Effort by pre-ordering delicious pizzas! Every pizza you 
pledge helps us build our community kitchen and bring fresh, local food 
to more neighbors.
```

**Pizza Goal:** 1000

**Story:**
```markdown
## Our Pizza Mission

At Local Effort, we believe great food brings people together. Our 
PizzaFunder campaign is more than just pizza – it's about building 
community, supporting local farmers, and creating jobs in our neighborhood.

### What Makes Our Pizza Special

🍕 Fresh, locally-sourced ingredients
🌾 House-made dough from scratch
🧀 Real cheese, never frozen
❤️ Made with love by our team

### How It Works

1. Pledge support for one or more pizzas
2. We'll notify you when pickup events are scheduled
3. Pick up your fresh, hot pizza at designated locations
4. Enjoy knowing you're supporting local food access!
```

**FAQ:**

Q: When will I receive my pizza?
A: Pizzas can be picked up at designated events throughout the campaign. Check the Events tab for pickup dates and locations!

Q: What pizza flavors are available?
A: Our menu rotates seasonally! Classic options include Margherita, Pepperoni, and Veggie Supreme.

Q: Can I donate without receiving a pizza?
A: Absolutely! You can make a contribution to support our mission without selecting a pizza reward.

---

## Advanced: Content Synchronization

If you want the SAME content on both `/pizzafunder` AND `/crowdfunding/pizzafunder`:

1. Create ONE campaign with slug: `pizzafunder`
2. Both URLs will work automatically:
   - `/pizzafunder` → queries for slug "pizzafunder"
   - `/crowdfunding/pizzafunder` → queries for slug "pizzafunder"
3. Update content once in Sanity, appears on both pages!

**Use case:** You want one canonical pizza campaign accessible from multiple URLs.

---

## Troubleshooting

### "No content appears on /pizzafunder"

**Check:**
1. Did you create a campaign with slug `pizzafunder`?
2. Did you publish (not just save draft)?
3. Open browser console - are there GROQ query errors?
4. Verify Sanity Studio is connected to correct project

**Solution:**
```javascript
// In browser console on /pizzafunder:
localStorage.clear()
location.reload()
```

### "Content appears on /crowdfunding/X but not /pizzafunder"

**Check:**
- PizzaFunderPage hardcodes slug to `"pizzafunder"`
- Make sure your campaign slug is exactly `pizzafunder` (no caps, no spaces)

---

## Future Enhancements

Potential improvements for content management:

### 1. Campaign Selector
Add ability to switch campaigns on PizzaFunderPage:
```javascript
const slug = useParams().slug || 'pizzafunder';
```

### 2. Content Inheritance
Create a "template" campaign that others inherit from:
- Shared: FAQ, some story sections
- Unique: Goals, dates, images

### 3. Multi-Campaign Dashboard
Show multiple pizza campaigns with different themes:
- Summer Pizza Party
- Winter Warmth Pizzas
- Holiday Special

---

## Quick Reference

### Schema Location
```
studio/schemaTypes/crowdfundingCampaign.js
```

### Register New Campaign
1. Open `/studio`
2. Click "Crowdfunding Campaign"
3. Click "+"
4. Set slug: `pizzafunder`
5. Publish

### Query Examples

**Get pizzafunder campaign:**
```groq
*[_type == "crowdfundingCampaign" && slug.current == "pizzafunder"][0]{
  title,
  description,
  pizzaGoal,
  pizzasSold,
  heroImage,
  story,
  faq
}
```

**Get all campaigns:**
```groq
*[_type == "crowdfundingCampaign"] | order(_createdAt desc)
```

---

## Summary

✅ **Schema:** Already set up (`crowdfundingCampaign`)  
✅ **Content Sharing:** Supported natively  
✅ **Both Pages:** Can use same or different campaigns  
✅ **Setup Required:** Just create campaign in Studio  

**Next Step:** Open `/studio` and create your pizzafunder campaign! 🍕
