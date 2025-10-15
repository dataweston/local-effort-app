# PizzaFunder API - Supabase Migration

**⚠️ IMPORTANT: This endpoint uses SUPABASE, not Firebase**

## Current Implementation

This file (`api/pizzafunder/status.js`) connects to **Supabase PostgreSQL**, NOT Firebase Firestore.

### Dependencies
```javascript
const { getSupabase } = require('../../backend/api/supabaseClient');
```

### Database Table
- **Table:** `public.crowdfund_aggregates`
- **Row:** Single row with `id='crowdfunding'`
- **Columns:** `pizzas`, `backers`, `goal`, `last_updated`

### RLS Policies Required
```sql
-- Must allow anonymous SELECT
create policy "Public can view aggregates"
  on public.crowdfund_aggregates
  for select
  to anon, authenticated
  using (true);
```

## Migration Status
- ✅ Migrated from Firebase: October 15, 2025
- ✅ Schema deployed: `supabase/pizzafunder-schema.sql`
- ✅ Production tested and working

## DO NOT REVERT
See `docs/DO-NOT-REVERT-TO-FIREBASE.md` for details.

User has deployed Supabase schema and this is the active production implementation.
