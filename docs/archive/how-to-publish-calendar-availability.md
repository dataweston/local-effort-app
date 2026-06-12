# How to Publish Available Time Slots from Master Calendar

## Current System Overview

Your master calendar is **already publishing** events and time slots to multiple pages. Here's how it works:

## Where Calendar Availability is Currently Displayed

### 1. **HomePage (`/`)** - Public Event List
**Location:** Bottom of homepage  
**Component:** `src/pages/HomePage.jsx` (lines 360-460)  
**Data Source:** `/api/calendar/public-events` (Supabase)

**What it shows:**
- All upcoming public events from `calendar_events` table
- Events with `visibility = 'public'` and `status IN ('scheduled', 'confirmed')`
- Only events with `start_date >= CURRENT_DATE`

**Display format:**
```
upcoming public events.
────────────────────────
→ Downtown Pizza Pop-Up
  Oct 25, 2025 - pizza_pickup

→ Private Dinner Party  
  Oct 27 - private_event
```

**Features:**
- Click event → Opens modal with full details
- Shows location with 📍 icon
- Shows Sanity description (rich text) or plain notes
- "Get tickets" button if `ticketsUrl` exists
- "Book a Spot" button if `is_bookable` is true
- Shows available slots if capacity is set

### 2. **EventsPage (`/events`)** - Static Marketing Page
**Location:** `src/pages/EventsPage.jsx`  
**Current State:** Does NOT show calendar events (only static content + photos)

**What it currently shows:**
- Marketing copy about catering services
- Photo gallery tagged with "dinner" and "event" from Cloudinary

**What it COULD show:**
- You could add the same event list from HomePage here
- You could add a dedicated calendar view
- You could embed TimeSlotPicker for direct booking

### 3. **PizzaFunder (`/pizzafunder/*`)** - Reward Booking
**Location:** Used by PizzaFunderPage.jsx  
**Component:** `src/components/calendar/TimeSlotPicker.jsx`  
**Data Source:** `/api/calendar/public-events` + `/api/calendar/time-slots`

**What it shows:**
- Combined list of bookable events AND time slots
- Only shown to customers who earned rewards (5+ pizzas, delivery/make-live preferences)
- Labeled with badges: "EVENT" or "TIME SLOT"

**Display format:**
```
Available Dates
─────────────────────────────
📅 Oct 25, 2025
   🕐 5:00 PM - Downtown Pop-Up
   [EVENT] (3 spots left)

📅 Oct 27, 2025  
   🕐 12:00 PM - Lunch Pickup
   [TIME SLOT] (5 spots left)
```

### 4. **Admin Calendar (`/calendar`)** - Internal Management
**Location:** `src/pages/CalendarPage.jsx`  
**Data Source:** `/api/calendar/events` (all events, not just public)

**What it shows:**
- Full calendar grid with ALL events (public, private, internal)
- Time slots management tab
- Financial summary
- Sync Sanity button

## How to Create Available Time Slots

You have **2 ways** to publish availability:

### Method 1: Create Events (calendar_events)
**Admin Interface:** `/calendar` → Calendar tab → "Add Event" button

**Fields:**
- **Title:** "Downtown Pizza Pop-Up"
- **Date:** 2025-10-25
- **Event Type:** pizza_pickup (or any other type)
- **Visibility:** **PUBLIC** ← Critical for publishing
- **Status:** scheduled
- **Location:** "Downtown Shop"
- **Capacity:** 10 (optional, for limited bookings)

**Result:**
- Shows on HomePage event list
- Available for booking via TimeSlotPicker
- Tracked in `calendar_events` table

### Method 2: Create Time Slots (calendar_time_slots)
**Admin Interface:** `/calendar` → Time Slots tab → "Add Time Slot" button

**Fields:**
- **Date:** 2025-10-27
- **Time:** 12:00 PM
- **Slot Type:** pickup (or delivery, prep, blocked)
- **Status:** available
- **Capacity:** 5
- **Location:** "West Side Kitchen"

**Result:**
- Shows in TimeSlotPicker (NOT in HomePage event list)
- Available for booking
- Tracked in `calendar_time_slots` table
- Automatically checks for conflicts with events (4-hour buffer)

### Method 3: Sync from Sanity (automatic)
**Admin Interface:** `/calendar` → "Sync Sanity Events" button

**What it does:**
- Imports events from Sanity CMS → master calendar
- Imports PizzaFunder campaign events → master calendar
- Sets `event_type = 'pizza_pickup'` for campaign events
- Sets `visibility = 'public'` automatically

**Sources:**
1. Regular Sanity events (`*[_type == "event"]`)
2. PizzaFunder campaign events (`crowdfundingCampaign.events[]`)

## API Endpoints for Availability

### Public Endpoints (Customer-Facing)

**1. `/api/calendar/public-events`** (GET)
- Returns: Public events only (visibility = 'public', status = scheduled/confirmed, future dates)
- Used by: HomePage, TimeSlotPicker
- Response:
```json
[
  {
    "id": "uuid",
    "title": "Downtown Pizza Pop-Up",
    "start_date": "2025-10-25",
    "event_type": "pizza_pickup",
    "location": "Downtown Shop",
    "capacity": 10,
    "available_slots": 3,
    "is_bookable": true,
    "sanity_data": { ... }
  }
]
```

**2. `/api/calendar/time-slots`** (GET)
- Query params: `?available_only=true`
- Returns: Available time slots only (status = 'available', future dates)
- Used by: TimeSlotPicker
- Response:
```json
[
  {
    "id": "uuid",
    "slot_date": "2025-10-27",
    "slot_time": "12:00:00",
    "slot_type": "pickup",
    "capacity": 5,
    "available_slots": 5,
    "is_bookable": true,
    "location": "West Side Kitchen"
  }
]
```

**3. `/api/calendar/book`** (POST)
- Body:
```json
{
  "event_id": "uuid",           // OR time_slot_id
  "time_slot_id": "uuid",       // OR event_id
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "555-1234",
  "booking_type": "pizza_pickup",
  "quantity": 5,
  "notes": "Extra sauce"
}
```
- Creates booking in `calendar_bookings` table
- Decrements `booked_slots` counter
- Respects capacity limits

## How to Add Calendar to /events Page

If you want to display calendar availability on `/events` page, here are your options:

### Option A: Add Event List (Simple)
Add the same event list component from HomePage to EventsPage:

```jsx
// In src/pages/EventsPage.jsx
import { useState, useEffect } from 'react';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    fetch('/api/calendar/public-events')
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []));
  }, []);
  
  return (
    <>
      {/* Existing content */}
      
      {/* Add event list */}
      {events.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mt-8">
          <h2>Upcoming Events</h2>
          <ul>
            {events.map(ev => (
              <li key={ev.id}>
                {ev.title} - {ev.start_date} - {ev.location}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
```

### Option B: Add Calendar Grid (Advanced)
Embed the full CalendarGrid component (currently admin-only):

```jsx
import CalendarGrid from '../components/calendar/CalendarGrid';

// Show read-only calendar view
<CalendarGrid readOnly={true} />
```

### Option C: Add Booking Widget (Interactive)
Embed TimeSlotPicker for direct booking:

```jsx
import { TimeSlotPicker } from '../components/calendar/TimeSlotPicker';

// Show booking interface
<TimeSlotPicker 
  onBook={(booking) => {
    // Handle booking submission
    console.log('Booked:', booking);
  }}
/>
```

## Database Queries for Custom Displays

If you want to create custom displays, here are the SQL queries:

### Get All Public Events
```sql
SELECT * FROM calendar_events_public
ORDER BY start_date ASC;
```

### Get Available Time Slots
```sql
SELECT * FROM calendar_time_slots_available
ORDER BY slot_date ASC, slot_time ASC;
```

### Get Events by Type
```sql
SELECT * FROM calendar_events
WHERE event_type = 'pizza_pickup'
  AND visibility = 'public'
  AND start_date >= CURRENT_DATE
ORDER BY start_date ASC;
```

### Get Bookings for an Event
```sql
SELECT * FROM calendar_bookings
WHERE event_id = 'uuid'
  AND booking_status != 'cancelled'
ORDER BY created_at DESC;
```

## Workflow: Publishing Availability

### For Regular Events
1. Go to `/calendar`
2. Click "Add Event"
3. Fill out form (set **visibility = public**)
4. Click "Save Event"
5. ✅ Event appears on HomePage immediately
6. ✅ Event available in TimeSlotPicker for booking

### For Time Slots (Granular Control)
1. Go to `/calendar` → Time Slots tab
2. Click "Add Time Slot"
3. Fill out form (date, time, capacity)
4. Click "Save"
5. ✅ Slot appears in TimeSlotPicker
6. ✅ Conflict detection prevents overlaps

### For Sanity Events (Batch Import)
1. Create events in Sanity Studio (or PizzaFunder campaign)
2. Go to `/calendar`
3. Click "Sync Sanity Events"
4. ✅ All Sanity events imported as public events
5. ✅ Campaign events tagged as `pizza_pickup` type

## Current Limitations & Future Enhancements

### Current State ✅
- HomePage shows public events
- TimeSlotPicker shows events + time slots combined
- Admin can manage via `/calendar`
- Automatic conflict detection (4-hour buffer)
- Capacity tracking
- Booking system functional

### Not Yet Implemented 🚧
- **/events page does NOT show calendar** (only static content)
- No public calendar view (grid/month view)
- No iCal export
- No automatic Sanity sync (manual button only)
- No email notifications for bookings
- No customer booking management portal

### Easy Additions
If you want to enhance `/events` page, I can help you:
1. Add the event list from HomePage → EventsPage (5 min)
2. Add TimeSlotPicker for direct booking (10 min)
3. Add calendar grid view (20 min)
4. Add filters (by type, date range, location) (15 min)

## Summary

**Your calendar IS publishing availability**, just not on `/events` page yet.

**Current publishing locations:**
- ✅ HomePage (`/`) - shows public events
- ✅ PizzaFunder (`/pizzafunder/*`) - shows events + time slots for booking
- ✅ Admin Calendar (`/calendar`) - full management interface

**To add to /events page:**
Let me know which option you prefer (event list, calendar grid, or booking widget) and I'll implement it.

**To create new availability:**
Use `/calendar` admin interface to create events (public visibility) or time slots, or click "Sync Sanity Events" to import from CMS.
