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

const normalizeServiceAccount = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  const projectId =
    raw.projectId || raw.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  const clientEmail =
    raw.clientEmail || raw.client_email || process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '';
  let privateKey =
    raw.privateKey || raw.private_key || process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '';
  const databaseURL =
    raw.databaseURL ||
    raw.database_url ||
    process.env.FIREBASE_DATABASE_URL ||
    process.env.GOOGLE_CLOUD_FIREBASE_DATABASE_URL ||
    undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  return {
    projectId,
    clientEmail,
    privateKey,
    databaseURL,
  };
};

const loadServiceAccount = () => {
  const direct = normalizeServiceAccount(readJsonFromEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  if (direct) return direct;

  const base64 = normalizeServiceAccount(readJsonFromBase64(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64));
  if (base64) return base64;

  const fromPath = normalizeServiceAccount(readJsonFromPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
  if (fromPath) return fromPath;

  return normalizeServiceAccount({});
};

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
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
          }),
          projectId: serviceAccount.projectId,
          databaseURL: serviceAccount.databaseURL,
        });
      } else {
        console.warn('[firebase-admin] no service account found; attempting default credentials');
        admin.initializeApp();
      }
    }
    firestore = typeof admin.firestore === 'function' ? admin.firestore() : null;
    if (!firestore) {
      console.warn('[firebase-admin] firestore unavailable after initialization');
    }
  } catch (error) {
    console.warn('[firebase-admin] failed to initialize app', error.message);
    firestore = null;
  }

  cached = { admin, firestore };
  return cached;
}

module.exports = { getFirebaseAdmin };
