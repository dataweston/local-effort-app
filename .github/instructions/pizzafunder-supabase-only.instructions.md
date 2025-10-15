# PizzaFunder - Supabase Only (No Firebase)

## Applies To
- `api/pizzafunder/**/*.js`
- `/pizzafunder` page functionality
- All crowdfunding pledge/feedback operations

## Critical Rule: DO NOT REVERT TO FIREBASE

### Status
- ✅ **MIGRATED TO SUPABASE:** October 15, 2025
- ✅ **PRODUCTION ACTIVE:** Supabase PostgreSQL
- ❌ **DO NOT USE:** Firebase Firestore

### Active Implementation
All `/api/pizzafunder/*` endpoints use Supabase:

```javascript
// ✅ CORRECT - Current implementation
const { getSupabase } = require('../../backend/api/supabaseClient');

// ❌ WRONG - Do not change to this
const { getFirebaseAdmin } = require('../_lib/firebaseAdmin');
```

### Files That Must Use Supabase
1. `api/pizzafunder/status.js` - Supabase ONLY
2. `api/pizzafunder/pledge.js` - Supabase ONLY
3. `api/pizzafunder/feedback.js` - Supabase ONLY

### Database Tables (Supabase)
- `public.crowdfund_pledges` - Pizza pledges/orders
- `public.crowdfund_feedback` - User feedback
- `public.crowdfund_aggregates` - Campaign totals (auto-updated by trigger)

## When Making Changes

### ✅ Allowed Changes
- Bug fixes using Supabase client
- Feature additions using Supabase
- Performance optimizations using Supabase
- RLS policy adjustments in Supabase
- Schema updates in `supabase/pizzafunder-schema.sql`

### ❌ Forbidden Changes (Unless Explicitly Requested)
- Reverting to Firebase/Firestore
- Copying `*-firebase-backup.js` files over active files
- Changing `getSupabase()` to `getFirebaseAdmin()`
- Removing Supabase imports
- Adding Firebase imports

## Troubleshooting Guidelines

### If User Reports 500 Errors

**Step 1:** Check Supabase tables exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'crowdfund_%';
```

**Step 2:** Check RLS policies allow anonymous access
```sql
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename LIKE 'crowdfund_%';
```

**Step 3:** Run fix script
```bash
# In Supabase Dashboard SQL Editor
cat supabase/fix-rls-policies.sql
```

**Step 4:** Verify grants
```sql
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
AND table_name LIKE 'crowdfund_%';
```

**❌ DO NOT:** Suggest reverting to Firebase as a fix

### If User Reports Permission Errors

**Likely Cause:** RLS policies too restrictive

**Solution:**
1. Check if anonymous role has INSERT grant
2. Verify RLS policies allow `anon` user
3. Run `supabase/fix-rls-policies.sql`

**❌ DO NOT:** Revert to Firebase

### If User Reports Data Not Saving

**Likely Cause:** Missing RLS policy or trigger not working

**Solution:**
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_aggregates'`
2. Check RLS policies allow INSERT
3. Test with service role to rule out RLS
4. Check Supabase logs for errors

**❌ DO NOT:** Revert to Firebase

## Exception: User Explicitly Requests Firebase

**Only proceed if user says:**
- "Revert pizzafunder to Firebase"
- "Use Firebase instead of Supabase for pizzafunder"
- "Go back to Firebase for pledges"

**Confirmation Required:**
1. Ask: "You want to revert from Supabase back to Firebase for /pizzafunder?"
2. Explain consequences:
   - Loss of database triggers (manual aggregate updates needed)
   - Potential 500 errors (previous issue)
   - Loss of RLS security
   - Manual transaction handling required
3. Only proceed if they confirm understanding

## Documentation References
- Main warning: `docs/DO-NOT-REVERT-TO-FIREBASE.md`
- Migration guide: `docs/pizzafunder-supabase-migration.md`
- Schema file: `supabase/pizzafunder-schema.sql`
- Fix script: `supabase/fix-rls-policies.sql`
- Status file: `.ai-context/pizzafunder-migration-status.json`

## Verification Commands

### Check Current Implementation
```bash
# Should show Supabase, not Firebase
grep "require.*supabaseClient\|require.*firebaseAdmin" api/pizzafunder/*.js
```

Expected output (Supabase):
```
api/pizzafunder/status.js:const { getSupabase } = require('../../backend/api/supabaseClient');
api/pizzafunder/pledge.js:const { getSupabase } = require('../../backend/api/supabaseClient');
api/pizzafunder/feedback.js:const { getSupabase } = require('../../backend/api/supabaseClient');
```

### Test API Response
```bash
curl https://www.localeffortfood.com/api/pizzafunder/status | jq .source
```

Expected: `"supabase"`  
If returns `"firestore"`: **ALERT - Something reverted it!**

## Summary

- ✅ Use Supabase for all pizzafunder operations
- ❌ Do not revert to Firebase without explicit user request
- 📋 All troubleshooting should assume Supabase implementation
- 🔒 Backup files are reference only, not for production use
- ⚠️ Check this file before making any pizzafunder API changes
