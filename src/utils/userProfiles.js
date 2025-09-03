// Lightweight helpers around Firestore to store a user's assigned Meal Prep client.
// If Firestore isn't configured, these become no-ops returning null.

import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function saveUserProfile(uid, data) {
  if (!db || !uid) return null;
  const ref = doc(db, 'userProfiles', uid);
  const payload = {
    uid,
    ...data,
    updatedAt: serverTimestamp ? serverTimestamp() : new Date(),
  };
  await setDoc(ref, payload, { merge: true });
  return payload;
}

export async function getUserProfile(uid) {
  if (!db || !uid) return null;
  const ref = doc(db, 'userProfiles', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
