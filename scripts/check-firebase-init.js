// Loads .env, requires the firebase admin helper, and calls getFirebaseAdmin()
try { require('dotenv').config(); } catch (e) {}

const { getFirebaseAdmin } = require('../api-handlers/_lib/firebaseAdmin');

(async () => {
  try {
    const resources = getFirebaseAdmin();
    const hasAdmin = !!resources && !!resources.admin;
    const hasFirestore = !!resources && !!resources.firestore;
    console.log('HAS_ADMIN', String(hasAdmin));
    console.log('HAS_FIRESTORE', String(hasFirestore));
    if (resources && resources.admin && resources.admin.apps) {
      console.log('ADMIN_APPS_COUNT', resources.admin.apps.length);
    }
  } catch (err) {
    console.error('ERROR', String(err && err.message ? err.message : err));
    process.exit(2);
  }
})();
