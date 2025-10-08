const fs = require('fs');

let cached = null;

const readJsonFromEnv = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[firebase-admin] failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', error.message);
    return null;
  }
};

const readJsonFromBase64 = (value) => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('[firebase-admin] failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', error.message);
    return null;
  }
};

const readJsonFromPath = (filePath) => {
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[firebase-admin] FIREBASE_SERVICE_ACCOUNT_PATH not found: ${filePath}`);
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[firebase-admin] failed to read FIREBASE_SERVICE_ACCOUNT_PATH', error.message);
    return null;
  }
};

function loadServiceAccount() {
  return (
    readJsonFromEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ||
    readJsonFromBase64(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) ||
    readJsonFromPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) ||
    null
  );
}

function getFirebaseAdmin() {
  if (cached) {
    return cached;
  }

  let admin = null;
  let firestore = null;

  try {
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');
  } catch (error) {
    console.warn('[firebase-admin] module unavailable', error.message);
    cached = { admin: null, firestore: null };
    return cached;
  }

  try {
    if (!admin.apps.length) {
      const serviceAccount = loadServiceAccount();
      if (serviceAccount) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else {
        admin.initializeApp();
      }
    }
    firestore = typeof admin.firestore === 'function' ? admin.firestore() : null;
  } catch (error) {
    console.warn('[firebase-admin] failed to initialize app', error.message);
    firestore = null;
  }

  cached = { admin, firestore };
  return cached;
}

module.exports = { getFirebaseAdmin };
