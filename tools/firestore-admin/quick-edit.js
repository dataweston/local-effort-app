#!/usr/bin/env node
/* eslint-disable no-console */
/*
 Small Firestore admin helper for events collection.
 Usage examples:
  node tools/firestore-admin/quick-edit.js list
  node tools/firestore-admin/quick-edit.js get <docId>
  node tools/firestore-admin/quick-edit.js add '{"title":"Test","date":"2025-01-01"}'
  node tools/firestore-admin/quick-edit.js update <docId> '{"title":"New"}'
  node tools/firestore-admin/quick-edit.js delete <docId>

 Credentials: uses tools/firestore-migrate/target.json by default or FS_ADMIN_CRED env.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const credPath = process.env.FS_ADMIN_CRED || 'tools/firestore-migrate/target.json';
const absolute = path.resolve(credPath);
if (!fs.existsSync(absolute)) {
  console.error('Missing credentials at', absolute);
  process.exit(1);
}
const credential = admin.credential.cert(JSON.parse(fs.readFileSync(absolute, 'utf8')));
const app = admin.initializeApp({ credential });
const db = app.firestore();

async function list() {
  const snap = await db.collection('events').orderBy('date', 'desc').limit(20).get();
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(JSON.stringify(rows, null, 2));
}

async function get(id) {
  const doc = await db.collection('events').doc(id).get();
  if (!doc.exists) { console.error('Not found'); process.exit(1); }
  console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
}

async function add(jsonStr) {
  const data = JSON.parse(jsonStr);
  // Normalize date to Timestamp if string
  if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
  const ref = await db.collection('events').add(data);
  console.log('Added', ref.id);
}

async function update(id, jsonStr) {
  const data = JSON.parse(jsonStr);
  if (data.date && typeof data.date === 'string') data.date = new Date(data.date);
  await db.collection('events').doc(id).update(data);
  console.log('Updated', id);
}

async function del(id) {
  await db.collection('events').doc(id).delete();
  console.log('Deleted', id);
}

(async function main() {
  const [cmd, a1, a2] = process.argv.slice(2);
  try {
    if (cmd === 'list') await list();
    else if (cmd === 'get') await get(a1);
    else if (cmd === 'add') await add(a1);
    else if (cmd === 'update') await update(a1, a2);
    else if (cmd === 'delete') await del(a1);
    else {
      console.log('Usage:\n list\n get <docId>\n add <json>\n update <docId> <json>\n delete <docId>');
      process.exit(1);
    }
  } catch (e) {
    console.error('Error:', e && (e.message || e));
    process.exit(1);
  } finally {
    await app.delete().catch(()=>{});
  }
})();
