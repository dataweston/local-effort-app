# Move Gallant data into Main (simple)

This copies Firestore data from Gallant into your main Firebase project. It keeps the same document IDs and subcollections.

What you need
- Two service account files (download from Firebase console):
  - Gallant project → save as `tools/firestore-migrate/source.json`
  - Main project → save as `tools/firestore-migrate/target.json`

How to run
1) Dry run (shows what it would do):
  npm run migrate:gallant:dry

2) Do it for real:
  npm run migrate:gallant

3) Point the app at the main project (after copy):
  - Update your `.env` to use the main Firebase config (VITE_* vars)
  - Redeploy

Details
- Defaults: copies `events` and `receipts`.
- To pick different collections:
  FS_MIGRATE_COLLECTIONS=col1,col2 npm run migrate:gallant
- You can also pass files via flags:
  node tools/firestore-migrate/migrate.js --sourceCred ./SOURCE.json --targetCred ./TARGET.json

Notes
- This doesn’t change rules or indexes. Adjust those in Firebase console if needed.
- Existing docs in the main project will be overwritten with the same IDs.
