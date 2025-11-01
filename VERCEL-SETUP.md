# Vercel Environment Variables Setup

## Issue
Calendar authentication is showing "Supabase not configured" error because environment variables are not set in Vercel.

## Required Environment Variables for Vercel

The following environment variables must be set in the Vercel dashboard for the calendar authentication to work:

### Client-Side Variables (exposed to browser via Vite)

```bash
VITE_SUPABASE_URL=https://qupwpcsbaidpykghqzxt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cHdwY3NiYWlkcHlrZ2hxenh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyODcsImV4cCI6MjA2OTY1NjI4N30.YDkEG3TqBEKU8xPBZ8_RsIr68S6u-zAJ0GRNEqJt_Io
```

### Server-Side Variables (for API endpoints)

```bash
SUPABASE_URL=https://qupwpcsbaidpykghqzxt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cHdwY3NiYWlkcHlrZ2hxenh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODAyODcsImV4cCI6MjA2OTY1NjI4N30.YDkEG3TqBEKU8xPBZ8_RsIr68S6u-zAJ0GRNEqJt_Io
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cHdwY3NiYWlkcHlrZ2hxenh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4MDI4NywiZXhwIjoyMDY5NjU2Mjg3fQ.P0R33v8zss3c69tEq-3v4XIPJwx9HQGCCQzD_8vtTek
```

## How to Set Environment Variables in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project: **local-effort-app**
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: Variable name (e.g., `VITE_SUPABASE_URL`)
   - **Value**: Variable value
   - **Environments**: Select **Production**, **Preview**, and **Development**
5. Click **Save**
6. **Important**: After adding all variables, redeploy the application

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Set client-side variables
vercel env add VITE_SUPABASE_URL production
# Paste: https://qupwpcsbaidpykghqzxt.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste the anon key

# Set server-side variables
vercel env add SUPABASE_URL production
# Paste: https://qupwpcsbaidpykghqzxt.supabase.co

vercel env add SUPABASE_ANON_KEY production
# Paste the anon key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste the service role key

# Repeat for preview and development environments as needed
```

### Option 3: Bulk Import via vercel.json (Not Recommended for Secrets)

You can add a `.env.production` file locally and then import it, but this is not recommended for sensitive keys.

## Verification

After setting the environment variables:

1. **Trigger a new deployment**:
   ```bash
   git commit --allow-empty -m "Trigger Vercel rebuild"
   git push origin main
   ```

2. **Check deployment logs** in Vercel dashboard to ensure variables are being read

3. **Visit `/calendar` page** on your production site

4. **Check browser console**:
   - Should NOT see "Supabase not configured" error
   - Should see the CalendarAuthBanner with "Sign in with Google" button

5. **Test sign-in**:
   - Click "Sign in with Google"
   - Should redirect to Google OAuth
   - Should redirect back to calendar with authenticated session

## Troubleshooting

### Error: "Supabase not configured" still appears

**Cause**: Environment variables not properly set or build didn't pick them up

**Solutions**:
1. Double-check variable names (they're case-sensitive)
2. Ensure `VITE_` prefix is used for client-side variables
3. Redeploy the application after setting variables
4. Check Vercel deployment logs for build errors

### Error: "Invalid API key"

**Cause**: Wrong Supabase keys or URL

**Solutions**:
1. Verify keys are copied correctly from Supabase dashboard
2. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API
3. Copy the keys exactly (no extra spaces or quotes)

### Sign-in redirects but doesn't authenticate

**Cause**: Supabase OAuth not configured for your domain

**Solutions**:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your production URL to "Site URL": `https://localeffortfood.com`
3. Add redirect URLs: `https://localeffortfood.com/calendar`

## Environment Variable Reference

| Variable | Type | Purpose | Required For |
|----------|------|---------|--------------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL | Browser authentication |
| `VITE_SUPABASE_ANON_KEY` | Client | Public anon key | Browser authentication |
| `SUPABASE_URL` | Server | Supabase project URL | API endpoints |
| `SUPABASE_ANON_KEY` | Server | Public anon key | API endpoints |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Admin key (secret!) | Server-side admin operations |

## Security Notes

- ✅ `VITE_*` variables are **exposed to the browser** (safe for public keys only)
- ⚠️ Never put `SERVICE_ROLE_KEY` in a `VITE_*` variable
- ✅ Service role key should only be in server-side variables
- ✅ All keys shown above are safe to expose (anon key is designed to be public)

## Next Steps After Setup

1. Deploy the changes
2. Test authentication on production
3. Complete manual testing checklist from `CALENDAR-AUTH-IMPLEMENTATION.md`
4. Monitor Vercel logs for any auth-related errors
