import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL?: string;
};

const normalizeServiceAccount = (raw: any): ServiceAccount | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const projectId: string =
    raw.projectId || raw.project_id || process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail: string =
    raw.clientEmail || raw.client_email || process.env.FIREBASE_CLIENT_EMAIL || '';
  let privateKey: string =
    raw.privateKey || raw.private_key || process.env.FIREBASE_PRIVATE_KEY || '';
  const databaseURL: string | undefined =
    raw.databaseURL ||
    raw.database_url ||
    process.env.FIREBASE_DATABASE_URL ||
    process.env.GOOGLE_CLOUD_FIREBASE_DATABASE_URL ||
    undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  return { projectId, clientEmail, privateKey, databaseURL };
};

const parseJson = (value?: string | null): any | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[firebase-admin] failed to parse JSON credentials', (error as Error).message);
    return null;
  }
};

const loadServiceAccount = (): ServiceAccount | null => {
  const direct = normalizeServiceAccount(parseJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  if (direct) return direct;

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64) {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const parsed = parseJson(decoded);
      const normalized = normalizeServiceAccount(parsed);
      if (normalized) return normalized;
    } catch (error) {
      console.warn('[firebase-admin] failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64', (error as Error).message);
    }
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const data = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const normalized = normalizeServiceAccount(data);
      if (normalized) return normalized;
    } catch (error) {
      console.warn(
        '[firebase-admin] failed to read FIREBASE_SERVICE_ACCOUNT_PATH',
        (error as Error).message,
      );
    }
  }

  return normalizeServiceAccount({});
};

let app = getApps()[0] ?? null;

const serviceAccount = loadServiceAccount();

if (!app && serviceAccount) {
  app = initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    }),
    projectId: serviceAccount.projectId,
    databaseURL: serviceAccount.databaseURL,
  });
}

if (!app) {
  console.warn('[firebase-admin] credentials missing; Firestore access disabled for this process');
}

export const db = app ? getFirestore(app) : null;

let resolvedRealtimeDb = null;
if (app) {
  try {
    resolvedRealtimeDb = getDatabase(app);
  } catch (error) {
    console.warn('[firebase-admin] realtime database unavailable', (error as Error).message);
    resolvedRealtimeDb = null;
  }
}

export const realtimeDb = resolvedRealtimeDb;
