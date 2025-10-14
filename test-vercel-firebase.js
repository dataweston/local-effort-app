#!/usr/bin/env node
/**
 * Test Firebase Admin with Vercel Production Environment
 */

require('dotenv').config({path: '.env.vercel.production'});

console.log('\n🔍 Testing Firebase Admin with Vercel Production Env\n');
console.log('═'.repeat(60));

// Check env var
console.log('\n1. Environment Variable Check:');
console.log(`   FIREBASE_SERVICE_ACCOUNT_BASE64: ${process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.length + ' chars' : 'NOT SET'}`);
console.log(`   FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || 'not set'}`);
console.log(`   VITE_FIREBASE_PROJECT_ID: ${process.env.VITE_FIREBASE_PROJECT_ID || 'not set'}`);

// Test decoding
console.log('\n2. Base64 Decoding Test:');
try {
  const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
  const parsed = JSON.parse(decoded);
  console.log(`   ✅ Successfully decoded and parsed`);
  console.log(`   Project ID: ${parsed.project_id}`);
  console.log(`   Client Email: ${parsed.client_email}`);
  console.log(`   Has private_key: ${!!parsed.private_key}`);
} catch (e) {
  console.log(`   ❌ Failed to decode: ${e.message}`);
}

// Test Firebase Admin initialization
console.log('\n3. Firebase Admin Initialization:');
try {
  const { getFirebaseAdmin } = require('./api/_lib/firebaseAdmin');
  const { admin, firestore } = getFirebaseAdmin();
  
  console.log(`   Admin SDK: ${admin ? '✅ Loaded' : '❌ Failed'}`);
  console.log(`   Firestore: ${firestore ? '✅ Available' : '❌ Unavailable'}`);
  
  if (admin && admin.apps && admin.apps[0]) {
    console.log(`   Project ID: ${admin.apps[0].options.projectId || 'not set'}`);
    console.log(`   Credential type: ${admin.apps[0].options.credential ? 'present' : 'missing'}`);
  }
  
  // Test Firestore read
  if (firestore) {
    console.log('\n4. Firestore Access Test:');
    firestore.collection('aggregates').doc('crowdfunding').get()
      .then(doc => {
        console.log(`   ✅ READ SUCCESS - Document exists: ${doc.exists}`);
        process.exit(0);
      })
      .catch(err => {
        console.log(`   ❌ READ FAILED: ${err.message}`);
        console.log(`   Error code: ${err.code}`);
        
        if (err.code === 16) {
          console.log('\n⚠️  IAM PERMISSIONS ISSUE:');
          console.log('   Service account needs Cloud Datastore User role');
          console.log('   https://console.cloud.google.com/iam-admin/iam?project=local-effort');
        }
        process.exit(1);
      });
  } else {
    console.log('\n❌ Firestore not initialized - cannot test access');
    process.exit(1);
  }
  
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
  console.log(`   Stack: ${e.stack}`);
  process.exit(1);
}
