# Firebase to Supabase Migration Summary

## Overview
Successfully transitioned event request and waitlist forms from Firebase to Supabase, and updated the "Ask a Chef" button to show a modal form instead of opening an email client.

## Changes Made

### 1. Ask a Chef Form Component
**Created:** [src/components/forms/AskChefForm.jsx](src/components/forms/AskChefForm.jsx)
- Built using shadcn UI components (Dialog, Input, Textarea, Button, Label)
- Includes fields: name, email, phone number, subject, message
- Shows thank you confirmation after successful submission
- Submits to `/api/messages/submit` endpoint with type `ask-chef`

### 2. Footer Update
**Modified:** [src/components/layout/Footer.jsx](src/components/layout/Footer.jsx)
- Changed "Ask a Chef" from email link to button that opens modal
- Integrated AskChefForm component
- Uses React state to manage modal visibility

### 3. Supabase Database Schema
**Created:** [supabase-tables.sql](supabase-tables.sql)
- `event_requests` table: Stores event booking requests from /services page
- `meal_prep_waitlist` table: Stores waitlist signups from /mealprep page
- Includes Row Level Security (RLS) policies
- Automatic `updated_at` triggers
- Indexes for performance optimization

#### To Apply Schema:
Run the SQL file in your Supabase SQL editor or via CLI:
```bash
psql <your-supabase-connection-string> < supabase-tables.sql
```

### 4. Backend API Updates
**Modified:** [backend/api/routes/messages.js](backend/api/routes/messages.js)
- Updated `createMessagesRouter` to accept `getSupabase` parameter
- **Event Requests** (`/api/events/request`):
  - Now stores in Supabase `event_requests` table (primary)
  - Falls back to Firebase if Supabase unavailable
  - Includes duplicate detection using dedupe_key
- **Waitlist Submissions** (`/api/messages/submit` with type `meal-prep-waitlist`):
  - Automatically stores in Supabase `meal_prep_waitlist` table
  - Continues to send emails via Brevo
  - Continues to log in Sanity for tracking

**Modified:** [backend/api/index.js](backend/api/index.js)
- Imported `getSupabase` from supabaseClient
- Passed `getSupabase` to `createMessagesRouter`

### 5. Existing Forms (No Changes Required)
**Services Page:** [src/pages/ServicesPage.jsx](src/pages/ServicesPage.jsx:75)
- Event request form already uses `/api/events/request` endpoint
- No frontend changes needed - backend now uses Supabase

**Meal Prep Page:** [src/pages/MealPrepPage.jsx](src/pages/MealPrepPage.jsx:188)
- Waitlist form already uses `/api/messages/submit` endpoint
- No frontend changes needed - backend now uses Supabase

## Migration Strategy

The implementation uses a **gradual migration** approach:
1. **Primary Storage:** Supabase (new submissions go here)
2. **Fallback:** Firebase (if Supabase unavailable)
3. **Continuity:** Email notifications and Sanity logging continue unchanged

This ensures:
- No disruption to existing functionality
- Data redundancy during transition
- Ability to roll back if needed

## Environment Variables Required

Ensure these environment variables are set in your `.env` files:

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env)
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
# Or fall back to anon key if service role not available
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing Checklist

- [ ] Apply Supabase schema (run supabase-tables.sql)
- [ ] Set environment variables for Supabase
- [ ] Test "Ask a Chef" button in footer opens modal
- [ ] Test "Ask a Chef" form submission
- [ ] Test event request form on /services page
- [ ] Test waitlist form on /mealprep page
- [ ] Verify data appears in Supabase tables
- [ ] Verify emails still send via Brevo
- [ ] Check for console errors related to Firebase config

## Firebase Deprecation

The Firebase configuration warnings should now be resolved as:
1. Event requests use Supabase for primary storage
2. Waitlist submissions use Supabase for primary storage
3. Both fall back to Firebase if needed (graceful degradation)

You can eventually remove Firebase entirely once you're confident Supabase is working correctly.

## Next Steps

1. **Run the SQL schema** to create tables in Supabase
2. **Set environment variables** for Supabase in both frontend and backend
3. **Test all forms** to ensure they work correctly
4. **Monitor Supabase dashboard** to verify data is being stored
5. **Consider migrating existing Firebase data** to Supabase (optional)
6. **Remove Firebase configuration** once fully migrated (optional)

## Files Changed

- ✅ [src/components/forms/AskChefForm.jsx](src/components/forms/AskChefForm.jsx) (NEW)
- ✅ [src/components/layout/Footer.jsx](src/components/layout/Footer.jsx)
- ✅ [supabase-tables.sql](supabase-tables.sql) (NEW)
- ✅ [backend/api/routes/messages.js](backend/api/routes/messages.js)
- ✅ [backend/api/index.js](backend/api/index.js)

## Support

If you encounter any issues:
1. Check browser console for errors
2. Check backend logs for Supabase connection issues
3. Verify environment variables are set correctly
4. Check Supabase dashboard for table creation and data
