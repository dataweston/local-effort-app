import React from 'react';
import { signInWithGoogle } from '../firebaseConfig';

export default function AuthPage() {
  const onGoogle = async () => {
    try { await signInWithGoogle(); } catch (e) { /* ignore */ }
  };
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <button onClick={onGoogle} className="px-4 py-2 rounded bg-black text-white">Continue with Google</button>
    </div>
  );
}
