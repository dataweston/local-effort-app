# 🚨 Vercel Firebase/Firestore Fix - Production Deployment

**Date**: October 14, 2025  
**Status**: ❌ Production APIs failing with authentication errors  
**Environment**: Vercel Production (www.localeffortfood.com)

---

## 📋 Summary of Errors

### Production Console Errors (Browser)
```
GET /api/crowdfund/pizza-feedback?limit=8 → 500 Internal Server Error
POST /api/crowdfund/confirm-payment → 500 Internal Server Error
```

### Vercel Function Logs (Server)
```
Error: Could not load the default credentials. 
Browse to https://cloud.google.com/docs/authentication/getting-started for more information.

[firebase-admin] failed to initialize app 
Can't determine Firebase Database URL.
```

---

## 🔍 Root Cause Analysis

### Issue #1: Missing Vercel Environment Variable (CRITICAL)
**Symptom**: "Could not load the default credentials"  
**Cause**: `FIREBASE_SERVICE_ACCOUNT_BASE64` is **NOT configured** in Vercel Production environment  
**Impact**: All Firestore operations fail → API endpoints return 500 errors

### Issue #2: Misleading RTDB Error Message
**Symptom**: "Can't determine Firebase Database URL"  
**Cause**: This is a **browser warning** from Firebase client SDK trying to initialize RTDB (legacy code path)  
**Impact**: None - this is informational only, not the actual failure cause  
**Note**: We removed RTDB from server code, but client bundle still has remnants

---

## ✅ Solution: Configure Vercel Environment Variables

### Step 1: Get Your Service Account Credentials

The base64-encoded service account is in your local `.env` file:

```bash
# Run this locally to see the value:
node -e "require('dotenv').config(); console.log('FIREBASE_SERVICE_ACCOUNT_BASE64:', process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);"
```

**Expected output**: A long base64 string (~3168 characters)

---

### Step 2: Add Environment Variable to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dataweston/local-effort-app
2. **Navigate to**: Settings → Environment Variables
3. **Click**: "Add New"
4. **Configure**:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_BASE64`
   - **Value**: [paste the entire base64 string from your .env]
   - **Environment**: Select **"Production"** (and optionally Preview/Development)
   - **Git Branch**: Leave default (all branches)

5. **Click**: "Save"

---

### Step 3: Redeploy to Apply Changes

Environment variables are **only loaded at build/deploy time**, so you must redeploy:

**Option A - Trigger Deployment via Git**:
```bash
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push origin main
```

**Option B - Manual Redeploy via Vercel Dashboard**:
1. Go to: Deployments tab
2. Click "..." menu on latest deployment
3. Select "Redeploy"
4. Choose "Use existing build cache: No"

---

### Step 4: Verify Production is Working

After deployment completes (~2-5 minutes):

**Test API Endpoint**:
```bash
curl -i "https://www.localeffortfood.com/api/crowdfund/pizza-feedback?limit=1"
```

**Expected response**: `200 OK` with JSON data
```json
{
  "entries": [
    {
      "id": "...",
      "name": "...",
      "comment": "...",
      "rating": 5
    }
  ]
}
```

**Visit the page**: https://www.localeffortfood.com/crowdfunding  
- Pizza feedback should load
- Payment submissions should succeed

---

## 🧪 Optional: Verify IAM Permissions

If the environment variable is set correctly but you still get authentication errors, verify IAM permissions:

### Check Service Account Email
```bash
# Decode to see the service account email:
node -e "require('dotenv').config(); const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64')); console.log('Service Account:', sa.client_email);"
```

**Expected output**: `firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com`

### Verify IAM Roles in Google Cloud Console

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=local-effort
2. Find service account: `firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com`
3. Ensure it has **one of these roles**:
   - ✅ **Cloud Datastore User** (recommended)
   - ✅ **Cloud Datastore Owner** (full access)
   - ✅ **Firebase Admin** (legacy, also works)

If missing, click "Edit" → "Add Another Role" → Search "Cloud Datastore User" → Save

---

## 📊 Environment Variable Checklist

Required for **Production** Vercel deployment:

| Variable | Status | Scope | Notes |
|----------|--------|-------|-------|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | ❌ **MISSING** | Server | Critical - add this! |
| `VITE_FIREBASE_PROJECT_ID` | ❓ Unknown | Client | Should be "local-effort" |
| `VITE_FIREBASE_API_KEY` | ❓ Unknown | Client | Web API key |
| `VITE_FIREBASE_APP_ID` | ❓ Unknown | Client | App ID (optional) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ❓ Unknown | Client | Messaging (optional) |
| `SQUARE_ACCESS_TOKEN` | ❓ Unknown | Server | Payment processing |
| `SQUARE_ENVIRONMENT` | ❓ Unknown | Server | Must be "production" |
| `BREVO_API_KEY` | ❓ Unknown | Server | Email service |

**Quick Check**: Run `node check-env-vars.js` to verify all variables are configured locally.

---

## 🐛 Debugging Commands

### Test Locally (Should work)
```bash
node diagnose-firebase.js
```
**Expected**: ✅ All checks pass (except Firestore read if IAM not set)

### Check Vercel Environment Variables
```bash
vercel env ls
```

### Pull Vercel Environment to Local
```bash
vercel env pull .env.vercel
cat .env.vercel | grep FIREBASE_SERVICE_ACCOUNT_BASE64
```

### View Production Logs
```bash
vercel logs --prod
```

---

## 🎯 Next Steps

1. ✅ **Add `FIREBASE_SERVICE_ACCOUNT_BASE64` to Vercel Production**
2. ✅ **Redeploy** (git push or manual redeploy)
3. ✅ **Test** pizza feedback API endpoint
4. ✅ **Verify** crowdfunding page loads correctly
5. ⏳ **Optional**: Verify IAM permissions if still failing
6. ⏳ **Optional**: Clean up client-side RTDB warning (rebuild frontend bundle)

---

## 📝 Notes

- **Local environment works** because `.env` file has `FIREBASE_SERVICE_ACCOUNT_BASE64`
- **Vercel production fails** because environment variable was never added to project settings
- The "Can't determine Firebase Database URL" error is a **red herring** - it's from client SDK, not the actual failure
- Real issue: Server-side Firebase Admin SDK can't initialize without credentials
- Once environment variable is added, all Firestore operations will work (assuming IAM permissions are correct)

---

## 🔗 References

- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [Firebase Admin SDK Authentication](https://firebase.google.com/docs/admin/setup#initialize-sdk)
- [Google Cloud IAM Roles](https://cloud.google.com/firestore/docs/security/iam)
- Local diagnostic tool: `./diagnose-firebase.js`
- Architecture docs: `./FIRESTORE_SETUP.md`
