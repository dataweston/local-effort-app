# Gallery Debugging - October 15, 2025

## Issue
Gallery not displaying on `/pizzafunder` even though API is being called.

## Investigation Steps

### 1. Compared Working Implementations

**Working Pages:**
- `/gallery` - Uses `thumbnail_url` from API, displays correctly
- `/crowdfunding` - Uses same API pattern, displays correctly

**Not Working:**
- `/pizzafunder` - Uses identical code pattern but doesn't display

### 2. Code Patterns Compared

All three pages use the same pattern:
```javascript
const endpoints = [
  '/api/search-images?query=pizza&per_page=50',
  '/api/search-images?query=pie&per_page=50',
];

const results = await Promise.all(
  endpoints.map(async (url) => {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await response.json();
    const images = Array.isArray(payload?.images) ? payload.images : [];
    return { ok: response.ok, images };
  })
);

// Merge and deduplicate
const merged = [];
const seen = new Set();
results.forEach(({ ok, images }) => {
  if (!ok || !images.length) return;
  images.forEach((img) => {
    const id = img?.asset_id || img?.public_id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(img);
  });
});

setGalleryImages(merged);
```

**Rendering (also identical):**
```jsx
{galleryImages.map((img) => (
  <div key={img.public_id}>
    <img src={img.thumbnail_url} alt={img.public_id} />
  </div>
))}
```

### 3. API Response Structure

The `/api/search-images` endpoint returns:
```json
{
  "images": [
    {
      "asset_id": "...",
      "public_id": "...",
      "context": {},
      "tags": [],
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "thumbnail_url": "https://res.cloudinary.com/...",
      "large_url": "https://res.cloudinary.com/..."
    }
  ],
  "total_count": 42,
  "next_cursor": null
}
```

### 4. Added Comprehensive Debugging

Modified `/src/pages/PizzaFunderPage.jsx` to log:

**During fetch:**
- URL being fetched
- Response status and OK flag
- Raw response text (first 200 chars)
- Parsed JSON payload
- Extracted images count and sample

**During merge:**
- All results from Promise.all
- Each result's OK status and image count
- Final merged array length
- First 3 merged images

**During render:**
- galleryLoading state
- galleryError state  
- galleryImages length
- First 2 images in galleryImages

## Debugging Steps for User

### Open Browser Console
1. Navigate to `http://localhost:5173/pizzafunder`
2. Open browser DevTools (F12)
3. Go to Console tab
4. Click on "Gallery" tab on the page

### What to Look For

**Expected console logs:**
```
[PizzaFunder] Gallery useEffect triggered: { activeTab: 'gallery', galleryLoaded: false, galleryLoading: false }
[PizzaFunder] Loading gallery images...
[PizzaFunder] Fetching: /api/search-images?query=pizza&per_page=50
[PizzaFunder] Response status: 200 true
[PizzaFunder] Response text (first 200 chars): {"images":[...
[PizzaFunder] Parsed payload: { images: [...], total_count: X }
[PizzaFunder] Extracted images: 25 [{thumbnail_url: "...", ...}, ...]
[PizzaFunder] Fetching: /api/search-images?query=pie&per_page=50
[PizzaFunder] Response status: 200 true
...
[PizzaFunder] Merging results: [{ ok: true, images: [...] }, { ok: true, images: [...] }]
[PizzaFunder] Result 0: { ok: true, imageCount: 25 }
[PizzaFunder] Result 1: { ok: true, imageCount: 18 }
[PizzaFunder] Gallery loaded: 40 images
[PizzaFunder] First 3 merged images: [{thumbnail_url: "...", ...}, ...]
[PizzaFunder] Rendering gallery: { galleryLoading: false, galleryError: '', galleryImagesLength: 40 }
```

**Possible Issues to Diagnose:**

1. **API not responding (status != 200)**
   - Cloudinary not configured
   - Environment variables missing
   - Network error

2. **API returns HTML instead of JSON**
   - Wrong endpoint
   - Vite dev server routing issue
   - Will see `<!DOCTYPE` in response text

3. **API returns empty images array**
   - No images tagged with 'pizza' or 'pie' in Cloudinary
   - Search expression not matching any results

4. **Images have no thumbnail_url**
   - API transformation issue
   - Cloudinary URL generation failing

5. **State not updating**
   - Merged array has images but galleryImages state is empty
   - React state update issue

6. **Images in state but not rendering**
   - galleryLoading stuck at true
   - galleryError has a message
   - Rendering logic broken

## Test Page Created

Created `/test-gallery-api.html` to test API independently:
- Load page in browser: `http://localhost:5173/test-gallery-api.html`
- Click "Test" button
- See API response and rendered images
- Helps isolate if issue is API or React component

## Next Steps Based on Console Output

### If API returns 500/error
- Check Cloudinary env vars in `.env`
- Check server logs for Cloudinary errors
- Verify Cloudinary account is active

### If API returns empty array
- Log into Cloudinary dashboard
- Check if images are tagged with 'pizza' or 'pie'
- Add tags if missing

### If API works but images don't render
- Check React state updates
- Verify thumbnail_url exists in images
- Check for console errors during render

### If everything logs correctly but nothing shows
- Check if TabsContent is actually visible (CSS display:none?)
- Check if parent container has height
- Check browser network tab for image loading errors

## Files Modified

- `src/pages/PizzaFunderPage.jsx` - Added extensive logging
- `test-gallery-api.html` - Created API test page

## Files for Reference

- `src/pages/GalleryPage.jsx` - Working implementation
- `src/pages/CrowdfundingPage.jsx` - Working implementation  
- `api/search-images.js` - API endpoint code

## Removal of Debug Logs

Once issue is found and fixed, remove these console.log statements:
- Lines 323-324 (useEffect trigger)
- Lines 335, 347, 349, 352, 363, 365 (fetch loop)
- Lines 378, 382, 392-393 (merge loop)
- Lines 651-656 (render logging IIFE)
