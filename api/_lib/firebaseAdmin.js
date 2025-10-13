const fs = require('fs');

// Try loading local .env early so process.env is populated during local dev and scripts
try {
  // eslint-disable-next-line global-require
  const dotenv = require('dotenv');
  dotenv.config();
} catch (e) {
  // dotenv missing is fine in production
}

let cached = null;

const candidateProjectEnvKeys = [
  'FIREBASE_PROJECT_ID',
  'GOOGLE_CLOUD_PROJECT',
  'GCLOUD_PROJECT',
  'GCP_PROJECT',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_PROJECT_ID',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_PROJECT_ID',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_PROJECT_ID',
];

const clientConfigEnvKeys = [
  'FIREBASE_CLIENT_CONFIG_JSON',
  'FIREBASE_CLIENT_CONFIG',
  'FIREBASE_PUBLIC_CONFIG_JSON',
  'FIREBASE_PUBLIC_CONFIG',
  'NEXT_PUBLIC_FIREBASE_CONFIG',
  'VITE_FIREBASE_CONFIG',
  'REACT_APP_FIREBASE_CONFIG',
  'FIREBASE_WEB_CONFIG',
  'FIREBASE_OPTIONS',
  'FIREBASE_CONFIG',
];

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const safeDecodeBase64Json = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.startsWith('{') || raw.startsWith('\u007b')) {
    return safeParseJson(raw);
  }

  const unquoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    ? raw.slice(1, -1)
    : raw;

  const candidates = [unquoted, unquoted.replace(/\s+/g, ''), unquoted.replace(/-/g, '+').replace(/_/g, '/')];
  for (const cand of candidates) {
    try {
      const decoded = Buffer.from(cand, 'base64').toString('utf8');
      const parsed = safeParseJson(decoded);
      if (parsed) return parsed;
    } catch (error) {
      // try next candidate
    }
  }

  return null;
};

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
  const raw = String(value).trim();

  // If the env contains JSON directly (not base64), try parsing directly
  if (raw.startsWith('{') || raw.startsWith('\u007b')) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      // fall through to base64 attempts
    }
  }

  // Try removing surrounding quotes
  const unquoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
    ? raw.slice(1, -1)
    : raw;

  // Try direct base64 decode, then URL safe variants
  const candidates = [unquoted, unquoted.replace(/\s+/g, ''), unquoted.replace(/-/g, '+').replace(/_/g, '/')];
  for (const cand of candidates) {
    try {
      const decoded = Buffer.from(cand, 'base64').toString('utf8');
      // If decoded looks like JSON, parse it
      if (decoded && (decoded.trim().startsWith('{') || decoded.includes('private_key'))) {
        return JSON.parse(decoded);
      }
    } catch (err) {
      // try next
    }
  }

  console.warn('[firebase-admin] failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64');
  return null;
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

const resolveProjectIdFromObject = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return null;
  const projectId = candidate.project_id || candidate.projectId || candidate.projectID || candidate.project;
  if (typeof projectId === 'string' && projectId.trim()) {
    return projectId.trim();
  }
  return null;
};

const resolveProjectIdFromEnv = () => {
  for (const key of candidateProjectEnvKeys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const serviceAccountJson = safeParseJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const serviceAccountBase64 = safeDecodeBase64Json(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  const serviceAccountFromPath = safeParseJson(
    (() => {
      try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return null;
        if (!fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) return null;
        return fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
      } catch (error) {
        return null;
      }
    })(),
  );

  const serviceAccountProjectId =
    resolveProjectIdFromObject(serviceAccountJson) ||
    resolveProjectIdFromObject(serviceAccountBase64) ||
    resolveProjectIdFromObject(serviceAccountFromPath);
  if (serviceAccountProjectId) return serviceAccountProjectId;

  for (const key of clientConfigEnvKeys) {
    const parsed = safeParseJson(process.env[key]);
    const projectId = resolveProjectIdFromObject(parsed);
    if (projectId) return projectId;
  }

  return null;
};

const applyProjectIdEnv = (projectId) => {
  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) return;
  const value = projectId.trim();
  try {
    if (!process.env.FIREBASE_PROJECT_ID) process.env.FIREBASE_PROJECT_ID = value;
    if (!process.env.GOOGLE_CLOUD_PROJECT) process.env.GOOGLE_CLOUD_PROJECT = value;
    if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = value;
    if (!process.env.GCP_PROJECT) process.env.GCP_PROJECT = value;
  } catch (error) {
    // Ignore env assignment failures (read-only env)
  }
};

function coerceServiceAccount(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const projectId =
    resolveProjectIdFromObject(candidate) ||
    resolveProjectIdFromEnv();
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
    projectId: resolveProjectIdFromEnv(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  });

  if (!fallback) {
    // Provide extra diagnostics (no secret values) to aid debugging in production (e.g., Vercel env scope issues)
    try {
      const vars = {
        FIREBASE_SERVICE_ACCOUNT_JSON: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).length : 0,
        FIREBASE_SERVICE_ACCOUNT_BASE64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64).length : 0,
        FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH).length : 0,
        FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? String(process.env.FIREBASE_PRIVATE_KEY).length : 0,
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? String(process.env.FIREBASE_PROJECT_ID) : '(not set)',
      };
      console.warn('[firebase-admin] service account credentials missing; Firestore will be disabled.', { envVarsSummary: vars, hint: 'Ensure FIREBASE_SERVICE_ACCOUNT_BASE64 (or JSON) is configured in your production environment (Vercel: Project > Settings > Environment Variables; set for Production runtime).' });
    } catch (e) {
      console.warn('[firebase-admin] service account credentials missing; Firestore will be disabled.');
    }
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
      const resolvedProjectId = serviceAccount?.projectId || resolveProjectIdFromEnv();
      const databaseURL = process.env.FIREBASE_DATABASE_URL || undefined;
      if (serviceAccount) {
        // Ensure process.env has fallback values so firebase-admin can detect project id in different runtimes
        try {
          applyProjectIdEnv(serviceAccount.projectId);
          if (!process.env.FIREBASE_CLIENT_EMAIL && serviceAccount.clientEmail) process.env.FIREBASE_CLIENT_EMAIL = serviceAccount.clientEmail;
        } catch (e) {
          // ignore env set failures
        }
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey,
          }),
          projectId: serviceAccount.projectId,
          databaseURL,
        });
        console.warn('[firebase-admin] initialized with explicit service account credentials');
      } else {
        const baseOptions = {};
        if (resolvedProjectId) baseOptions.projectId = resolvedProjectId;
        if (databaseURL) baseOptions.databaseURL = databaseURL;

        let initialized = false;
        if (typeof admin.credential?.applicationDefault === 'function') {
          try {
            admin.initializeApp({
              ...baseOptions,
              credential: admin.credential.applicationDefault(),
            });
            initialized = true;
            console.warn('[firebase-admin] initialized with application default credentials');
          } catch (error) {
            console.warn('[firebase-admin] applicationDefault credentials unavailable', error.message);
          }
        }

        if (!initialized) {
          admin.initializeApp(baseOptions);
          if (resolvedProjectId) {
            console.warn('[firebase-admin] initialized with project ID only (no explicit credentials)');
          } else {
            console.warn('[firebase-admin] initialized without explicit project ID; Firestore will be disabled if unavailable');
          }
        }
      }
    }
    firestore = typeof admin.firestore === 'function' ? admin.firestore() : null;

    const appOptions = admin?.apps?.[0]?.options || {};
    let projectId = appOptions.projectId || resolveProjectIdFromEnv();
    if (!projectId) {
      const credentialProjectId = appOptions.credential && appOptions.credential.projectId;
      if (typeof credentialProjectId === 'string' && credentialProjectId) {
        projectId = credentialProjectId;
      }
    }

    if (projectId) {
      applyProjectIdEnv(projectId);
    } else if (!firestore) {
      console.warn('[firebase-admin] project ID could not be resolved and Firestore is unavailable.');
    } else {
      console.warn(
        '[firebase-admin] project ID could not be resolved from env or credentials; continuing with Firestore using default credential discovery.'
      );
    }
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
