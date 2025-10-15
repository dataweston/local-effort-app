# Brevo Email Helper Event & Update Fix

**Date:** October 15, 2025  
**Issue:** Events and updates not appearing in generated email HTML  
**Status:** ✅ Fixed

## Problem

The Brevo email helper tool (`public/brevo-email-helper.html`) was not properly fetching or displaying:
1. Event data from Sanity CMS
2. Update data from Sanity CMS
3. Event dates were not being formatted correctly

## Root Causes

1. **Incomplete Sanity Query** - Missing fields:
   - `status` (event status)
   - `ticketsUrl` (event ticket link)
   - `ctaLabel` (custom button text)
   - `slug` (update slug for links)

2. **Wrong Date Priority** - Was using `timingNote || formatDate(startDate)` instead of `startDate ? formatDate(startDate) : timingNote`
   - This caused events with both fields to show timingNote instead of properly formatted dates

3. **Missing Validation** - No default values for event titles, causing empty checks to fail

4. **No Debug Logging** - Hard to diagnose what was being fetched

## Changes Made

### 1. Updated Sanity Query
Added missing fields to both inline events and featuredPublicEvents:
```javascript
events[]{
    _key,
    location,
    tagline,
    summary,
    startDate,
    endDate,
    timingNote,
    foodType,
    status,        // ← Added
    ticketsUrl,    // ← Added
    ctaLabel,      // ← Added
    locationDetails
}
```

Also added `slug` to updates query for better linking.

### 2. Fixed Date Formatting Priority
**Before:**
```javascript
brevoVars.EVENT_1_DATE = event1.timingNote || formatDate(event1.startDate) || '';
```

**After:**
```javascript
brevoVars.EVENT_1_DATE = event1.startDate 
    ? formatDate(event1.startDate) 
    : event1.timingNote || '';
```

This ensures actual dates are formatted consistently (e.g., "Saturday, Oct 15, 3:00 PM") rather than using custom timingNote strings.

### 3. Added Default Values
Changed empty string defaults to meaningful fallbacks:
```javascript
brevoVars.EVENT_1_TITLE = event1.location || 'Pizza Event';  // Was: || ''
brevoVars.UPDATE_1_TITLE = update1.title || 'Campaign Update';  // Was: || ''
```

### 4. Added Debug Logging
```javascript
console.log('Sanity data fetched:', sanityData);
console.log(`Total events before filtering: ${allEvents.length}`);
console.log(`Upcoming events: ${upcomingEvents.length}`, upcomingEvents);
console.log('Sanity query failed:', sanityRes.status, sanityRes.statusText);
```

### 5. Enhanced Success Message
**Before:**
```
✅ Successfully fetched data! Found 42 pizzas and 15 backers.
```

**After:**
```
✅ Successfully fetched data! Found 42 pizzas, 15 backers, 2 upcoming events, and 1 updates.
```

### 6. Improved Date Sorting
Changed from:
```javascript
.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
```

To:
```javascript
.sort((a, b) => {
    const aDate = new Date(a.startDate);
    const bDate = new Date(b.startDate);
    return aDate - bDate;
})
```

More explicit and easier to debug.

## Testing

To verify the fix works:

1. **Open the helper tool:**
   ```
   http://localhost:5173/brevo-email-helper.html
   ```

2. **Open browser console** (F12 → Console tab)

3. **Click "Fetch Latest Pizza Data"**

4. **Check console logs for:**
   ```
   Sanity data fetched: {events: Array(X), featuredPublicEvents: Array(Y), updates: Array(Z)}
   Total events before filtering: X
   Upcoming events: 2 [...]
   ```

5. **Verify success message shows:**
   - Pizzas count
   - Backers count
   - Events count (should be > 0)
   - Updates count (should be > 0)

6. **Check Step 2 table** - Should show EVENT_1_TITLE, EVENT_1_DATE, etc.

7. **Check Step 3 HTML** - Events section should be populated with actual event data

## Expected Output

### Variables Generated
```
PIZZAS_SOLD: "42"
BACKERS_COUNT: "15"
GOAL: "1000"
PROGRESS_PERCENT: "4"
REMAINING: "958"
EVENT_1_TITLE: "Pizza Party at Happy Monday"
EVENT_1_LOCATION: "2621 N Milwaukee Ave"
EVENT_1_DATE: "Saturday, Nov 2, 3:00 PM"
EVENT_1_TAGLINE: "Come get your pizzas!"
EVENT_1_FOOD_TYPE: "Pizza"
EVENT_2_TITLE: "Winter Market"
EVENT_2_LOCATION: "Local Farmers Market"
EVENT_2_DATE: "Sunday, Dec 15, 10:00 AM"
EVENT_2_TAGLINE: "Pizza for breakfast!"
EVENT_2_FOOD_TYPE: "Pizza"
UPDATE_1_TITLE: "We hit 50 pizzas!"
UPDATE_1_DATE: "October 12, 2025"
UPDATE_1_EXCERPT: "Amazing news! We've already sold 50 pizzas in just 2 weeks..."
UPDATE_1_LINK: "https://localeffortfood.com/pizzafunder#updates"
```

### Generated Email HTML
The complete HTML in Step 3 should now include:
- ✅ Populated event cards with real dates
- ✅ Event locations and taglines
- ✅ Food type badges
- ✅ Update cards with excerpts
- ✅ Properly formatted dates

## Related Files

- **Fixed:** `public/brevo-email-helper.html`
- **Reference:** `scripts/prepare-brevo-email-data.js` (working version)
- **Template:** `emails/pizzafunder-update-template.html`

## Notes

- The helper now matches the Node.js script exactly in terms of data fetching logic
- Console logging helps debug Sanity query issues
- Default values prevent empty sections from appearing
- Date formatting is now consistent across both tools
- Events are properly filtered to show only upcoming events
- Both inline events and featured events are merged correctly
