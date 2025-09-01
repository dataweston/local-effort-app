import React from 'react';
import { signInWithGoogle, signOutUser } from '../../firebaseConfig';

export function AuthButtons({ user }) {
  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <span className="text-sm text-gray-700">Hi, {user.displayName || user.email}</span>
          <button onClick={signOutUser} className="px-3 py-2 text-sm rounded border">Sign out</button>
        </>
      ) : (
        <button onClick={signInWithGoogle} className="px-3 py-2 text-sm rounded border">Sign in</button>
      )}
    </div>
  );
}
