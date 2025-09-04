import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { getUserProfile } from '../../utils/userProfiles';
import { hasAccess } from '../../config/partnerTools';
import { Link } from 'react-router-dom';

export function RequirePartnerAccess({ toolKey, children }) {
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      try {
        const profile = await getUserProfile(u.uid);
        setAllowed(hasAccess(profile, toolKey));
      } catch (e) {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [toolKey]);

  if (loading) return <div className="p-6 text-center">Loading…</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
        <p className="mb-4 text-gray-600">Please sign in to access partner tools.</p>
        <Link className="inline-block px-4 py-2 rounded bg-black text-white" to="/auth">Go to Sign In</Link>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Access denied</h2>
        <p className="mb-4 text-gray-600">Your account is not assigned to this tool.</p>
        <Link className="inline-block px-4 py-2 rounded border" to="/partner-portal">Back to Portal</Link>
      </div>
    );
  }
  return children;
}
