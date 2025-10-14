import fs from 'node:fs';
import type { App, ServiceAccount } from 'firebase-admin/app';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Database } from 'firebase-admin/database';
import { getDatabase } from 'firebase-admin/database';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';

type FirebaseResources = {
  app: App | null;
  db: Firestore | null;
  realtimeDb: Database | null;
};

let cached: FirebaseResources | null = null;

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
] as const;

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
] as const;

function safeParseJson(value: string | undefined | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function safeDecodeBase64Json(value: string | undefined | null): Record<string, unknown> | null {
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
      // ignore and try next candidate
    }
  }

  return null;
}

function normalizePrivateKey(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value);
  if (!raw) return null;
  const unescaped = raw.replace(/\\n/g, '\n').trim();
  if (unescaped.includes('-----BEGIN')) {
    return unescaped;
  }
  try {
    const decoded = Buffer.from(unescaped, 'base64').toString('utf8');
    return decoded.includes('-----BEGIN') ? decoded : unescaped;
  } catch (error) {
    return unescaped;
  }
}

function readJson(value: string | undefined, label: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`[firebase-admin] failed to parse ${label}`, (error as Error).message);
    return null;
  }
}

function readJsonFile(filePath: string | undefined): Record<string, unknown> | null {
  if (!filePath) return null;
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[firebase-admin] FIREBASE_SERVICE_ACCOUNT_PATH not found: ${filePath}`);
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[firebase-admin] failed to read FIREBASE_SERVICE_ACCOUNT_PATH', (error as Error).message);
    return null;
  }
}

function resolveProjectIdFromObject(candidate: Record<string, unknown> | null): string | null {
  if (!candidate) return null;
  const projectId = (candidate.project_id ?? candidate.projectId ?? candidate.projectID ?? candidate.project) as
    | string
    | undefined;
  if (projectId && projectId.trim()) {
    return projectId.trim();
  }
  return null;
}

function resolveProjectIdFromEnv(): string | null {
  for (const key of candidateProjectEnvKeys) {
    const value = process.env[key];
    if (value && value.trim()) {
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
}

function applyProjectIdEnv(projectId: string | null | undefined) {
  if (!projectId || !projectId.trim()) return;
  const value = projectId.trim();
  try {
    if (!process.env.FIREBASE_PROJECT_ID) process.env.FIREBASE_PROJECT_ID = value;
    if (!process.env.GOOGLE_CLOUD_PROJECT) process.env.GOOGLE_CLOUD_PROJECT = value;
    if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = value;
    if (!process.env.GCP_PROJECT) process.env.GCP_PROJECT = value;
  } catch (error) {
    // ignore failures (read-only env)
  }
}

function coerceServiceAccount(candidate: Record<string, unknown> | null): ServiceAccount | null {
  if (!candidate) return null;
  const projectId = resolveProjectIdFromObject(candidate) ?? resolveProjectIdFromEnv() ?? undefined;
  const clientEmail = (candidate.client_email ?? candidate.clientEmail ?? process.env.FIREBASE_CLIENT_EMAIL) as
    | string
    | undefined;
  const privateKeySource =
    candidate.private_key ?? candidate.privateKey ?? process.env.FIREBASE_PRIVATE_KEY ?? null;
  const privateKey = normalizePrivateKey(privateKeySource);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function resolveServiceAccount(): ServiceAccount | null {
  const fromJson = coerceServiceAccount(
    readJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'FIREBASE_SERVICE_ACCOUNT_JSON'),
  );
  if (fromJson) return fromJson;

  const fromBase64 = coerceServiceAccount(
    readJson(
      (() => {
        const value = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
        if (!value) return undefined;
        try {
          return Buffer.from(value, 'base64').toString('utf8');
        } catch (error) {
          console.warn('[firebase-admin] failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64', (error as Error).message);
          return undefined;
        }
      })(),
      'FIREBASE_SERVICE_ACCOUNT_BASE64',
    ),
  );
  if (fromBase64) return fromBase64;

  const fromPath = coerceServiceAccount(readJsonFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
  if (fromPath) return fromPath;

  return coerceServiceAccount({
    projectId: resolveProjectIdFromEnv() ?? undefined,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  });
}

function initializeFirebase(): FirebaseResources {
  try {
    if (!getApps().length) {
      const serviceAccount = resolveServiceAccount();
      const resolvedProjectId = serviceAccount?.projectId ?? resolveProjectIdFromEnv() ?? undefined;
      const databaseURL = process.env.FIREBASE_DATABASE_URL;

      if (serviceAccount) {
        applyProjectIdEnv(serviceAccount.projectId);
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.projectId,
          databaseURL,
        });
      } else {
        const baseOptions: Parameters<typeof initializeApp>[0] = {};
        if (resolvedProjectId) baseOptions.projectId = resolvedProjectId;
        if (databaseURL) baseOptions.databaseURL = databaseURL;

        let initialized = false;
        try {
          const credential = applicationDefault();
          initializeApp({
            ...baseOptions,
            credential,
          });
          initialized = true;
          console.warn('[firebase-admin] initialized with application default credentials');
        } catch (error) {
          console.warn('[firebase-admin] applicationDefault credentials unavailable', (error as Error).message);
        }

        if (!initialized) {
          initializeApp(baseOptions);
          if (resolvedProjectId) {
            console.warn('[firebase-admin] initialized with project ID only (no explicit credentials)');
          } else {
            console.warn('[firebase-admin] initialized without explicit project ID; Firestore will be disabled if unavailable');
          }
        }
      }
    }

    const app = getApps()[0] ?? null;
    let db: Firestore | null = null;
    let realtimeDb: Database | null = null;
    if (app) {
      db = getFirestore(app);
      realtimeDb = getDatabase(app);
      const projectId =
        (app.options?.projectId as string | undefined) ?? resolveProjectIdFromEnv() ?? undefined;
      if (projectId) {
        applyProjectIdEnv(projectId);
      } else {
        console.warn('[firebase-admin] project ID could not be resolved; disabling Firestore access to avoid runtime errors.');
        db = null;
        realtimeDb = null;
      }
    }

    return { app, db, realtimeDb };
  } catch (error) {
    console.warn('[firebase-admin] failed to initialize app', (error as Error).message);
    return { app: null, db: null, realtimeDb: null };
  }
}

export function getFirebaseAdmin(): FirebaseResources {
  if (!cached) {
    cached = initializeFirebase();
  }
  return cached;
}

const resources = getFirebaseAdmin();

export const app = resources.app;
export const db = resources.db;
export const realtimeDb = resources.realtimeDb;
