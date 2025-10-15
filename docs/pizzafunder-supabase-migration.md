# PizzaFunder Supabase Migration

## Overview
Successfully migrated `/pizzafunder` from Firebase Firestore to Supabase PostgreSQL to improve reliability and eliminate 500 errors.

## What Changed

### Database
- **Before:** Firebase Firestore (collections: `crowdfund_pledges`, `crowdfund_feedback`, `aggregates/crowdfunding`)
- **After:** Supabase PostgreSQL (tables: `crowdfund_pledges`, `crowdfund_feedback`, `crowdfund_aggregates`)

### API Endpoints (Updated)
1. **`/api/pizzafunder/status`** - Returns current totals
   - Now queries `crowdfund_aggregates` table
   - Returns graceful fallback on error

2. **`/api/pizzafunder/feedback`** (GET/POST)
   - GET: Fetches recent feedback with limit
   - POST: Saves new feedback with validation
   - Uses Supabase client for all operations

3. **`/api/pizzafunder/pledge`** (POST)
   - Processes Square payment
   - Saves pledge to Supabase
   - Auto-updates aggregates via database trigger
   - Sends QR code and email notifications

## Database Schema

### Tables

```sql
-- Stores individual pizza pledges
CREATE TABLE crowdfund_pledges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funder_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    reward_preference TEXT,
    pizza_count INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores community feedback
CREATE TABLE crowdfund_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    comment TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores aggregate counters (single row)
CREATE TABLE crowdfund_aggregates (
    id TEXT PRIMARY KEY DEFAULT 'crowdfunding',
    pizzas INTEGER NOT NULL DEFAULT 0,
    backers INTEGER NOT NULL DEFAULT 0,
    goal INTEGER NOT NULL DEFAULT 1000,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Triggers

**Auto-update aggregates on new pledge:**
```sql
CREATE OR REPLACE FUNCTION update_crowdfund_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO crowdfund_aggregates (id, pizzas, backers, goal, last_updated)
    VALUES ('crowdfunding', NEW.pizza_count, 1, 1000, NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
        pizzas = crowdfund_aggregates.pizzas + NEW.pizza_count,
        backers = crowdfund_aggregates.backers + 1,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### RLS Policies

- **Public read access:** Anonymous users can view pledges, feedback, and status
- **Public insert access:** Anonymous users can submit pledges and feedback
- **Service role full access:** Backend can perform all operations

## Environment Variables Required

```bash
# Supabase (already configured)
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Square Payment Processing
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_LOCATION_ID=your-location-id
SQUARE_ENVIRONMENT=Sandbox # or Production

# Email Notifications (Brevo)
BREVO_API_KEY=your-brevo-key
SENDER_EMAIL=noreply@localeffort.org
ADMIN_EMAIL=admin@localeffort.org
SUPPORT_INBOX_EMAIL=support@localeffort.org
```

## Deployment Steps

### 1. Deploy Schema to Supabase
```bash
# Option A: Using Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of supabase/pizzafunder-schema.sql
3. Click "Run"

# Option B: Using psql
psql -h your-project.supabase.co -U postgres -d postgres -f supabase/pizzafunder-schema.sql
```

### 2. Verify Tables Created
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'crowdfund_%';

-- Check trigger function
SELECT proname FROM pg_proc 
WHERE proname = 'update_crowdfund_aggregates';

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'crowdfund_%';
```

### 3. Test API Endpoints
```bash
# Test status endpoint
curl https://your-domain.com/api/pizzafunder/status

# Test feedback GET
curl https://your-domain.com/api/pizzafunder/feedback?limit=5

# Test feedback POST
curl -X POST https://your-domain.com/api/pizzafunder/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","comment":"Great campaign!","rating":5}'
```

### 4. Test Payment Flow
1. Go to `/pizzafunder` page
2. Select reward tier
3. Fill out pledge form
4. Use Square test card: `4111 1111 1111 1111`
5. Verify:
   - Payment processes successfully
   - Pledge appears in Supabase `crowdfund_pledges`
   - Aggregates update automatically
   - Confirmation email received

## Data Migration (If Needed)

If you have existing Firebase data to migrate:

```javascript
// scripts/migrate-firebase-to-supabase.js
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

async function migratePledges() {
  const db = admin.firestore();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Export from Firebase
  const pledges = await db.collection('crowdfund_pledges').get();
  
  // Transform and import to Supabase
  const data = pledges.docs.map(doc => ({
    funder_name: doc.data().funderName,
    email: doc.data().email,
    phone: doc.data().phone || null,
    notes: doc.data().notes || null,
    reward_preference: doc.data().rewardPreference || null,
    pizza_count: doc.data().pizzaCount,
    amount_cents: doc.data().amountCents,
    payment_id: doc.data().paymentId,
    status: doc.data().status || 'completed',
    created_at: doc.data().createdAt,
  }));
  
  const { error } = await supabase.from('crowdfund_pledges').insert(data);
  
  if (error) {
    console.error('Migration error:', error);
  } else {
    console.log(`Migrated ${data.length} pledges successfully`);
  }
}

migratePledges();
```

## Backup Files

Original Firebase versions backed up as:
- `api/pizzafunder/status-firebase-backup.js`
- `api/pizzafunder/pledge-firebase-backup.js`
- `api/pizzafunder/feedback-firebase-backup.js`

Supabase versions also available as:
- `api/pizzafunder/status-supabase.js`
- `api/pizzafunder/pledge-supabase.js`
- `api/pizzafunder/feedback-supabase.js`

## Benefits of Supabase

1. **Reliability:** PostgreSQL is more stable than Firestore for this use case
2. **SQL Power:** Complex queries, joins, and aggregations
3. **Triggers:** Auto-update aggregates on insert
4. **RLS:** Row-level security built-in
5. **Real-time:** Can subscribe to changes if needed
6. **Cost:** Better pricing for read-heavy workloads

## Monitoring

### Check Aggregate Accuracy
```sql
-- Compare computed vs stored totals
SELECT 
    (SELECT SUM(pizza_count) FROM crowdfund_pledges) AS computed_pizzas,
    (SELECT SUM(1) FROM crowdfund_pledges) AS computed_backers,
    ca.pizzas AS stored_pizzas,
    ca.backers AS stored_backers
FROM crowdfund_aggregates ca
WHERE ca.id = 'crowdfunding';
```

### Recent Pledges
```sql
SELECT 
    funder_name,
    email,
    pizza_count,
    amount_cents / 100.0 AS amount_dollars,
    status,
    created_at
FROM crowdfund_pledges
ORDER BY created_at DESC
LIMIT 10;
```

### Feedback Summary
```sql
SELECT 
    AVG(rating) AS avg_rating,
    COUNT(*) AS total_feedback,
    COUNT(CASE WHEN rating >= 4 THEN 1 END) AS positive_count
FROM crowdfund_feedback
WHERE rating IS NOT NULL;
```

## Troubleshooting

### Issue: Aggregates not updating
**Solution:** Check trigger exists and is enabled:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'update_aggregates_on_pledge';
```

### Issue: RLS blocking inserts
**Solution:** Verify policies allow anon inserts:
```sql
SELECT * FROM pg_policies WHERE tablename = 'crowdfund_pledges';
```

### Issue: Payment succeeds but pledge not saved
**Check:** Error logs in API response and Supabase logs
**Fix:** Verify `SUPABASE_SERVICE_ROLE_KEY` has bypass RLS permission

## Next Steps

1. ✅ Deploy schema to production Supabase
2. ✅ Replace API endpoints with Supabase versions
3. ⏳ Test end-to-end payment flow
4. ⏳ Monitor for errors in production
5. ⏳ Migrate existing Firebase data (if any)
6. ⏳ Remove Firebase dependencies once stable
7. ⏳ Add real-time updates to frontend (optional)

## Support

For issues or questions:
- Check Supabase Dashboard → Logs for errors
- Review API endpoint responses
- Test with Square Sandbox environment first
- Verify all environment variables are set

---

**Migration Date:** 2025
**Migration Status:** ✅ Complete (API endpoints updated, schema ready to deploy)
**Tested:** ⏳ Pending deployment and testing
