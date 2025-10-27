# Calendar System Migration Setup

## Quick Start

To set up the calendar system, you need to apply the migration to your Supabase database.

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd /path/to/local-effort-app

# Link to your Supabase project (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
npx supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to: SQL Editor
3. Open the file: `supabase/migrations/20241027_calendar_system.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute

### Option 3: Using psql

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/20241027_calendar_system.sql
```

## What This Migration Creates

### Tables
- `calendar_events` - Master event storage (public/private events)
- `calendar_time_slots` - Bookable time slots for services
- `calendar_bookings` - Customer booking records
- `calendar_receipts` - Financial tracking for events

### Views
- `calendar_events_public` - Public-facing view of upcoming events
- `calendar_time_slots_available` - Available slots with calculated capacity

### Functions
- `check_scheduling_conflicts()` - Detects scheduling conflicts with buffer zones
- `update_booking_counts()` - Automatically updates booked counts when bookings change
- `update_updated_at_column()` - Maintains updated_at timestamps

### Features
- Row Level Security (RLS) policies for public access
- Automatic booking count management
- Conflict detection with configurable buffer zones
- Support for recurring events
- Financial tracking per event
- Integration with Sanity CMS

## Verification

After applying the migration, verify it worked:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'calendar_%';

-- Should return:
-- calendar_events
-- calendar_time_slots
-- calendar_bookings
-- calendar_receipts
-- calendar_invitations (already existed)

-- Check views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'calendar_%';

-- Should return:
-- calendar_events_public
-- calendar_time_slots_available

-- Check the conflict detection function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'check_scheduling_conflicts';
```

## Next Steps

After migration is applied:

1. **Test the API endpoints**: Visit `/api/calendar/events` to verify
2. **Sync Sanity events**: POST to `/api/calendar/sync-sanity` to import existing events
3. **Create time slots**: Use the TimeSlotManager component at `/calendar` (Time Slots tab)
4. **Test booking flow**: Create an invitation and test the full customer journey

## Troubleshooting

### Migration fails with "already exists" errors
The tables might already exist from a previous attempt. You can either:
- Drop the existing tables first (⚠️ this will delete data!)
- Modify the migration to use `CREATE TABLE IF NOT EXISTS` (already done)

### Permission errors
Make sure you're using the service role key or database password, not the anon key.

### Function errors
If the `check_scheduling_conflicts` function fails, check that:
- The `calendar_events` and `calendar_time_slots` tables exist first
- You're using a recent version of PostgreSQL (14+)

## Rolling Back

If you need to undo this migration:

```sql
-- Drop in reverse order (to handle foreign keys)
DROP VIEW IF EXISTS calendar_time_slots_available CASCADE;
DROP VIEW IF EXISTS calendar_events_public CASCADE;
DROP TABLE IF EXISTS calendar_receipts CASCADE;
DROP TABLE IF EXISTS calendar_bookings CASCADE;
DROP TABLE IF EXISTS calendar_time_slots CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP FUNCTION IF EXISTS check_scheduling_conflicts CASCADE;
DROP FUNCTION IF EXISTS update_booking_counts CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

⚠️ **Warning**: This will delete all calendar data!
