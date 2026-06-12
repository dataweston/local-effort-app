# Google OAuth Setup for Supabase Authentication

## Issue
```
You can't sign in to this app because it doesn't comply with Google's OAuth 2.0 policy.
Request details: redirect_uri=https://qupwpcsbaidpykghqzxt.supabase.co/auth/v1/callback
```

## Solution: Add Supabase Redirect URI to Google Cloud Console

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project (likely "local-effort" or similar)
3. Navigate to: **APIs & Services** → **Credentials**

### Step 2: Find Your OAuth 2.0 Client ID

1. Look for the OAuth 2.0 Client ID used for your application
2. Click on the client ID name to edit it

### Step 3: Add Supabase Redirect URI

1. Scroll to **Authorized redirect URIs**
2. Click **+ ADD URI**
3. Add this URI:
   ```
   https://qupwpcsbaidpykghqzxt.supabase.co/auth/v1/callback
   ```
4. Click **Save**

### Step 4: Verify Supabase OAuth Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **qupwpcsbaidpykghqzxt**
3. Navigate to: **Authentication** → **Providers**
4. Find **Google** provider
5. Ensure it's enabled and configured with:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### Step 5: Add Your Domain to Authorized Domains (if needed)

Back in Google Cloud Console OAuth settings:

1. Under **Authorized JavaScript origins**, add:
   ```
   https://localeffortfood.com
   https://qupwpcsbaidpykghqzxt.supabase.co
   ```

2. Under **Authorized redirect URIs**, ensure you have:
   ```
   https://qupwpcsbaidpykghqzxt.supabase.co/auth/v1/callback
   https://localeffortfood.com/calendar
   ```

### Step 6: Configure Site URL in Supabase

1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://localeffortfood.com`
3. Add to **Redirect URLs**:
   ```
   https://localeffortfood.com/calendar
   https://localeffortfood.com/*
   http://localhost:5173/calendar (for local development)
   ```

## Testing

1. After making changes in Google Cloud Console, wait 1-2 minutes for propagation
2. Clear browser cache or use incognito mode
3. Visit: `https://localeffortfood.com/calendar`
4. Click "Sign in with Google"
5. Should successfully redirect to Google OAuth and back

## Common Issues

### Issue: Still getting OAuth error after adding redirect URI

**Solution**: 
- Wait 5-10 minutes for Google's changes to propagate
- Clear browser cookies and cache
- Try in incognito/private browsing mode

### Issue: Wrong Client ID or Secret

**Solution**:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Copy the **Client ID** and **Client Secret**
3. Go to Supabase Dashboard → Authentication → Providers → Google
4. Update the credentials
5. Click Save

### Issue: OAuth consent screen not configured

**Solution**:
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Configure the consent screen with:
   - App name: "Local Effort"
   - User support email: dataweston@gmail.com
   - Authorized domains: localeffortfood.com
   - Developer contact: dataweston@gmail.com
3. Add scopes: email, profile, openid
4. Save

## Quick Checklist

- [ ] Added Supabase callback URL to Google Cloud Console
- [ ] Verified Google Client ID and Secret in Supabase
- [ ] Set Site URL in Supabase to production domain
- [ ] Added redirect URLs in Supabase
- [ ] Added VITE_SUPABASE_URL to Vercel (see VERCEL-SETUP.md)
- [ ] Added VITE_SUPABASE_ANON_KEY to Vercel
- [ ] Redeployed application
- [ ] Tested sign-in flow

## Reference Links

- Google Cloud Console: https://console.cloud.google.com/
- Supabase Dashboard: https://supabase.com/dashboard/project/qupwpcsbaidpykghqzxt
- Supabase Auth Guide: https://supabase.com/docs/guides/auth/social-login/auth-google

## Project Details

- **Supabase Project**: qupwpcsbaidpykghqzxt
- **Supabase URL**: https://qupwpcsbaidpykghqzxt.supabase.co
- **Production Domain**: https://localeffortfood.com
- **Calendar Path**: /calendar
- **Required Callback**: https://qupwpcsbaidpykghqzxt.supabase.co/auth/v1/callback
