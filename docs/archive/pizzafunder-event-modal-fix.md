# PizzaFunder Event Modal Fix

**Date:** October 15, 2025  
**Issue:** Events display on /pizzafunder but don't open when clicked  
**Status:** ✅ Fixed

## Problem

The PizzaFunderPage displayed upcoming events in two places:
1. Featured Events section (showing first 4 events)
2. Events tab (showing all events)

Both sections had click handlers (`onClick={() => setSelectedEvent(event)}`), but clicking events did nothing because:
- The `EventDialog` component was missing
- Helper functions `formatModalDate` and `deriveEventSummary` were missing
- The Dialog wasn't instantiated at the end of the component

## Solution

Added full event modal functionality matching the CrowdfundingPage implementation:

### 1. Added Imports
```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import Separator from '../components/ui/Separator';
import { cn } from '../lib/utils';
```

### 2. Added Event Badge Components
- `EVENT_STATUS_LABELS` - Status text mapping
- `EVENT_STATUS_STYLES` - Tailwind CSS classes for each status
- `EventBadge` - Reusable badge component

### 3. Added EventDialog Component
Full modal dialog that displays:
- Event hero image (if available)
- Event location and date
- Timing notes and location details
- Food type badge
- Event status badge (if not "scheduled")
- Tagline or summary
- Full description (Portable Text or plain text)
- Call-to-action button with tickets link

### 4. Added Helper Functions
- **`formatModalDate(event)`** - Formats event dates for modal display
  - Handles single dates and date ranges
  - Includes year when appropriate
  - Format: "Sat, Oct 15" or "Sat, Oct 15 - Sun, Oct 16"
  
- **`deriveEventSummary(event)`** - Extracts summary text from various sources
  - Prioritizes `event.summary` field
  - Falls back to first block of Portable Text description
  - Falls back to plain text description

### 5. Added Dialog Usage
```jsx
<EventDialog
  event={selectedEvent}
  open={Boolean(selectedEvent)}
  onOpenChange={(open) => {
    if (!open) {
      setSelectedEvent(null);
    }
  }}
  formatModalDate={formatModalDate}
  deriveSummary={deriveEventSummary}
  portableComponents={portableComponents}
/>
```

## Event Content from Sanity

Events are pulled from two sources in the Sanity query:
1. **Inline events** - `events[]` array directly on the campaign
2. **Featured events** - `featuredPublicEvents[]->` referenced events

The modal displays:
- `location` - Event title/name
- `startDate` / `endDate` - Date range
- `timingNote` - Custom timing description
- `locationDetails` - Address/location info
- `foodType` - Type of food (e.g., "Pizza", "Pie")
- `status` - Event status (scheduled, soldOut, postponed, cancelled)
- `tagline` - Short promotional text
- `description` - Full description (Portable Text blocks)
- `heroImage` - Event photo
- `ticketsUrl` - Link to tickets/registration
- `ctaLabel` - Button text (defaults to "Get tickets")

## Testing

To test the fix:
1. Navigate to `/pizzafunder`
2. Scroll to "Upcoming Pizza Events" section OR click "Events" tab
3. Click on any event card
4. Modal should open showing full event details
5. Click outside modal or X button to close
6. If event has `ticketsUrl`, click button to open in new tab

## User Experience

**Before:**
- Events displayed but were not clickable
- No way to see full event details
- No access to ticket links

**After:**
- Events are clickable with hover effects
- Modal opens with complete event information
- Beautiful layout with optional hero image
- Direct access to ticket/registration links
- Accessible (keyboard navigation, ARIA labels)
- Mobile responsive

## Related Files

- **Modified:** `src/pages/PizzaFunderPage.jsx`
- **Reference:** `src/pages/CrowdfundingPage.jsx` (source pattern)
- **Components:** `src/components/ui/dialog.jsx`, `src/components/ui/Separator.jsx`
- **Related Fix:** `docs/pizza-events-fix.md` (events display fix)

## Notes

- The EventDialog component is defined inline (not extracted to separate file) to keep it simple
- Pattern matches CrowdfundingPage for consistency
- Uses shadcn/ui Dialog component for accessibility
- Supports both Portable Text and plain text descriptions
- Handles missing/optional fields gracefully
- Hero image is optional but enhances visual appeal when present
