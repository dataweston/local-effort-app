#!/usr/bin/env node
/* eslint-disable no-console */
/*
  Firestore data migrator: SOURCE (Gallant project) -> TARGET (main project)
  - Preserves doc IDs
  - Recursively copies subcollections
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { collections: ['events', 'receipts'], dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--sourceCred') out.sourceCred = args[++i];
    else if (a === '--targetCred') out.targetCred = args[++i];
    else if (a === '--collections') out.collections = args[++i].split(',').map(s=>s.trim()).filter(Boolean);
    else if (a === '--dryRun') out.dryRun = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }

  // Defaults: allow env vars or local files
  out.sourceCred = out.sourceCred || process.env.FS_MIGRATE_SOURCE || 'tools/firestore-migrate/source.json';
  out.targetCred = out.targetCred || process.env.FS_MIGRATE_TARGET || 'tools/firestore-migrate/target.json';
  if (process.env.FS_MIGRATE_COLLECTIONS) {
    out.collections = String(process.env.FS_MIGRATE_COLLECTIONS)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (process.env.FS_MIGRATE_DRYRUN === '1' || process.env.FS_MIGRATE_DRYRUN === 'true') {
    out.dryRun = true;
  }
  return out;
}

function usage() {
  console.log(`Usage: npm run migrate:gallant [-- optional flags]\n\n` +
`Defaults:\n` +
`- Source cred: tools/firestore-migrate/source.json (or FS_MIGRATE_SOURCE env)\n` +
`- Target cred: tools/firestore-migrate/target.json (or FS_MIGRATE_TARGET env)\n` +
`- Collections: events,receipts (or FS_MIGRATE_COLLECTIONS env)\n` +
`- Dry run: set FS_MIGRATE_DRYRUN=1 or pass --dryRun\n`);
}

function initApp(credPath, name) {
  const absolute = path.resolve(credPath);
  const credential = admin.credential.cert(JSON.parse(fs.readFileSync(absolute, 'utf8')));
  return admin.initializeApp({ credential }, name);
}

async function copyDocRecursive(sourceDb, targetDb, sourceDocRef, targetDocRef, dryRun) {
  const snap = await sourceDocRef.get();
  if (!snap.exists) return;
  const data = snap.data();

  if (dryRun) {
    console.log(`[dryRun] set: ${targetDocRef.path}`);
  } else {
    await targetDb.doc(targetDocRef.path).set(data, { merge: true });
  }

  // Copy subcollections
  const subcols = await sourceDocRef.listCollections();
  for (const sub of subcols) {
    const subSnap = await sub.get();
    for (const doc of subSnap.docs) {
      const targetSubDoc = targetDb.collection(targetDocRef.path + '/' + sub.id).doc(doc.id);
      await copyDocRecursive(sourceDb, targetDb, doc.ref, targetSubDoc, dryRun);
    }
  }
}

async function copyCollection(sourceDb, targetDb, collectionName, dryRun) {
  const colRef = sourceDb.collection(collectionName);
  const snapshot = await colRef.get();
  console.log(`Copying ${snapshot.size} docs from ${collectionName}...`);
  let count = 0;
  for (const doc of snapshot.docs) {
    const targetDocRef = targetDb.collection(collectionName).doc(doc.id);
    await copyDocRecursive(sourceDb, targetDb, doc.ref, targetDocRef, dryRun);
    count++;
    if (count % 100 === 0) console.log(`  ${count} docs copied...`);
  }
  console.log(`Done ${collectionName}: ${count} docs.`);
}

(async function main() {
  const args = parseArgs();
  if (args.help || !args.sourceCred || !args.targetCred) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const sourceApp = initApp(args.sourceCred, 'source');
  const targetApp = initApp(args.targetCred, 'target');

  const sourceDb = sourceApp.firestore();
  const targetDb = targetApp.firestore();

  try {
    for (const col of args.collections) {
      await copyCollection(sourceDb, targetDb, col, args.dryRun);
    }
    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await Promise.all(admin.apps.map(app => app.delete().catch(()=>{})));
  }
})();
