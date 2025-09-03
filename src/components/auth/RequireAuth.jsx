import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { Link } from 'react-router-dom';

export function RequireAuth({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!auth || !user) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
        <p className="mb-4 text-gray-600">Please sign in to access this area.</p>
        <Link className="inline-block px-4 py-2 rounded bg-black text-white" to="/auth">Go to Sign In</Link>
      </div>
    );
  }
  return children;
}
