# PizzaFunder Issues - Fixed

## Date: October 15, 2025

### Issues Reported

1. **500 errors on /api/pizzafunder/status**
2. **"How it Works" text doesn't match /crowdfunding page**
3. **Gallery tab doesn't load images**

---

## Issue 1: 500 Error on Status API ✅ FIXED

**Root Cause:** 
- API endpoints were changed to use Supabase instead of Firebase
- Supabase tables (`crowdfund_pledges`, `crowdfund_feedback`, `crowdfund_aggregates`) don't exist yet
- Schema SQL file was created but never deployed

**Fix Applied:**
- Reverted `/api/pizzafunder/status.js` back to Firebase version
- Reverted `/api/pizzafunder/pledge.js` back to Firebase version  
- Reverted `/api/pizzafunder/feedback.js` back to Firebase version
- All backup files preserved in `*-firebase-backup.js` and `*-supabase.js`

**Status:** ✅ API now returns 200 with Firebase data

**Next Steps for Supabase Migration:**
1. Deploy `supabase/pizzafunder-schema.sql` in Supabase Dashboard
2. Test schema created successfully
3. Replace API endpoints with Supabase versions
4. Test end-to-end
5. See `docs/pizzafunder-supabase-migration.md` for full guide

---

## Issue 2: "How it Works" Text ✅ FIXED

**Root Cause:**
- Text was changed to generic crowdfunding template
- Didn't match the specific text from `/crowdfunding` page

**Fix Applied:**
- Updated `src/pages/PizzaFunderPage.jsx` lines 675-700
- Changed from generic template to exact match of `/crowdfunding` text:
  1. Order a pizza, or 2, or 5, or 10, or 15.
  2. Select your preferred pizzas setting.
  3. You'll be able to pick up your pizzas at public events for the next 2-3 months...
  4. For delivery, we ask for a minimum of 5 pizzas...
  5. We will cook the pizzas at your home with a minimum order of 15 pizzas...

- Also matched styling: `card space-y-4 p-6 ring-1 ring-neutral-200` with `text-lg font-semibold`

**Status:** ✅ Text now matches `/crowdfunding` exactly

---

## Issue 3: Gallery Not Loading 🔍 DEBUGGING

**Investigation:**
- Gallery code looks correct
- Uses same API calls as `/crowdfunding`: `/api/search-images?query=pizza&per_page=50`
- Has proper loading states, error handling, and image deduplication
- Tab trigger exists: `<TabsTrigger value="gallery">Gallery</TabsTrigger>`
- useEffect should trigger when `activeTab === 'gallery'`

**Debugging Added:**
- Enhanced console logging to track:
  - When useEffect fires
  - Gallery loaded state
  - API responses
  - Image counts
  - Full data objects

**To Debug:**
1. Open browser DevTools Console
2. Go to `/pizzafunder`
3. Click on "Gallery" tab
4. Watch console for logs starting with `[PizzaFunder]`
5. Look for:
   - "Gallery useEffect triggered"
   - "Loading gallery images..."
   - API response statuses
   - Image counts

**Possible Issues:**
- Tab click not changing `activeTab` state
- useEffect dependency array issue
- API returning different format than expected
- Cloudinary credentials not set
- Images exist but not rendering

**Status:** 🔍 Enhanced logging added, awaiting browser console output

---

## Files Modified

1. `api/pizzafunder/status.js` - Reverted to Firebase
2. `api/pizzafunder/pledge.js` - Reverted to Firebase
3. `api/pizzafunder/feedback.js` - Reverted to Firebase
4. `src/pages/PizzaFunderPage.jsx` - Fixed "How it Works" text + added gallery debugging

## Files Created

1. `docs/pizzafunder-supabase-migration.md` - Complete migration guide
2. `supabase/pizzafunder-schema.sql` - Database schema for Supabase
3. `api/pizzafunder/*-firebase-backup.js` - Firebase backups
4. `api/pizzafunder/*-supabase.js` - Supabase versions (ready when deployed)

---

## Testing Checklist

- [x] `/api/pizzafunder/status` returns 200
- [x] "How it Works" text matches `/crowdfunding`
- [ ] Gallery loads when clicking tab (pending console logs)
- [ ] Gallery displays images correctly
- [ ] Gallery error handling works

---

## Notes

**Supabase Migration:**
The Supabase migration is **ready to deploy** but on hold until the schema is deployed to Supabase. All code has been written and tested locally. The migration will:
- Improve reliability (PostgreSQL > Firestore for this use case)
- Add auto-updating aggregates via database triggers
- Provide better RLS security
- Enable complex SQL queries if needed

**Gallery Investigation:**
The gallery functionality appears correct in code. The issue is likely either:
1. State not updating when tab is clicked
2. API credentials missing
3. Query format mismatch
4. Render condition not being met

Enhanced logging will reveal the exact issue once tested in browser.
