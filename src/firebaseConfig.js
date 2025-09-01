// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Your web app's Firebase configuration, read from Vite env (fallback to REACT_APP_*)
const env = (typeof import.meta !== 'undefined' ? import.meta.env : {}) || {};
const firebaseConfig = {
  apiKey: env.VITE_API_KEY || env.VITE_FIREBASE_API_KEY || env.REACT_APP_API_KEY,
  authDomain: env.VITE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN || env.REACT_APP_AUTH_DOMAIN,
  projectId: env.VITE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || env.REACT_APP_PROJECT_ID,
  storageBucket: env.VITE_STORAGE_BUCKET || env.VITE_FIREBASE_STORAGE_BUCKET || env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: env.VITE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.REACT_APP_MESSAGING_SENDER_ID,
  appId: env.VITE_APP_ID || env.VITE_FIREBASE_APP_ID || env.REACT_APP_APP_ID,
};

// Initialize Firebase
let app = null;
try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn('Firebase config missing — auth/comments disabled on client.');
  }
} catch (e) {
  console.warn('Failed to initialize Firebase app:', e && (e.message || e));
}

// Initialize Cloud Firestore and get a reference to the service
export const db = app ? getFirestore(app) : null;

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
