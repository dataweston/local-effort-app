# Master Calendar System Instructions

## Applies To
- `src/pages/CalendarPage.jsx`
- `src/components/calendar/**/*`
- `api/calendar/**/*`
- `supabase/calendar-*.sql`
- `gallant-hawking-l8r4wz/src/App.jsx`

## Project Overview

**Goal:** Single master calendar system using Supabase that drives all event display and booking across the entire application.

**Scope:**
- ✅ New admin calendar interface (`/partners/calendar` or `/calendar`)
- ✅ Public event display on Homepage, PizzaFunder, Events page
- ✅ Customer booking/scheduling for pizza pickups and instant bookings
- ✅ Gallant-Hawking calendar migrated to Supabase (keep UI, swap backend)
- ❌ ZAFA calendar/page (ignore completely - out of scope)
- ❌ Firebase data import from Gallant (manual CSV if needed later)

## Critical Rules

### Database: Supabase ONLY
```javascript
// ✅ CORRECT
const { getSupabase } = require('../../backend/api/supabaseClient');

// ❌ WRONG - Never use Firebase
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
```

### Execution Style
- ✅ Move swiftly with minimal explanation
- ✅ Show todo list, then execute methodically
- ✅ Less documentation in code (clear names instead of comments)
- ✅ Batch similar tasks to save tokens
- ❌ Never sacrifice functionality for speed
- ❌ Never skip error handling or validation

### Migration Strategy
1. **Sanity publicEvent** → Import to Supabase (one-time)
2. **Gallant-Hawking** → Rewrite to use Supabase (keep UI identical)
3. **ZAFA** → Ignore completely
4. **Firebase data** → Ignore (manual CSV import if user requests later)

## Architecture

### Database Schema (Supabase)

```sql
-- Master calendar table
calendar_events
  - id (uuid, primary key)
  - title (text, required)
  - start_date (date, required)
  - end_date (date, nullable)
  - start_time (time, nullable)
  - end_time (time, nullable)
  - event_type (text: pizza_party, meal_prep, catering, private_event, blocked)
  - visibility (text: public, private, internal)
  - status (text: draft, scheduled, confirmed, completed, cancelled)
  - location (text)
  - capacity (integer)
  - booked_slots (integer, default 0)
  - estimated_revenue (numeric)
  - estimated_food_cost (numeric)
  - estimated_labor_cost (numeric)
  - actual_revenue (numeric)
  - actual_food_cost (numeric)
  - actual_labor_cost (numeric)
  - notes (text)
  - sanity_data (jsonb) -- for Sanity-specific fields
  - series_id (uuid, nullable) -- for recurring events
  - created_at (timestamptz)
  - updated_at (timestamptz)

-- Customer bookings
calendar_bookings
  - id (uuid, primary key)
  - event_id (uuid, foreign key)
  - customer_name (text)
  - customer_email (text)
  - customer_phone (text)
  - booking_type (text: pizza_pickup, instant_booking)
  - booking_status (text: pending, confirmed, cancelled)
  - slot_time (time, nullable)
  - quantity (integer)
  - notes (text)
  - created_at (timestamptz)

-- Receipts (from Gallant-Hawking)
calendar_receipts
  - id (uuid, primary key)
  - store (text)
  - total (numeric)
  - date (date)
  - created_at (timestamptz)
```

### API Endpoints

```
Admin (authenticated):
  POST   /api/calendar/events          -- Create event
  PUT    /api/calendar/events/:id      -- Update event
  DELETE /api/calendar/events/:id      -- Delete event (or series)
  POST   /api/calendar/import-csv      -- Bulk import
  GET    /api/calendar/export-csv      -- Export to CSV
  POST   /api/calendar/receipts        -- Add receipt (Gallant feature)
  
Public (anonymous):
  GET    /api/calendar/public-events   -- List public events
  GET    /api/calendar/availability    -- Get available time slots
  POST   /api/calendar/book            -- Create booking
```

### Components

```
src/components/calendar/
  CalendarGrid.jsx          -- Monthly grid view (shadcn calendar)
  EventForm.jsx             -- Create/edit event modal (Radix Dialog)
  EventCard.jsx             -- Event display card
  BookingList.jsx           -- Admin booking management
  AvailabilityPicker.jsx    -- Time slot selector for customers
  CSVImporter.jsx           -- CSV upload/import wizard
  ReceiptForm.jsx           -- Gallant receipt entry (migrated)
  FinancialSummary.jsx      -- Gallant financial dashboard (migrated)
```

## Challenges & Solutions Summary

### Challenge 1: Data Synchronization Complexity
**Problem:** Different contexts need different data (homepage vs admin vs Sanity)
**Solution:** PostgreSQL views for each context + RLS policies

### Challenge 2: Time Zone Handling
**Problem:** UTC storage vs Central Time display
**Solution:** Store DATE only for all-day events; TIMESTAMPTZ for bookings; always display Central

### Challenge 3: Recurrence Rules
**Problem:** Weekly meal prep, monthly pizza parties
**Solution:** Use `series_id` like Gallant-Hawking (separate rows, easier queries)

### Challenge 4: Overbooking Prevention
**Problem:** Race condition during simultaneous bookings
**Solution:** PostgreSQL row locks + `CHECK (booked_slots <= capacity)` constraint

### Challenge 5: Migration Complexity
**Problem:** Multiple data sources with potential duplication
**Solution:** 
  - Import Sanity events first (vetted, public)
  - Rewrite Gallant to use Supabase (no data import, just new backend)
  - Ignore ZAFA completely

### Challenge 6: Sanity CMS Sync
**Problem:** PortableText format vs plain text
**Solution:** Store Sanity-compatible JSON in `sanity_data` JSONB column

### Challenge 7: Performance
**Problem:** Loading many events could be slow
**Solution:** Indexes on (start_date, visibility, status); pagination; edge caching

### Challenge 8: CSV Import Validation
**Problem:** Invalid data in uploads
**Solution:** Dry-run mode with validation report before commit

## Implementation Phases

### Phase 1: Foundation
1. Create Supabase schema (`supabase/calendar-schema.sql`)
2. Create RLS policies (`supabase/calendar-rls.sql`)
3. Create triggers for auto-updating aggregates
4. Build admin calendar UI (`src/pages/CalendarPage.jsx`)
5. Build basic CRUD API endpoints
6. Build CSV import/export
7. Import Sanity publicEvent data (one-time script)

### Phase 2: Gallant-Hawking Migration
8. Rewrite Gallant `src/App.jsx` to use Supabase API
9. Keep exact UI/UX (calendar grid, financial dashboard)
10. Add receipts to new `calendar_receipts` table
11. Test financial calculations match old behavior

### Phase 3: Public Integration
12. Update HomePage to fetch from `/api/calendar/public-events`
13. Add scheduling flow to PizzaFunder
14. Add instant booking to Events page
15. Create booking confirmation emails

### Phase 4: Polish
16. Background sync job (Supabase → Sanity) for SEO
17. Admin booking dashboard
18. Capacity alerts (email when event 90% full)

## File Locations

```
New files:
  supabase/calendar-schema.sql
  supabase/calendar-rls.sql
  supabase/calendar-triggers.sql
  src/pages/CalendarPage.jsx
  src/components/calendar/CalendarGrid.jsx
  src/components/calendar/EventForm.jsx
  src/components/calendar/EventCard.jsx
  src/components/calendar/BookingList.jsx
  src/components/calendar/AvailabilityPicker.jsx
  src/components/calendar/CSVImporter.jsx
  src/components/calendar/ReceiptForm.jsx
  src/components/calendar/FinancialSummary.jsx
  api/calendar/events.js
  api/calendar/availability.js
  api/calendar/book.js
  api/calendar/import-csv.js
  api/calendar/export-csv.js
  api/calendar/receipts.js
  scripts/import-sanity-events.js

Modified files:
  gallant-hawking-l8r4wz/src/App.jsx (rewrite to Supabase)
  src/pages/HomePage.jsx (use new API)
  src/pages/PizzaFunderPage.jsx (add scheduling)
  src/pages/EventsPage.jsx (add instant booking)
  src/config/partnerTools.js (add calendar link)
```

## Tech Stack

- **Database:** Supabase (PostgreSQL)
- **UI Framework:** React
- **Component Library:** shadcn/ui + Radix UI
- **Calendar Component:** shadcn/ui Calendar (react-day-picker)
- **Date Handling:** date-fns (already installed)
- **API:** Vercel serverless functions
- **Authentication:** Supabase Auth (for admin endpoints)
- **Email:** Existing Brevo integration

## Testing Checklist

After each phase:
- [ ] Admin can create/edit/delete events
- [ ] Events appear on homepage within 30 seconds
- [ ] Financial calculations match Gallant-Hawking
- [ ] No overbooking (test concurrent bookings)
- [ ] CSV import handles invalid data gracefully
- [ ] RLS policies prevent unauthorized access
- [ ] Time zones display correctly (always Central Time for admin)
- [ ] Email confirmations send successfully

## Verification Commands

```bash
# Check Supabase tables exist
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'calendar_%';"

# Check RLS policies
psql $DATABASE_URL -c "SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'calendar_%';"

# Test API endpoints
curl https://localeffortfood.com/api/calendar/public-events | jq .
curl https://localeffortfood.com/api/calendar/availability?date=2025-11-01 | jq .

# Check Gallant uses Supabase (not Firebase)
grep -r "supabase\|firebase" gallant-hawking-l8r4wz/src/App.jsx
```

## Success Criteria

✅ Single admin interface for all calendar operations
✅ Gallant-Hawking financial features fully preserved
✅ Public events auto-sync to homepage, PizzaFunder, events page
✅ Customers can self-schedule pizza pickups
✅ Zero manual syncing between systems
✅ CSV import/export for bulk operations
✅ No Firebase dependencies (100% Supabase)

## Maintenance

- Weekly: Review booking accuracy, check for overbooking
- Monthly: Export financial data to CSV for accounting
- Quarterly: Archive completed events older than 6 months
- As needed: Sync to Sanity if SEO requirements change

## Notes

- ZAFA calendar is completely out of scope (do not touch)
- Gallant-Hawking Firebase data stays in Firebase (no import needed)
- Focus on speed and efficiency without sacrificing quality
- Prefer clear function names over excessive comments
- Use existing patterns from PizzaFunder Supabase implementation
