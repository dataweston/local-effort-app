# PizzaFunder Gallery Fix

**Date:** October 15, 2024  
**Issue:** Gallery loads but displays no images  
**File Modified:** `src/pages/PizzaFunderPage.jsx`

## Problem Description

The gallery on `/pizzafunder` appeared to be working (loading spinner, no errors) but displayed "No images to display yet" even when images should be available in Cloudinary.

## Root Cause

**API Response Structure Mismatch**: The page was expecting the wrong field names from the `/api/search-images` endpoint.

### The Bug

1. **Expected Structure** (in PizzaFunderPage.jsx):
   ```javascript
   const allImages = [...(pizzaData.resources || []), ...];
   ```
   Expected field: `resources`

2. **Actual API Response** (from `/api/search-images`):
   ```javascript
   res.status(200).json({
     images,        // ✅ Actual field name
     total_count,
     next_cursor,
   });
   ```
   Actual field: `images`

3. **Image URL Issue**:
   ```jsx
   // Expected:
   <img src={img.secure_url} />
   
   // But API returns:
   {
     thumbnail_url: "...",  // ✅ For gallery thumbnails
     large_url: "...",      // ✅ For full-size modal
   }
   ```

### Why It Happened

The code was likely copied from another component that used Cloudinary's direct API (which returns `resources` and `secure_url`), but our custom `/api/search-images` endpoint wraps and transforms the response.

## Solution

### Fix 1: Change `resources` to `images`

```javascript
// BEFORE
const allImages = [...(pizzaData.resources || []), ...(pieData.resources || [])];

// AFTER
const allImages = [...(pizzaData.images || []), ...(pieData.images || [])];
```

### Fix 2: Change `secure_url` to `thumbnail_url`

```jsx
// BEFORE
<img src={img.secure_url} alt={img.public_id} />

// AFTER
<img src={img.thumbnail_url || img.secure_url} alt={img.context?.alt || img.public_id} />
```

**Why the fallback?**
- Primary: `thumbnail_url` (optimized 800px width)
- Fallback: `secure_url` (in case API changes)
- Also improved alt text to use `context.alt` if available

### Fix 3: Updated Console Logging

```javascript
console.log('[PizzaFunder] Gallery data:', { 
  pizzaCount: pizzaData.images?.length || 0,      // Changed from .resources
  pieCount: pieData.images?.length || 0,          // Changed from .resources
  pizzaTotalCount: pizzaData.total_count || 0,    // Added total counts
  pieTotalCount: pieData.total_count || 0,        // Added total counts
  pizzaData: pizzaData,
  pieData: pieData
});
```

## Search Terms

The gallery searches Cloudinary for images tagged with:
- `pizza` (includes variants: pizzas, margherita)
- `pie` (includes variants: pies)

These are combined via the `/api/search-images` endpoint which uses tag-based searching.

### How Cloudinary Search Works

From `/api/search-images.js`:
```javascript
// Searches for tags:pizza OR tags:pizzas OR tags:margherita
fetch('/api/search-images?query=pizza&per_page=50')

// Searches for tags:pie OR tags:pies
fetch('/api/search-images?query=pie&per_page=50')
```

## Testing Checklist

- [ ] Gallery tab loads without errors
- [ ] Images display when tags exist in Cloudinary
- [ ] "No images to display yet" shows when no tagged images exist
- [ ] Loading spinner appears during fetch
- [ ] Console logs show correct image counts
- [ ] Images are properly deduplicated (no duplicates if tagged with both pizza and pie)
- [ ] Images use optimized thumbnail_url (800px width)
- [ ] Alt text uses context.alt when available
- [ ] Gallery is responsive on mobile/tablet/desktop

## To Add Images to Gallery

Images will appear in the gallery if they have the following tags in Cloudinary:

1. **Pizza images**: Tag with `pizza`, `pizzas`, or `margherita`
2. **Pie images**: Tag with `pie` or `pies`

### How to Tag Images in Cloudinary

1. Go to Cloudinary Media Library
2. Select an image
3. In the right panel, find "Tags"
4. Add tag: `pizza` or `pie`
5. Save

### Bulk Tagging

To tag multiple images at once:
1. Select multiple images (checkbox in corner)
2. Click "Bulk actions" → "Add tags"
3. Enter `pizza` or `pie`
4. Apply to all selected

## API Response Structure Reference

### `/api/search-images` Returns:

```javascript
{
  images: [
    {
      asset_id: "...",
      public_id: "...",
      context: { alt: "..." },
      tags: ["pizza", "food"],
      width: 1920,
      height: 1080,
      format: "jpg",
      thumbnail_url: "https://res.cloudinary.com/.../w_800/...",
      large_url: "https://res.cloudinary.com/.../w_1600/..."
    }
  ],
  total_count: 42,
  next_cursor: "..." // For pagination
}
```

## Related Files

- `src/pages/PizzaFunderPage.jsx` - Main page component
- `api/search-images.js` - Cloudinary search API wrapper
- `backend/utils/searchExpression.js` - Search query builder

## Future Enhancements

1. **Add More Search Terms**
   - Currently: pizza, pie
   - Could add: food, local-effort, fundraiser, etc.
   - Note: User specifically requested ONLY pizza and pie

2. **Lightbox Modal**
   - Click thumbnail to view `large_url` (1600px)
   - Show image context/metadata

3. **Pagination**
   - Currently fetches 50 of each
   - Could add "Load More" using `next_cursor`

4. **Filter by Date**
   - Show only recent images
   - Or organize by upload date

5. **Manual Curation**
   - Store featured image IDs in Sanity
   - Mix curated + tagged images

## Notes

- Console.log statements kept for debugging (lint warnings acceptable)
- Gallery uses lazy loading (only fetches when tab is activated)
- Images are deduplicated by `public_id` in case any are tagged with both pizza and pie
- Search terms intentionally kept simple per user request
