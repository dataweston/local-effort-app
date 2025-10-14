# Firestore Configuration Status

## ✅ Changes Completed

### 1. Removed Firebase Realtime Database
- ❌ Removed `realtimeDb` export from `src/firebaseConfig.js`
- ❌ Removed `databaseURL` configuration
- ❌ Removed `getDatabase` imports from `firebase/database`
- ❌ Removed RTDB from admin SDK (`packages/lib/firebaseAdmin.ts`, `api/_lib/firebaseAdmin.js`)

### 2. Updated Components
- `src/components/menu/FeedbackForm.jsx` - Disabled (needs Firestore migration)
- `src/components/mealprep/Comments.jsx` - Disabled (needs Firestore migration)

### 3. Firestore-Only Architecture
The application now exclusively uses **Firestore** for:
- `/crowdfunding` page - Pizza counter and feedback
- `aggregates/crowdfunding` - Pizza totals
- `crowdfund_feedback` - Pizza feedback collection
- All server-side APIs

## ❌ Outstanding Issue: IAM Permissions

### Current Status
```
Error: 16 UNAUTHENTICATED
Message: Request had invalid authentication credentials
```

### Root Cause
The Firebase service account lacks IAM permissions to access Firestore.

### Service Account Details
- Project: `local-effort`
- Email: `firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com`
- Key ID: `bae4f4c196d83765244617d2ca860878e22945f1`

### Required IAM Roles

The service account needs **ONE** of these roles:

#### Option 1: Cloud Datastore User (Recommended)
```
Role: roles/datastore.user
Permissions: Read and write to Firestore
```

#### Option 2: Cloud Datastore Owner (Full Access)
```
Role: roles/datastore.owner
Permissions: Full Firestore access including admin operations
```

#### Option 3: Firebase Admin (Full Firebase Access)
```
Role: roles/firebase.admin
Permissions: Full Firebase access (Firestore, Auth, Storage, etc.)
```

### How to Fix

#### Google Cloud Console
1. Go to: https://console.cloud.google.com/
2. Select project: `local-effort`
3. Navigate to: **IAM & Admin → IAM**
4. Find: `firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com`
5. Click **Edit** (pencil icon)
6. Click **+ ADD ANOTHER ROLE**
7. Select: **Cloud Datastore User** (or Cloud Datastore Owner)
8. Click **SAVE**
9. Wait 1-5 minutes for propagation

#### Via gcloud CLI
```bash
gcloud projects add-iam-policy-binding local-effort \
  --member="serviceAccount:firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Verification

After adding IAM permissions, test with:
```bash
node -e "require('dotenv').config(); const {getFirebaseAdmin} = require('./api/_lib/firebaseAdmin'); const {firestore} = getFirebaseAdmin(); firestore.collection('aggregates').doc('crowdfunding').get().then(d => console.log('SUCCESS:', d.exists)).catch(e => console.log('FAILED:', e.message));"
```

Expected output: `SUCCESS: true` or `SUCCESS: false` (not UNAUTHENTICATED)

## 🔍 Alternative: Generate New Service Account Key

If IAM permissions don't resolve the issue, generate a fresh service account key:

### Steps
1. Go to: **IAM & Admin → Service Accounts**
2. Find: `firebase-adminsdk-xrvm0@local-effort.iam.gserviceaccount.com`
3. Check the **Roles** tab - ensure it has datastore access
4. Go to **Keys** tab
5. **Add Key → Create New Key → JSON**
6. Download the JSON file
7. Base64 encode it:
   ```bash
   # Mac/Linux
   base64 -i service-account.json | tr -d '\n' > encoded.txt
   
   # Windows (PowerShell)
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json")) > encoded.txt
   ```
8. Update `.env`:
   ```
   FIREBASE_SERVICE_ACCOUNT_BASE64=<paste encoded content>
   ```
9. Update Vercel environment variables

## 📝 Components Needing Migration

These components were using Realtime Database and are currently disabled:

### 1. Menu Feedback Form
- File: `src/components/menu/FeedbackForm.jsx`
- Collection needed: `feedback` (Firestore)
- Status: Shows error message to users

### 2. Meal Prep Comments
- File: `src/components/mealprep/Comments.jsx`
- Collection needed: `mealprep_comments/{menuId}/comments` (Firestore)
- Status: Shows alert to users

## ✨ What's Working

### Client-Side (Browser)
- ✅ Firestore initialization
- ✅ Real-time listeners (`onSnapshot`)
- ⚠️ May work if using API key auth (separate from service account)

### Server-Side (APIs)
- ❌ All Firestore operations fail (needs IAM fix)
- ✅ Fallback data mechanisms prevent crashes
- ✅ Code properly handles missing Firestore

## 🎯 Next Steps

1. **Immediate**: Fix IAM permissions in Google Cloud Console
2. **Verify**: Run test script to confirm Firestore access
3. **Monitor**: Check `/crowdfunding` page for live updates
4. **Optional**: Migrate disabled components to Firestore
5. **Optional**: Remove fallback mechanisms once stable
