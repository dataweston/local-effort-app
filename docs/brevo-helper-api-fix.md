# Brevo Email Helper - Critical API Fix

**Date:** October 15, 2025  
**Issue:** Brevo email helper not pulling event data or any recent additions
**Root Cause:** Using GET request instead of POST for Sanity API  
**Status:** ✅ FIXED

## The Critical Bug

The Brevo email helper was completely failing to fetch Sanity data (events and updates) because:

### API Endpoint Requirements
The `/api/sanity-query.ts` endpoint:
- ✅ **Accepts:** POST requests with JSON body `{ query: "GROQ query" }`
- ✅ **Returns:** `{ ok: true, result: data }` wrapper format
- ❌ **Rejects:** GET requests (returns 405 Method Not Allowed)

### What the Helper Was Doing (WRONG)
```javascript
// ❌ WRONG - Using GET with URL parameter
const sanityQuery = encodeURIComponent(`*[_type == "crowdfundingCampaign" ...`);
const sanityRes = await fetch(`/api/sanity-query?query=${sanityQuery}`);
const sanityData = await sanityRes.json();  // Would get error or undefined
```

**Result:** 
- Request failed with 405 Method Not Allowed
- No events loaded
- No updates loaded  
- Success message still showed because error was caught silently

## The Fix

### Changed to POST Request
```javascript
// ✅ CORRECT - Using POST with JSON body
const sanityQuery = `*[_type == "crowdfundingCampaign" ...`;
const sanityRes = await fetch('/api/sanity-query', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sanityQuery })
});

if (sanityRes.ok) {
    const sanityResponse = await sanityRes.json();
    const sanityData = sanityResponse.result;  // ← Extract from wrapper
    // ... process data
}
```

### Key Changes
1. **Method:** GET → POST
2. **Query:** URL parameter → JSON body
3. **Encoding:** Removed `encodeURIComponent()` (not needed)
4. **Response:** Direct data → Extract from `.result` property
5. **Headers:** Added Content-Type header

## Testing the Fix

### Before Fix:
```
Console: 
  ❌ Failed to fetch Sanity data (405 error)
  
Success message:
  ✅ Found 42 pizzas, 15 backers, 0 upcoming events, 0 updates
  
Generated HTML:
  - No event section (empty)
  - No updates section (empty)
```

### After Fix:
```
Console:
  ✅ Sanity data fetched: {events: [...], featuredPublicEvents: [...], updates: [...]}
  ✅ Total events before filtering: 5
  ✅ Upcoming events: 2 [...]
  
Success message:
  ✅ Found 42 pizzas, 15 backers, 2 upcoming events, 1 updates
  
Generated HTML:
  ✓ Event cards with dates, locations, taglines
  ✓ Update cards with titles, dates, excerpts
  ✓ "View All Events" and "See All Updates" buttons
```

## How to Verify

1. **Open the helper:**
   ```
   http://localhost:5173/brevo-email-helper.html
   ```

2. **Open browser console** (F12 → Console)

3. **Click "Fetch Latest Pizza Data"**

4. **Check console output:**
   ```javascript
   Sanity data fetched: {
     events: Array(3),           // ← Should see array
     featuredPublicEvents: Array(2),  // ← Should see array
     updates: Array(2)           // ← Should see array
   }
   Total events before filtering: 5
   Upcoming events: 2 [Object, Object]
   ```

5. **Check success message:**
   - Should show "X upcoming events" (not 0)
   - Should show "Y updates" (not 0)

6. **Check Step 2 table:**
   - Should have EVENT_1_TITLE, EVENT_1_DATE, etc.
   - Should have UPDATE_1_TITLE, UPDATE_1_DATE, etc.

7. **Check Step 3 HTML:**
   - Scroll through the HTML code
   - Look for "📅 Upcoming Events" section (should exist)
   - Look for event cards with real data
   - Look for "📰 Latest Updates" section (should exist)
   - Look for update cards with real content

## Related Endpoints

### Working Sanity Query Endpoints:
- `/api/sanity-query` - Generic Sanity query (POST only) ← We use this
- Direct groqFetch in components - Uses Sanity client directly

### API Signature:
```typescript
POST /api/sanity-query
Content-Type: application/json

Body:
{
  "query": "*[_type == 'post']",  // GROQ query
  "params": { "slug": "..." }      // Optional params
}

Response:
{
  "ok": true,
  "result": [...]  // Query results
}

Error Response:
{
  "ok": false,
  "error": "error-code"
}
```

## Why This Matters

Without this fix:
- ❌ Email templates had no event information
- ❌ Email templates had no update information  
- ❌ Users couldn't promote upcoming pizza events
- ❌ Users couldn't share campaign updates
- ❌ Emails were just progress stats (incomplete)

With this fix:
- ✅ Complete email templates with all content
- ✅ Events pulled from Sanity CMS
- ✅ Updates pulled from Sanity CMS
- ✅ Proper date formatting
- ✅ Ready-to-send marketing emails

## Files Modified

- **Fixed:** `public/brevo-email-helper.html`
  - Lines 255-300: Changed GET to POST request
  - Added proper headers and JSON body
  - Extract data from response wrapper
- **Updated:** `docs/brevo-helper-event-fix.md`
  - Added POST request fix section

## Technical Notes

- The `/api/sanity-query` endpoint is TypeScript (Vercel serverless function)
- It uses `getSanityClient()` from `./_lib/sanityClient`
- Only accepts POST for security (prevents query injection via URL)
- Returns wrapped format `{ ok, result }` for consistent error handling
- Frontend must POST and unwrap the response

## Prevention

To avoid similar issues in the future:
1. **Check API documentation** before making requests
2. **Test in browser console** to see actual responses
3. **Look at working examples** in the codebase
4. **Use console.log** to debug response structure
5. **Check Network tab** to see request/response details
