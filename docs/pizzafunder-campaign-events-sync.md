# PizzaFunder Campaign Events Sync

## Overview
The Sanity sync functionality now includes **Pizza Reward Pickup Opportunities** from the `crowdfundingCampaign` schema, syncing them into the master calendar alongside regular events.

## What Was Updated

### 1. **api/calendar/sync-sanity.js**
Enhanced to fetch and sync campaign events:

**What it now does:**
- Fetches regular events from `*[_type == "event"]` (existing)
- **NEW:** Fetches campaigns with events from `*[_type == "crowdfundingCampaign"]`
- **NEW:** Flattens campaign events into individual calendar entries
- **NEW:** Creates unique IDs: `{campaignId}_event_{index}`
- **NEW:** Sets `event_type: 'pizza_pickup'` for campaign events
- **NEW:** Maps campaign status values: `soldOut` → `sold_out`, `cancelled` → `cancelled`, `postponed` → `postponed`

**Campaign Event Fields Mapped:**
```javascript
{
  location → title + location
  startDate → start_date
  endDate → end_date
  timingNote → start_time
  status → status (mapped)
  ticketsUrl → stored in sanity_data
  description → stored in sanity_data
  heroImage → stored in sanity_data
  tagline, summary, locationDetails, ctaLabel → stored in sanity_data
}
```

**Response Format:**
```json
{
  "synced": 5,
  "total": 5,
  "sources": {
    "events": 3,
    "campaignEvents": 2
  },
  "errors": null
}
```

### 2. **supabase/calendar-schema.sql**
Updated enum constraints to support new values:

**event_type enum:**
```sql
-- BEFORE:
CHECK (event_type IN ('pizza_party', 'meal_prep', 'catering', 'private_event', 'blocked', 'other'))

-- AFTER:
CHECK (event_type IN ('pizza_party', 'pizza_pickup', 'meal_prep', 'catering', 'private_event', 'blocked', 'other'))
```

**status enum:**
```sql
-- BEFORE:
CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled'))

-- AFTER:
CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled', 'postponed', 'sold_out'))
```

### 3. **studio/schemaTypes/crowdfundingCampaign.js**
No changes needed - this is the source schema with the `events` array field (lines 182-300).

## How It Works

### Campaign Events Structure in Sanity
```javascript
{
  _type: 'crowdfundingCampaign',
  title: 'Pizza Challenge 2025',
  events: [
    {
      location: 'Downtown Pop-Up',
      startDate: '2025-10-25',
      endDate: '2025-10-25',
      timingNote: '5:00-8:00 PM',
      status: 'scheduled',
      description: [{ _type: 'block', ... }],
      heroImage: { asset: { _ref: '...' } },
      ...
    },
    {
      location: 'West Side Pickup',
      startDate: '2025-10-27',
      status: 'soldOut',
      ...
    }
  ]
}
```

### Synced to Calendar
Each event becomes a separate `calendar_events` row:

**Event 1:**
```sql
id: uuid
title: 'Downtown Pop-Up'
start_date: '2025-10-25'
start_time: '5:00-8:00 PM'
event_type: 'pizza_pickup'
status: 'scheduled'
location: 'Downtown Pop-Up'
sanity_data: { _id: 'campaign123_event_0', campaignTitle: 'Pizza Challenge 2025', ... }
```

**Event 2:**
```sql
id: uuid
title: 'West Side Pickup'
start_date: '2025-10-27'
event_type: 'pizza_pickup'
status: 'sold_out'
location: 'West Side Pickup'
sanity_data: { _id: 'campaign123_event_1', campaignTitle: 'Pizza Challenge 2025', ... }
```

## Usage

### Triggering Sync
1. Visit `/calendar` (admin page)
2. Click **"Sync Sanity Events"** button
3. See confirmation: "Synced 5 events (3 regular, 2 campaign events)"

### Viewing Campaign Events
- **HomePage:** Displays all public events, including campaign events
- **TimeSlotPicker:** Shows available campaign events for booking
- **CalendarPage:** Shows all events in admin view with `PIZZA_PICKUP` badge

### Identifying Campaign Events
- `event_type === 'pizza_pickup'`
- `sanity_data._type === 'campaignEvent'`
- `sanity_data.campaignId` links to parent campaign
- `sanity_data.campaignTitle` shows campaign name

## Deployment

### Database Changes Required
Run this SQL to add new enum values (or just re-run the full schema):

```sql
-- Add pizza_pickup to event_type
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_event_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_event_type_check 
  CHECK (event_type IN ('pizza_party', 'pizza_pickup', 'meal_prep', 'catering', 'private_event', 'blocked', 'other'));

-- Add postponed and sold_out to status
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_status_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_status_check 
  CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled', 'postponed', 'sold_out'));
```

**OR** just re-run the full schema file (safe if using `CREATE TABLE IF NOT EXISTS`).

### Code Deployment
```bash
git add .
git commit -m "Add PizzaFunder campaign events sync to master calendar"
git push origin main
```

Vercel auto-deploys the updated API endpoint.

## Testing

### 1. Verify Campaign Events in Sanity
Go to Sanity Studio → Crowdfunding Campaign → Check "Pizza Reward Pickup Opportunities" section has events.

### 2. Trigger Sync
Visit `/calendar` → Click "Sync Sanity Events" → Check response shows campaign events count.

### 3. Verify in Calendar
- Check CalendarPage shows pizza pickup events
- Check HomePage displays them in event list
- Check TimeSlotPicker includes them as booking options

### 4. Verify Database
```sql
SELECT 
  title, 
  event_type, 
  status, 
  sanity_data->>'campaignTitle' as campaign
FROM calendar_events
WHERE event_type = 'pizza_pickup';
```

## Architecture Notes

### One-Way Sync
- Direction: Sanity → Calendar (only)
- Campaign events created in Sanity are synced to calendar
- Calendar events are NOT synced back to Sanity

### Conflict Handling
- Campaign events respect all calendar rules:
  - 4-hour buffer enforcement
  - Capacity limits (if set)
  - Conflict detection with other events/time slots
- If a campaign event conflicts, it won't be bookable (but still displays)

### Update Behavior
- Re-syncing updates existing campaign events by `_id`
- If campaign event is removed from Sanity, it remains in calendar (not deleted)
- Manual deletion in calendar required if campaign event is discontinued

## Related Files
- `/api/calendar/sync-sanity.js` - Sync endpoint
- `/supabase/calendar-schema.sql` - Database schema with enums
- `/studio/schemaTypes/crowdfundingCampaign.js` - Source schema
- `/src/pages/CalendarPage.jsx` - Admin UI with sync button
- `/src/pages/HomePage.jsx` - Public display
- `/src/components/calendar/TimeSlotPicker.jsx` - Booking interface
