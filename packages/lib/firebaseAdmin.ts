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

function coerceServiceAccount(candidate: Record<string, unknown> | null): ServiceAccount | null {
  if (!candidate) return null;
  const projectId = (candidate.project_id ?? candidate.projectId ?? process.env.FIREBASE_PROJECT_ID) as
    | string
    | undefined;
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
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  });
}

function initializeFirebase(): FirebaseResources {
  try {
    if (!getApps().length) {
      const serviceAccount = resolveServiceAccount();
      const databaseURL = process.env.FIREBASE_DATABASE_URL;

      if (serviceAccount) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.projectId,
          databaseURL,
        });
      } else {
        try {
          initializeApp({
            credential: applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID,
            databaseURL,
          });
        } catch (error) {
          console.warn('[firebase-admin] applicationDefault credentials unavailable', (error as Error).message);
          initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
            databaseURL,
          });
        }
      }
    }

    const app = getApps()[0] ?? null;
    const db = app ? getFirestore(app) : null;
    const realtimeDb = app ? getDatabase(app) : null;

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
