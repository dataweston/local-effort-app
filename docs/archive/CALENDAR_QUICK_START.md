# Calendar System - Quick Deploy Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Apply Database Migration

Run this in Supabase SQL Editor (https://app.supabase.com → SQL Editor):

```sql
-- Copy the entire contents of: supabase/migrations/20241027_calendar_system.sql
-- Paste here and click "Run"
```

OR use Supabase CLI:
```bash
npx supabase db push
```

---

### Step 2: Restart Your Dev Server

```bash
# Stop current server (Ctrl+C if running)
# Then start fresh:
npm run dev
```

---

### Step 3: Verify It Works

Open browser to: http://localhost:5173/calendar

You should see:
- ✅ No 404 errors in console
- ✅ Calendar grid displaying
- ✅ Tabs: Calendar, Time Slots, Invitations, Financials
- ✅ "Sync Sanity" button working

---

## 🎯 What to Test

### Test 1: Create an Event
1. Go to `/calendar`
2. Click "New Event"
3. Fill in:
   - Title: "Test Pizza Party"
   - Date: Tomorrow
   - Event Type: pizza_party
   - Visibility: public
4. Save
5. Should appear on calendar grid

### Test 2: Create a Time Slot
1. Go to `/calendar` → Time Slots tab
2. Fill in:
   - Date: Tomorrow
   - Time: 6:00 PM
   - Type: pizza_pickup
   - Capacity: 10
3. Create Slot
4. Should appear in list below

### Test 3: Generate Invitation
1. Go to `/calendar` → Invitations tab
2. Fill in:
   - Customer Name: "John Doe"
   - Customer Email: "test@example.com"
   - Pizza Count: 5
3. Click "Generate Invitation Link"
4. Copy the link
5. Open in new tab (or incognito)
6. Should see scheduling page with available dates

### Test 4: Make a Booking
1. From the invitation link (Step 3)
2. Select a date/time
3. Click "Confirm Booking"
4. Should see confirmation message
5. Go back to `/calendar` → Time Slots tab
6. The booked_count should have increased

---

## 🔍 Troubleshooting

### "404 Not Found" in console
- **Fix**: Restart dev server (Step 2)
- **Check**: All files in `api/calendar/` exist

### Migration errors
- **Check**: You're using service role key (not anon key)
- **Try**: Run SQL manually in Supabase dashboard
- **See**: `supabase/migrations/README_CALENDAR_SETUP.md`

### Events not appearing on calendar
- **Check**: Browser console for errors
- **Verify**: `/api/calendar/events` returns data
- **Test**: Create a new event with today's date

### Time slots not showing
- **Check**: Date is in the future
- **Verify**: `is_bookable` is true
- **Verify**: `status` is 'available'

---

## 📞 Test Commands

```bash
# Get all events
curl http://localhost:5173/api/calendar/events

# Get public events only
curl http://localhost:5173/api/calendar/public-events

# Get available time slots
curl 'http://localhost:5173/api/calendar/time-slots?available_only=true'

# Sync from Sanity (if you have events there)
curl -X POST http://localhost:5173/api/calendar/sync-sanity

# Test invitation validation
curl 'http://localhost:5173/api/calendar/validate-invite?token=YOUR_TOKEN'
```

---

## ✅ Success Checklist

After completing Steps 1-3, verify:

- [ ] No console errors when visiting `/calendar`
- [ ] Can create a new event
- [ ] Event appears on calendar grid
- [ ] Can create a time slot
- [ ] Can generate an invitation link
- [ ] Invitation link shows scheduling page
- [ ] Can make a booking from invitation
- [ ] Booking increments the booked_count

If all checked ✅ → **System is working!**

---

## 🎨 Visual Guide

**Before Fix:**
```
Console: ❌ 404 /api/calendar/time-slots
Console: ❌ 404 /api/calendar/generate-invite
Calendar: Events in list but not on grid
Time Slots: Spinner forever (404 error)
```

**After Fix:**
```
Console: ✅ All APIs responding
Calendar: ✅ Events on grid with colors
Time Slots: ✅ Manager working with conflict detection
Invitations: ✅ Link generation working
Bookings: ✅ Full flow functional
```

---

## 🚨 If Something Breaks

1. Check browser console for errors
2. Check terminal for backend errors
3. Verify database migration applied:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name LIKE 'calendar_%';
   ```
4. See full troubleshooting: `supabase/migrations/README_CALENDAR_SETUP.md`
5. Review fix summary: `CALENDAR_FIX_SUMMARY.md`

---

**Ready to go? Start with Step 1! 🚀**
