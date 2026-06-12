# Visual Guide: PizzaFunder + Crowdfunding Schema Setup

## 🎯 Goal
Share Sanity content between `/pizzafunder` and `/crowdfunding` pages

## ✅ Current Status
**Already working!** Both pages use the same `crowdfundingCampaign` schema.

---

## 📊 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      SANITY CMS STUDIO                           │
│                                                                   │
│  Schema: crowdfundingCampaign                                    │
│  ├── Fields:                                                     │
│  │   ├── title, slug, description                               │
│  │   ├── pizzaGoal, pizzasSold, piesSold                        │
│  │   ├── backers, endDate                                       │
│  │   ├── heroImage, videoUrl                                    │
│  │   ├── story (rich text)                                      │
│  │   ├── goals (rich text)                                      │
│  │   ├── faq (Q&A pairs)                                        │
│  │   ├── events (pickup opportunities)                          │
│  │   └── updates, rewardTiers                                   │
│  │                                                               │
│  └── Documents (you create these):                              │
│      ├── Document 1: slug = "pizzafunder"                       │
│      ├── Document 2: slug = "main"                              │
│      └── Document 3: slug = "summer-2025"                       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ GROQ Queries
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ /pizzafunder  │    │ /crowdfunding/  │    │ /crowdfunding/  │
│               │    │   pizzafunder   │    │  summer-2025    │
│ Query:        │    │                 │    │                 │
│ slug ==       │    │ Query:          │    │ Query:          │
│ "pizzafunder" │    │ slug ==         │    │ slug ==         │
│               │    │ "pizzafunder"   │    │ "summer-2025"   │
│               │    │                 │    │                 │
│ Returns:      │    │ Returns:        │    │ Returns:        │
│ Document 1    │    │ Document 1      │    │ Document 3      │
└───────────────┘    └─────────────────┘    └─────────────────┘
     SAME!                 SAME!                DIFFERENT!
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Open Sanity Studio
```
http://localhost:3333/studio
```

### Step 2: Create Campaign
```
Click: "Crowdfunding Campaign" → "+" button
```

**Fill in:**
```
Title:        PizzaFunder 2025
Slug:         pizzafunder          ← CRITICAL! Must be exactly "pizzafunder"
Pizza Goal:   1000
Pizzas Sold:  0
Backers:      0
End Date:     2025-12-31
Hero Image:   [Upload a pizza photo]
Story:        [Write your mission]
FAQ:          [Add questions/answers]
```

### Step 3: Publish & Test
```
1. Click "Publish" button
2. Visit: http://localhost:5173/pizzafunder
3. ✅ See your content live!
```

---

## 🎨 What You'll See

### Before Creating Campaign
```
┌──────────────────────────────────┐
│     /pizzafunder Page             │
│                                   │
│  ⚠️  Loading...                   │
│  (or) No campaign data            │
│                                   │
│  • Progress bar: 0/1000          │
│  • Default content               │
│  • No hero image                 │
└──────────────────────────────────┘
```

### After Creating Campaign
```
┌──────────────────────────────────┐
│     /pizzafunder Page             │
│  ┌────────────────────────────┐  │
│  │  🍕 [Your Hero Image]      │  │
│  │  PizzaFunder 2025          │  │
│  └────────────────────────────┘  │
│                                   │
│  ███████░░░ 300/1000 pizzas      │
│  👥 25 backers                    │
│                                   │
│  📖 Story                         │
│  [Your campaign story...]        │
│                                   │
│  ❓ FAQ                           │
│  Q: When will I receive...       │
│  A: Pizzas can be picked up...   │
└──────────────────────────────────┘
```

---

## 📁 Content Sharing Scenarios

### Scenario 1: Separate Campaigns
```
Sanity Studio:
  Document 1:
    slug: "pizzafunder"
    title: "PizzaFunder 2025"
    story: "Pizza-specific mission..."
    
  Document 2:
    slug: "main"
    title: "Kitchen Expansion"
    story: "General crowdfunding..."

Result:
  /pizzafunder          → Shows Document 1 (Pizza)
  /crowdfunding/main    → Shows Document 2 (Kitchen)
  
✅ Independent content
✅ Different goals & timelines
```

### Scenario 2: Shared Campaign
```
Sanity Studio:
  Document 1:
    slug: "pizzafunder"
    title: "PizzaFunder 2025"
    story: "Our pizza mission..."

Result:
  /pizzafunder              → Shows Document 1
  /crowdfunding/pizzafunder → Shows Document 1 (same!)
  
✅ Single source of truth
✅ Update once, reflects everywhere
```

### Scenario 3: Multiple Campaigns
```
Sanity Studio:
  Document 1: slug: "pizzafunder"
  Document 2: slug: "summer-2025"
  Document 3: slug: "holiday-special"

Result:
  /pizzafunder                     → Document 1
  /crowdfunding/summer-2025        → Document 2
  /crowdfunding/holiday-special    → Document 3
  
✅ Run multiple campaigns
✅ Each has unique content
```

---

## 🔧 Common Tasks

### Add FAQ Item
```
1. Open /studio
2. Navigate to your pizzafunder campaign
3. Scroll to "FAQ" tab
4. Click "Add item"
5. Enter question & answer
6. Publish
```

### Update Pizza Goal
```
1. Open /studio
2. Edit pizzafunder campaign
3. Find "Pizza Goal" field
4. Change number (e.g., 1000 → 2000)
5. Publish
```

### Change Hero Image
```
1. Open /studio
2. Edit pizzafunder campaign
3. Click "Hero Image" field
4. Upload new image
5. Adjust hotspot if needed
6. Publish
```

### Add Event
```
1. Open /studio
2. Edit pizzafunder campaign
3. Go to "Events" tab
4. Click "Add Pizza Reward Pickup Opportunity"
5. Fill in:
   - Location
   - Start/End dates
   - Description
6. Publish
```

---

## 🧪 Testing Checklist

```
□ Open /studio
□ See "Crowdfunding Campaign" in sidebar
□ Create new campaign
□ Set slug to "pizzafunder"
□ Add title: "PizzaFunder 2025"
□ Upload hero image
□ Write story (at least one paragraph)
□ Add FAQ (at least 3 items)
□ Set pizza goal: 1000
□ Set end date
□ Click "Publish"
□ Visit /pizzafunder
□ See hero image displayed
□ See story content rendered
□ See FAQ items in FAQ tab
□ See pizza progress bar
□ Test pledge form works
□ Test feedback form works
```

---

## 🎓 Understanding the Query

### PizzaFunderPage Query
```javascript
// Hardcoded slug
const query = `*[_type == "crowdfundingCampaign" 
                && slug.current == "pizzafunder"][0]{
  title,
  description,
  pizzaGoal,
  pizzasSold,
  heroImage,
  story,
  faq
}`;

// Finds ONE document with slug "pizzafunder"
```

### What It Means
```
*                              → Search all documents
[_type == "crowdfunding..."]   → Filter to campaigns
[slug.current == "pizzafunder"] → Must have this exact slug
[0]                            → Take first result
{ ... }                        → Return these fields
```

---

## 📝 Example Content

### Title
```
PizzaFunder 2025: Building Community One Slice at a Time
```

### Description
```
Support Local Effort by pre-ordering delicious, 
locally-sourced pizzas. Every pledge helps us expand 
our community kitchen and bring fresh food to more neighbors.
```

### Story (Rich Text)
```markdown
## Our Pizza Mission

At Local Effort, we believe great food brings people together. 
Our PizzaFunder campaign is more than just pizza – it's about 
building community, supporting local farmers, and creating 
jobs in our neighborhood.

### What Makes Our Pizza Special

🍕 Fresh, locally-sourced ingredients
🌾 House-made dough from scratch  
🧀 Real cheese, never frozen
❤️ Made with love by our team

### How Your Support Helps

Every pizza you pledge:
• Funds our kitchen expansion
• Creates local jobs
• Supports area farms
• Builds food security in our community
```

### FAQ Examples
```
Q: When will I receive my pizza?
A: Pizzas can be picked up at designated events throughout 
   the campaign. Check the Events tab for dates and locations!

Q: What flavors are available?
A: Our menu rotates seasonally! Classics include Margherita, 
   Pepperoni, and Veggie Supreme.

Q: Can I donate without ordering pizza?
A: Absolutely! You can support our mission without selecting 
   a pizza reward.
```

---

## 🐛 Troubleshooting

### Problem: "No content shows on /pizzafunder"

**Check:**
```
1. Did you create a campaign in Sanity?
2. Is the slug exactly "pizzafunder"?
3. Did you publish (not just save draft)?
4. Open browser console for errors
```

**Solution:**
```
1. Go to /studio
2. Find your campaign
3. Check slug field
4. Must be: pizzafunder (lowercase, no spaces)
5. Click "Publish" button
6. Refresh /pizzafunder page
```

### Problem: "Hero image doesn't appear"

**Check:**
```
1. Did you upload an image?
2. Did you publish after uploading?
3. Check browser network tab for image URL
```

**Solution:**
```
1. Edit campaign in /studio
2. Click "Hero Image" field
3. Upload image
4. Wait for upload to complete
5. Click "Publish"
6. Clear browser cache
```

### Problem: "FAQ tab is empty"

**Check:**
```
1. Did you add FAQ items?
2. Did you publish after adding?
3. Check FAQ tab in Sanity
```

**Solution:**
```
1. Edit campaign
2. Go to "FAQ" tab
3. Click "Add item"
4. Enter question & answer
5. Add at least 3 items
6. Publish
```

---

## 📚 Resources

### Documentation Files
```
docs/PIZZAFUNDER-SCHEMA-ANSWER.md
  → Complete explanation

docs/PIZZAFUNDER-SANITY-SETUP-COMPLETE.md
  → Detailed setup guide

docs/pizzafunder-crowdfunding-schema-sharing.md
  → Content sharing strategies

docs/pizzafunder-campaign-template.json
  → Ready-to-use template
```

### Schema Location
```
studio/schemaTypes/crowdfundingCampaign.js
```

### Page Component
```
src/pages/PizzaFunderPage.jsx
```

---

## ✨ Next Steps

1. ✅ Open `/studio`
2. ✅ Create "Crowdfunding Campaign"
3. ✅ Slug: `pizzafunder`
4. ✅ Fill content (use examples above)
5. ✅ Upload hero image
6. ✅ Add FAQ items
7. ✅ Publish
8. ✅ Test at `/pizzafunder`
9. ✅ Share your pizza campaign! 🍕

**You're ready to launch!** 🚀
