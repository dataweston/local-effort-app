// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
// Optional: App Check for protecting Firestore writes without auth
// This activates only if VITE_APPCHECK_SITE_KEY is provided
let initializeAppCheck, ReCaptchaV3Provider;
const loadAppCheck = () =>
  import('firebase/app-check')
    .then((m) => {
      initializeAppCheck = m.initializeAppCheck;
      ReCaptchaV3Provider = m.ReCaptchaV3Provider;
    })
    .catch(() => {
      // app-check is optional; ignore if not available
    });
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const getEnv = () => {
  const merged = {};
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    Object.assign(merged, import.meta.env);
  }
  if (typeof process !== 'undefined' && process.env) {
    Object.assign(merged, process.env);
  }
  if (typeof window !== 'undefined') {
    if (window.__ENV__ && typeof window.__ENV__ === 'object') {
      Object.assign(merged, window.__ENV__);
    }
    if (window.__APP_ENV__ && typeof window.__APP_ENV__ === 'object') {
      Object.assign(merged, window.__APP_ENV__);
    }
    if (window.__APP_CONFIG__ && typeof window.__APP_CONFIG__ === 'object') {
      Object.assign(merged, window.__APP_CONFIG__.firebase ?? {});
    }
    if (window.__FIREBASE_CONFIG__ && typeof window.__FIREBASE_CONFIG__ === 'object') {
      Object.assign(merged, window.__FIREBASE_CONFIG__);
    }
    if (window.__firebaseConfig && typeof window.__firebaseConfig === 'object') {
      Object.assign(merged, window.__firebaseConfig);
    }
  }
  return merged;
};

const pickConfigValue = (env, suffix, fallbackKeys = []) => {
  const potentialKeys = [
    `VITE_${suffix}`,
    `VITE_FIREBASE_${suffix}`,
    `NEXT_PUBLIC_FIREBASE_${suffix}`,
    `PUBLIC_FIREBASE_${suffix}`,
    `REACT_APP_FIREBASE_${suffix}`,
    `REACT_APP_${suffix}`,
    `FIREBASE_${suffix}`,
    `FIREBASE${suffix}`,
    ...fallbackKeys,
  ];
  for (const key of potentialKeys) {
    if (key in env && env[key]) {
      return env[key];
    }
  }
  return undefined;
};

const env = getEnv();

const firebaseConfig = {
  apiKey: pickConfigValue(env, 'API_KEY'),
  authDomain: pickConfigValue(env, 'AUTH_DOMAIN'),
  projectId: pickConfigValue(env, 'PROJECT_ID'),
  storageBucket: pickConfigValue(env, 'STORAGE_BUCKET'),
  messagingSenderId: pickConfigValue(env, 'MESSAGING_SENDER_ID'),
  appId: pickConfigValue(env, 'APP_ID'),
  databaseURL: pickConfigValue(env, 'DATABASE_URL', ['DATABASEURL']),
};

// Initialize Firebase
let app = null;
try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    // Initialize App Check if configured (no top-level await)
    const siteKey = env.VITE_APPCHECK_SITE_KEY || env.VITE_RECAPTCHA_SITE_KEY;
    if (siteKey) {
      loadAppCheck().then(() => {
        if (initializeAppCheck && ReCaptchaV3Provider) {
          try {
            initializeAppCheck(app, {
              provider: new ReCaptchaV3Provider(siteKey),
              isTokenAutoRefreshEnabled: true,
            });
          } catch (e) {
            console.warn('App Check initialization failed:', e && (e.message || e));
          }
        }
      });
    }
  } else {
    console.warn('Firebase config missing — auth/comments disabled on client.');
  }
} catch (e) {
  console.warn('Failed to initialize Firebase app:', e && (e.message || e));
}

// Initialize Cloud Firestore and get a reference to the service
export const db = app ? getFirestore(app) : null;
export const realtimeDb = app ? getDatabase(app) : null;

// Auth exports
export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export const signInWithGoogle = () => {
  if (!auth || !googleProvider) return Promise.reject(new Error('Auth not configured'));
  return signInWithPopup(auth, googleProvider);
};
export const signOutUser = () => {
  if (!auth) return Promise.resolve();
  return signOut(auth);
};

// Debug/info: expose which Firebase project the app is configured to use
export const firebaseProjectId = firebaseConfig.projectId || null;
