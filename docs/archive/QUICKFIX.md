# 🚀 Quick Fix Guide - Vercel Production Errors

**Last Updated**: October 14, 2025  
**Priority**: 🔴 **CRITICAL** - Production is down  
**Status**: ✅ Environment variable IS set, but still failing

---

## ⚡ TL;DR - Fix in 2 Steps (Env Var Already Set)

### 1️⃣ Verify Environment Variable Scope

The variable IS set in Vercel, but may be wrong scope:

1. Go to: https://vercel.com/dataweston/local-effort-app/settings/environment-variables
2. Find: `FIREBASE_SERVICE_ACCOUNT_BASE64`
3. **Check environment**: Must show **"Production"** (not just Preview/Development)
4. If missing Production, click **Edit** → Check **"Production"** → **Save**

### 2️⃣ Redeploy

```bash
git commit --allow-empty -m "fix: trigger redeploy for firebase env"
git push origin main
```

OR click **"Redeploy"** in Vercel dashboard.

### 3️⃣ Verify (after 2-5 min)

```bash
curl "https://www.localeffortfood.com/api/crowdfund/pizza-feedback?limit=1"
```

**Expected**: `200 OK` with JSON data (not 500 error)

---

## 🔍 What Went Wrong?

| Error | Root Cause | Fix |
|-------|------------|-----|
| `500 Internal Server Error` on `/api/crowdfund/*` | Missing `FIREBASE_SERVICE_ACCOUNT_BASE64` in Vercel | Add env var to Vercel Production |
| `Could not load the default credentials` | Firestore can't authenticate | Same as above |
| `Can't determine Firebase Database URL` | Legacy warning (ignore) | No fix needed |

---

## 📚 Full Documentation

- **Detailed Fix**: `VERCEL_FIREBASE_FIX.md`
- **Architecture**: `FIRESTORE_SETUP.md`
- **Local Diagnostic**: `node diagnose-firebase.js`
- **Env Check**: `node check-env-vars.js`

---

## 🆘 Still Failing?

### Check IAM Permissions

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=local-effort
2. Find: `firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com`
3. Ensure role: **Cloud Datastore User** is assigned
4. If not, click **Edit** → **Add Another Role** → **Cloud Datastore User** → **Save**
5. Wait 1-5 minutes for propagation

### View Vercel Logs

```bash
vercel logs --prod
```

Look for:
- ✅ `[firebase-admin] initialized with explicit service account credentials`
- ❌ `service account credentials missing`

---

## ✅ Success Indicators

### Vercel Logs Should Show:
```
[firebase-admin] initialized with explicit service account credentials
```

### API Endpoints Should Return:
```bash
# Pizza feedback
curl "https://www.localeffortfood.com/api/crowdfund/pizza-feedback?limit=1"
# → 200 OK with JSON

# Health check
curl "https://www.localeffortfood.com/api/_ping"
# → 200 OK
```

### Browser Console Should:
- ✅ Load pizza feedback without errors
- ✅ Allow payment submissions
- ⚠️ May still show "Can't determine Firebase Database URL" (harmless)

---

## 📞 Contact

If still failing after:
1. ✅ Added `FIREBASE_SERVICE_ACCOUNT_BASE64` to Vercel Production
2. ✅ Redeployed
3. ✅ Waited 5+ minutes
4. ✅ Verified IAM permissions

Then check:
- Vercel deployment status: https://vercel.com/dataweston/local-effort-app/deployments
- Firebase project status: https://console.firebase.google.com/project/local-effort
- Service account key validity: https://console.cloud.google.com/iam-admin/serviceaccounts?project=local-effort
