const fs = require('fs');

let cached = null;

const readJsonFromEnv = (value, label) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`[firebase-admin] failed to parse ${label}`, error.message);
    return null;
  }
};

const readJsonFromBase64 = (value) => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('[firebase-admin] failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64', error.message);
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

const normalizePrivateKey = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const unescaped = raw.replace(/\\n/g, '\n');
  if (unescaped.includes('-----BEGIN')) {
    return unescaped;
  }
  try {
    const decoded = Buffer.from(unescaped, 'base64').toString('utf8');
    return decoded.includes('-----BEGIN') ? decoded : unescaped;
  } catch (error) {
    return unescaped;
  }
};

function coerceServiceAccount(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const projectId = candidate.project_id || candidate.projectId || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = candidate.client_email || candidate.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(candidate.private_key || candidate.privateKey || process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function loadServiceAccount() {
  const fromJson = readJsonFromEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'FIREBASE_SERVICE_ACCOUNT_JSON');
  const fromBase64 = readJsonFromBase64(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  const fromPath = readJsonFromPath(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

  const candidate = coerceServiceAccount(fromJson) || coerceServiceAccount(fromBase64) || coerceServiceAccount(fromPath);
  if (candidate) {
    return candidate;
  }

  const fallback = coerceServiceAccount({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  });

  if (!fallback) {
    console.warn('[firebase-admin] service account credentials missing; Firestore will be disabled.');
  }

  return fallback;
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
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
          }),
          projectId: serviceAccount.projectId,
          databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
        });
        console.warn('[firebase-admin] initialized with explicit service account credentials');
      } else {
        admin.initializeApp();
        console.warn('[firebase-admin] initialized with default application credentials');
      }
    }
    firestore = typeof admin.firestore === 'function' ? admin.firestore() : null;
  } catch (error) {
    console.warn('[firebase-admin] failed to initialize app', error.message);
    if (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.warn('[firebase-admin] env present but initialization still failed – check private key formatting and newline escapes.');
    }
    firestore = null;
  }

  cached = { admin, firestore };
  return cached;
}

module.exports = { getFirebaseAdmin };
