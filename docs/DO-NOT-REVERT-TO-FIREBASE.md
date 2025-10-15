# ⚠️ CRITICAL: DO NOT REVERT TO FIREBASE

## Status: MIGRATED TO SUPABASE ✅

**Date Migrated:** October 15, 2025  
**Migration Status:** COMPLETE AND ACTIVE

---

## ❌ DO NOT DO THIS

**NEVER revert these files back to Firebase versions without explicit user request:**

- ❌ `api/pizzafunder/status.js` - Uses Supabase, NOT Firebase
- ❌ `api/pizzafunder/pledge.js` - Uses Supabase, NOT Firebase  
- ❌ `api/pizzafunder/feedback.js` - Uses Supabase, NOT Firebase

---

## ✅ CURRENT STATE (CORRECT)

### Active API Endpoints (Supabase)
```javascript
// api/pizzafunder/status.js
const { getSupabase } = require('../../backend/api/supabaseClient');
// Uses: crowdfund_aggregates table

// api/pizzafunder/pledge.js
const { getSupabase } = require('../../backend/api/supabaseClient');
// Uses: crowdfund_pledges table + trigger

// api/pizzafunder/feedback.js
const { getSupabase } = require('../../backend/api/supabaseClient');
// Uses: crowdfund_feedback table
```

### Supabase Database
- ✅ Schema deployed: `supabase/pizzafunder-schema.sql`
- ✅ Tables created: `crowdfund_pledges`, `crowdfund_feedback`, `crowdfund_aggregates`
- ✅ Triggers working: Auto-update aggregates on pledge insert
- ✅ RLS policies configured: Allow anonymous INSERT and SELECT
- ✅ Production tested and working

---

## 🔒 WHY SUPABASE (NOT FIREBASE)

1. **Reliability:** Firebase was causing 500 errors and instability
2. **Performance:** PostgreSQL better suited for this workload
3. **Features:** Database triggers for auto-aggregation
4. **Security:** Row-level security with proper anonymous access
5. **Cost:** Better pricing for read-heavy operations
6. **User Decision:** User explicitly requested and deployed Supabase migration

---

## 📁 Backup Files (Reference Only)

These files exist ONLY as backups/reference. **DO NOT copy them back:**

```
api/pizzafunder/status-firebase-backup.js    ← OLD (do not use)
api/pizzafunder/pledge-firebase-backup.js    ← OLD (do not use)
api/pizzafunder/feedback-firebase-backup.js  ← OLD (do not use)
```

---

## 🚨 IF YOU SEE ERRORS

### Common Issues and Solutions

**Issue:** 500 errors on `/api/pizzafunder/status`  
**Cause:** Supabase tables might not exist or RLS policies too restrictive  
**Solution:** Run `supabase/fix-rls-policies.sql` in Supabase Dashboard  
**❌ DO NOT:** Revert to Firebase

**Issue:** "Permission denied" or "RLS policy violation"  
**Cause:** RLS policies need adjustment  
**Solution:** Check/update policies in Supabase Dashboard  
**❌ DO NOT:** Revert to Firebase

**Issue:** Pledges not saving  
**Cause:** Missing INSERT policy or grant  
**Solution:** Run fix script or check grants  
**❌ DO NOT:** Revert to Firebase

---

## ✅ HOW TO VERIFY SUPABASE IS WORKING

### 1. Check API Imports
```bash
# Should show Supabase imports, NOT Firebase
grep -n "getSupabase\|getFirebaseAdmin" api/pizzafunder/*.js
```

Expected output:
```
status.js:7:const { getSupabase } = require('../../backend/api/supabaseClient');
pledge.js:7:const { getSupabase } = require('../../backend/api/supabaseClient');
feedback.js:7:const { getSupabase } = require('../../backend/api/supabaseClient');
```

### 2. Test Status Endpoint
```bash
curl https://www.localeffortfood.com/api/pizzafunder/status
```

Should return:
```json
{
  "pizzas": 0,
  "backers": 0,
  "goal": 1000,
  "source": "supabase"
}
```

If `"source": "supabase"` ✅ Correct  
If `"source": "firestore"` ❌ Something reverted it (fix immediately)

### 3. Check Supabase Tables
In Supabase Dashboard → Table Editor:
- ✅ `crowdfund_pledges` exists
- ✅ `crowdfund_feedback` exists
- ✅ `crowdfund_aggregates` exists

---

## 🔄 IF REVERT IS ABSOLUTELY NECESSARY

**Only if user explicitly requests:**

1. User must say: "Revert pizzafunder to Firebase"
2. Confirm they understand:
   - Loss of Supabase benefits
   - Potential 500 errors
   - No auto-aggregation
3. Copy Firebase backups:
   ```bash
   cp api/pizzafunder/status-firebase-backup.js api/pizzafunder/status.js
   cp api/pizzafunder/pledge-firebase-backup.js api/pizzafunder/pledge.js
   cp api/pizzafunder/feedback-firebase-backup.js api/pizzafunder/feedback.js
   ```
4. Document reason in git commit

**Without explicit user request: DO NOT REVERT**

---

## 📚 Documentation

- **Migration Guide:** `docs/pizzafunder-supabase-migration.md`
- **Schema File:** `supabase/pizzafunder-schema.sql`
- **Fix Script:** `supabase/fix-rls-policies.sql`
- **This File:** `docs/DO-NOT-REVERT-TO-FIREBASE.md`

---

## 🤖 Instructions for AI Agents

**When troubleshooting /pizzafunder issues:**

1. ✅ Check Supabase tables exist
2. ✅ Check RLS policies allow anonymous access
3. ✅ Verify environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
4. ✅ Run fix-rls-policies.sql if needed
5. ✅ Test with curl/Postman
6. ❌ **DO NOT suggest reverting to Firebase**
7. ❌ **DO NOT copy Firebase backup files**

**If user reports 500 errors:**
- First, check if Supabase tables exist
- Second, check RLS policies
- Third, verify grants
- Last resort, ask user if they want to consider Firebase (but don't assume)

**Default assumption:** User wants to keep Supabase unless explicitly stated otherwise.

---

## ✅ Confirmation Checklist

Before making ANY changes to pizzafunder API files, verify:

- [ ] User explicitly requested this change
- [ ] Change maintains Supabase (not switching to Firebase)
- [ ] Change doesn't break RLS policies
- [ ] Change tested in development first
- [ ] User confirmed they deployed Supabase schema

---

**Last Updated:** October 15, 2025  
**Migration Status:** ✅ COMPLETE - SUPABASE ACTIVE  
**Revert Status:** ❌ DO NOT REVERT WITHOUT EXPLICIT USER REQUEST
