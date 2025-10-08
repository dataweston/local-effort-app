#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('node:path');
const fs = require('node:fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getDatabase } = require('firebase-admin/database');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || path.resolve(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('[migrate] Missing service account JSON.');
  console.error('[migrate] Provide FIREBASE_SERVICE_ACCOUNT_PATH or place serviceAccountKey.json in scripts/.');
  process.exit(1);
}

const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(serviceAccountRaw);

const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.RTDB_URL;
if (!databaseURL) {
  console.error('[migrate] FIREBASE_DATABASE_URL (or RTDB_URL) must be set to the target Realtime Database URL.');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
  databaseURL,
});

const firestore = getFirestore();
const rtdb = getDatabase();

function normalizeTimestamp(value) {
  if (!value) return { iso: null, ms: null };
  if (typeof value === 'number') {
    return { iso: new Date(value).toISOString(), ms: value };
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return { iso: new Date(parsed).toISOString(), ms: parsed };
    }
    return { iso: value, ms: null };
  }
  if (value.toMillis && typeof value.toMillis === 'function') {
    try {
      const ms = value.toMillis();
      return { iso: new Date(ms).toISOString(), ms };
    } catch (error) {
      // ignore
    }
  }
  if (value.toDate && typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      return { iso: date.toISOString(), ms: date.getTime() };
    } catch (error) {
      // ignore
    }
  }
  return { iso: null, ms: null };
}

async function migrateFeedback() {
  const snapshot = await firestore.collection('feedback').get();
  const data = {};
  snapshot.forEach((doc) => {
    const value = doc.data() || {};
    const { iso, ms } = normalizeTimestamp(value.submittedAt || value.createdAt || value.created_at);
    data[doc.id] = {
      ...value,
      submittedAt: iso,
      submittedAtMs: ms ?? Date.now(),
    };
  });
  await rtdb.ref('feedback').set(data);
  console.log(`[migrate] Migrated ${snapshot.size} feedback entries.`);
}

async function migrateMealprepComments() {
  const root = await firestore.collection('mealprep_comments').get();
  let total = 0;
  for (const doc of root.docs) {
    const commentsSnapshot = await doc.ref.collection('comments').get();
    const entries = {};
    commentsSnapshot.forEach((commentDoc) => {
      const value = commentDoc.data() || {};
      const { iso, ms } = normalizeTimestamp(value.createdAt || value.created_at);
      entries[commentDoc.id] = {
        ...value,
        createdAt: iso,
        createdAtMs: ms ?? Date.now(),
      };
      total += 1;
    });
    await rtdb.ref(`mealprep_comments/${doc.id}/comments`).set(entries);
  }
  console.log(`[migrate] Migrated ${total} meal prep comments across ${root.size} menus.`);
}

async function main() {
  await migrateFeedback();
  await migrateMealprepComments();
  console.log('[migrate] Migration complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('[migrate] Migration failed:', error);
  process.exit(1);
});
