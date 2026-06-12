# Phase 2: Smart Scheduling - COMPLETE ✅

## Overview
Phase 2 adds granular time slot management with automatic conflict detection and a 4-hour buffer rule between bookings.

## What Was Built

### 1. Database Schema (`supabase/calendar-phase2-schema.sql`)

#### New Tables
- **`calendar_time_slots`**: Granular scheduling with inventory-style capacity control
  - `slot_date`, `slot_time`: When the slot occurs
  - `capacity`: Optional (NULL = unlimited)
  - `booked_count`: Auto-updated by triggers
  - `buffer_hours`: Conflict prevention window (default 4 hours)
  - `status`: available, booked, blocked

#### Enhanced Tables
- **`calendar_events`**: Added `buffer_hours` column (default 4)
- **`calendar_bookings`**: Added `time_slot_id` foreign key

#### Smart Conflict Detection
- **`check_scheduling_conflicts()`** function
  - Checks overlaps across BOTH events and time slots
  - Respects buffer_hours window
  - Returns detailed conflict information
- **Automatic triggers** prevent creation of conflicting events/slots
- **Overbooking prevention** for time slots

### 2. API Endpoints

#### `/api/calendar/time-slots` (GET, POST, PATCH, DELETE)
- **GET**: List time slots with filters (date, type, status, available_only)
- **POST**: Create new time slot with conflict checking
- **PATCH**: Update time slot (conflict check on date/time changes)
- **DELETE**: Remove time slot (prevents deletion if has confirmed bookings)

#### `/api/calendar/check-conflicts` (POST)
- Real-time conflict detection for admin UI
- Used by EventForm to show warnings before saving

#### `/api/calendar/book` (Updated)
- Now supports booking EITHER events OR time slots
- Validates capacity before confirming
- Returns booking type in response

### 3. Admin Components

#### `TimeSlotManager.jsx`
- Create/edit/delete time slots
- Capacity control (optional)
- Buffer hours configuration
- **Real-time conflict warnings** when scheduling conflicts detected
- Cannot delete slots with confirmed bookings
- Visual indicators for capacity and status

#### `EventForm.jsx` (Enhanced)
- Added `buffer_hours` field
- **Auto-checks for conflicts** when date/time changes
- Displays conflict warnings inline
- Suggests resolution options (reduce buffer, change time, save as draft)

#### `CalendarPage.jsx` (Updated)
- New "Time Slots" tab for accessing TimeSlotManager
- Integrates with existing Calendar and Financials tabs

### 4. Customer Components

#### `TimeSlotPicker.jsx` (Enhanced)
- **Shows BOTH events AND time slots** in unified view
- Clear labeling (EVENT badge vs TIME SLOT badge)
- Displays time for time slots
- Conditional time picker (only for events without set times)
- Books to correct endpoint based on selection type

## Key Features

### ✅ Flexible Capacity Control
- **Unlimited**: Leave capacity NULL
- **Limited**: Set exact number (inventory-style)
- Works for both events and time slots

### ✅ 4-Hour Buffer Rule
- Configurable per event/slot (default 4 hours)
- Automatic conflict detection
- Prevents double-booking within buffer window

### ✅ Conflict Prevention
- Database-level triggers block invalid inserts
- API-level validation with clear error messages
- Admin UI warnings BEFORE saving
- Shows what conflicts with what and by how much

### ✅ Unified Booking Experience
- Customers see all available options (events + time slots)
- Single booking flow handles both types
- Clear visual distinction between types
- Automatic capacity tracking

## How It Works

### Admin Workflow
1. **Create Event**: EventForm checks conflicts as you type date/time
2. **Create Time Slot**: TimeSlotManager validates against events and other slots
3. **Conflicts Detected**: See detailed list of overlapping items
4. **Resolution Options**:
   - Reduce buffer hours
   - Change date/time
   - Save as draft (skips conflict check)

### Customer Workflow
1. Visit TimeSlotPicker (e.g., PizzaFunder reward scheduling)
2. See combined list of:
   - Public events (tagged as EVENT)
   - Available time slots (tagged as TIME SLOT)
3. Select preferred option
4. Confirm booking
5. System validates capacity and prevents overbooking

### Automatic Safeguards
- **Trigger 1**: `prevent_event_conflicts` - Blocks event creation if conflicts exist
- **Trigger 2**: `prevent_timeslot_conflicts` - Blocks time slot creation if conflicts exist
- **Trigger 3**: `update_event_booked_slots` - Auto-updates event booking counter
- **Trigger 4**: `update_timeslot_booked_count` - Auto-updates slot booking counter
- **Trigger 5**: `prevent_overbooking` - Blocks bookings exceeding capacity
- **Trigger 6**: `prevent_timeslot_overbooking` - Blocks slot bookings exceeding capacity

## Database Setup

### Prerequisites
- Phase 1 tables must exist (calendar_events, calendar_bookings, calendar_receipts)
- Run `calendar-schema.sql`, `calendar-rls.sql`, `calendar-triggers.sql` first

### Installation
```sql
-- Run in Supabase SQL Editor
-- This will:
-- 1. Add buffer_hours to calendar_events
-- 2. Create calendar_time_slots table
-- 3. Add time_slot_id to calendar_bookings
-- 4. Create conflict detection function
-- 5. Add automatic triggers for conflict prevention
-- 6. Add views for available time slots
```

Copy and paste `supabase/calendar-phase2-schema.sql` into Supabase SQL Editor and execute.

## Testing Checklist

### Admin Tests
- [ ] Create event → sees conflict warning if overlap exists
- [ ] Create time slot → sees conflict warning if overlap exists
- [ ] Change buffer hours → conflict warnings update
- [ ] Try to delete time slot with bookings → blocked with error
- [ ] Unlimited capacity (NULL) → accepts infinite bookings
- [ ] Limited capacity (number) → blocks when full

### Customer Tests
- [ ] TimeSlotPicker shows both events and time slots
- [ ] Events labeled as "EVENT"
- [ ] Time slots labeled as "TIME SLOT"
- [ ] Can book event → success
- [ ] Can book time slot → success
- [ ] Try to book full event → clear error message
- [ ] Try to book full time slot → clear error message

### Conflict Detection Tests
- [ ] Create event at 2pm with 4hr buffer → blocks events/slots 10am-6pm
- [ ] Create event as draft → skips conflict check
- [ ] Change buffer to 0 → allows tight scheduling
- [ ] Same day, different times with buffer → conflict detected
- [ ] Same day, times outside buffer → no conflict

## Files Created/Modified

### New Files (Phase 2)
```
supabase/calendar-phase2-schema.sql     - Database schema & functions
api/calendar/time-slots.js              - Time slot CRUD API
api/calendar/check-conflicts.js         - Conflict detection API
src/components/calendar/TimeSlotManager.jsx - Admin time slot UI
```

### Modified Files
```
api/calendar/book.js                    - Added time slot booking support
src/components/calendar/TimeSlotPicker.jsx - Added event + slot display
src/components/calendar/EventForm.jsx   - Added conflict warnings
src/pages/CalendarPage.jsx             - Added Time Slots tab
```

## Architecture

### Data Flow: Creating Time Slot
1. Admin fills TimeSlotManager form
2. **Pre-check**: API calls `check_scheduling_conflicts()` function
3. If conflicts: Show warning UI, don't save
4. If no conflicts: POST to `/api/calendar/time-slots`
5. **DB Trigger**: `prevent_timeslot_conflicts` validates again
6. Success: Time slot created, list refreshes

### Data Flow: Customer Booking
1. Customer loads TimeSlotPicker
2. **Parallel fetch**: GET `/api/calendar/public-events` + `/api/calendar/time-slots?available_only=true`
3. Merge results, sort by date
4. Customer selects and confirms
5. POST to `/api/calendar/book` with `event_id` OR `time_slot_id`
6. **DB Trigger**: Capacity check, auto-increment booked_count
7. Success: Booking confirmed, confirmation shown

### Conflict Detection Logic
```
Buffer Window = [Event Time - Buffer Hours] to [Event Time + Buffer Hours]

Conflict EXISTS if:
  - Another event/slot exists
  - Its buffer window overlaps with this buffer window
  - Not in 'cancelled' or 'draft' status
  - Not the same event (when editing)
```

## Next Steps (Future Enhancements)

### Potential Phase 3 Features
- **Recurring time slots**: Weekly/monthly patterns
- **Multi-day events**: Better buffer logic for multi-day events
- **Team scheduling**: Assign staff to time slots
- **Customer notifications**: Email reminders before slot time
- **Waitlist**: Auto-notify when capacity opens up
- **Booking modifications**: Allow customers to reschedule
- **Analytics**: Peak times, capacity utilization reports

## Support

### Common Issues

**Q: Conflict detected but I don't see overlap?**
A: Check the buffer hours setting. A 4-hour buffer means 4 hours BEFORE and AFTER.

**Q: Can't create back-to-back events?**
A: Set `buffer_hours` to 0 for tight scheduling. Default is 4 hours.

**Q: Time slots not showing for customers?**
A: Check `status` is 'available' and `slot_date` is in the future.

**Q: Database trigger error on conflict?**
A: The API should catch this first. If trigger fires, it means API validation was bypassed. Check your API code.

### Debug Commands
```sql
-- See all conflicts for a date/time
SELECT * FROM check_scheduling_conflicts(
  '2025-10-25',  -- date
  '14:00',       -- time
  4              -- buffer hours
);

-- See all available time slots
SELECT * FROM calendar_time_slots_available;

-- Check event buffer settings
SELECT id, title, start_date, start_time, buffer_hours 
FROM calendar_events 
WHERE status IN ('scheduled', 'confirmed');
```

---

**Phase 2 Status**: ✅ COMPLETE
**Last Updated**: 2025-10-21
**Documentation**: Complete
**Test Coverage**: Manual testing required
**Production Ready**: Yes (after database migration)
