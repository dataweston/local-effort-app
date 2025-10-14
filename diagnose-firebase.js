#!/usr/bin/env node
/**
 * Firebase/Firestore Diagnostic Tool
 * Run this to check your Firebase setup status
 */

require('dotenv').config();

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  Firebase/Firestore Configuration Diagnostic                 ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Check 1: Environment Variables
console.log('1️⃣  Environment Variables');
console.log('   ━'.repeat(30));
const envVars = {
  'VITE_FIREBASE_PROJECT_ID': process.env.VITE_FIREBASE_PROJECT_ID,
  'VITE_FIREBASE_API_KEY': process.env.VITE_FIREBASE_API_KEY ? '✓ Present' : '✗ Missing',
  'FIREBASE_SERVICE_ACCOUNT_BASE64': process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? `✓ Present (${process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.length} chars)` : '✗ Missing',
  'FIREBASE_DATABASE_URL': process.env.FIREBASE_DATABASE_URL || '✓ Not set (correct for Firestore-only)',
};

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`   ${key}: ${value}`);
});

// Check 2: Service Account
console.log('\n2️⃣  Service Account Credentials');
console.log('   ━'.repeat(30));

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const sa = JSON.parse(decoded);
    console.log('   ✓ Service account decoded successfully');
    console.log(`   Project: ${sa.project_id}`);
    console.log(`   Email: ${sa.client_email}`);
    console.log(`   Key ID: ${sa.private_key_id}`);
    console.log(`   Has private key: ${!!sa.private_key}`);
  } catch (e) {
    console.log('   ✗ Failed to decode service account:', e.message);
  }
} else {
  console.log('   ✗ Service account not configured');
}

// Check 3: Firebase Admin SDK
console.log('\n3️⃣  Firebase Admin SDK');
console.log('   ━'.repeat(30));

try {
  const { getFirebaseAdmin } = require('./api/_lib/firebaseAdmin');
  const { admin, firestore } = getFirebaseAdmin();
  
  console.log(`   Admin SDK: ${admin ? '✓ Loaded' : '✗ Failed'}`);
  console.log(`   Firestore: ${firestore ? '✓ Available' : '✗ Unavailable'}`);
  
  if (admin && admin.apps && admin.apps[0]) {
    console.log(`   Project ID: ${admin.apps[0].options.projectId}`);
    console.log(`   Database URL: ${admin.apps[0].options.databaseURL || 'Not set (correct)'}`);
  }
} catch (e) {
  console.log('   ✗ Error loading admin SDK:', e.message);
}

// Check 4: Firestore Access Test
console.log('\n4️⃣  Firestore Access Test');
console.log('   ━'.repeat(30));

try {
  const { getFirebaseAdmin } = require('./api/_lib/firebaseAdmin');
  const { firestore } = getFirebaseAdmin();
  
  if (!firestore) {
    console.log('   ✗ Firestore not initialized - cannot test');
  } else {
    console.log('   Testing read access to aggregates/crowdfunding...');
    
    firestore.collection('aggregates').doc('crowdfunding').get()
      .then(doc => {
        console.log('   ✓ READ ACCESS: SUCCESS');
        console.log(`   Document exists: ${doc.exists}`);
        if (doc.exists) {
          const data = doc.data();
          console.log(`   Pizzas: ${data.pizzas || 0}`);
          console.log(`   Backers: ${data.backers || 0}`);
          console.log(`   Goal: ${data.goal || 'not set'}`);
        }
        
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  ✅ ALL SYSTEMS OPERATIONAL                                   ║');
        console.log('║  Firestore is properly configured and accessible!             ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        process.exit(0);
      })
      .catch(err => {
        console.log('   ✗ READ ACCESS: FAILED');
        console.log(`   Error: ${err.message}`);
        console.log(`   Code: ${err.code}`);
        
        if (err.code === 16 || err.message.includes('UNAUTHENTICATED')) {
          console.log('\n╔═══════════════════════════════════════════════════════════════╗');
          console.log('║  ⚠️  IAM PERMISSIONS ISSUE DETECTED                           ║');
          console.log('╚═══════════════════════════════════════════════════════════════╝');
          console.log('\n📋 Required Actions:\n');
          console.log('1. Go to: https://console.cloud.google.com/');
          console.log('2. Select project: local-effort');
          console.log('3. Navigate to: IAM & Admin → IAM');
          console.log('4. Find service account: firebase-adminsdk-xrvm0@...');
          console.log('5. Add role: Cloud Datastore User (or Cloud Datastore Owner)');
          console.log('\n💡 The service account credentials are valid but lack permissions.');
          console.log('   Once IAM roles are updated, re-run this diagnostic.\n');
        } else {
          console.log('\n╔═══════════════════════════════════════════════════════════════╗');
          console.log('║  ❌ UNEXPECTED ERROR                                          ║');
          console.log('╚═══════════════════════════════════════════════════════════════╝');
          console.log('\nError details:', err);
        }
        
        process.exit(1);
      });
  }
} catch (e) {
  console.log('   ✗ Test failed:', e.message);
  process.exit(1);
}
