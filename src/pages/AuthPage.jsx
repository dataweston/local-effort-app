import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../firebaseConfig';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useAuthUser } from '../hooks/useAuthUser';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    // If returning from redirect, capture any auth result or error
    (async () => {
      if (!auth) return;
      try {
        const res = await getRedirectResult(auth);
        if (res && res.user) {
          navigate('/partner-portal/welcome', { replace: true });
        }
      } catch (e) {
        setError(cleanError(e));
      }
    })();
    if (!loading && user) {
      navigate('/partner-portal/welcome', { replace: true });
    }
  }, [user, loading, navigate]);

  const onGoogle = async () => {
    setError('');
    if (!auth || !googleProvider) {
      setError('Sign-in is unavailable. Missing Firebase configuration.');
      return;
    }
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/partner-portal/welcome', { replace: true });
    } catch (e) {
      const code = e && e.code ? String(e.code) : '';
      // Fallback to redirect for popup issues or iOS/Safari restrictions
      if (code.includes('popup-blocked') || code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (e2) {
          setError(cleanError(e2));
        }
      } else {
        setError(cleanError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm text-left">
          {error}
        </div>
      )}
      <button onClick={onGoogle} disabled={busy} className="px-4 py-2 rounded bg-black text-white disabled:opacity-60">
        {busy ? 'Working…' : 'Continue with Google'}
      </button>
      {!auth && (
        <p className="mt-4 text-sm text-gray-600">
          Tip: Add Firebase env vars on the server and authorize your Vercel domain in Firebase Auth.
        </p>
      )}
    </div>
  );
}

function cleanError(e) {
  if (!e) return 'Unexpected error.';
  const msg = e.message || String(e);
  // Shorten common Firebase messages
  return msg.replace(/^Firebase: /, '').replace(/\(auth\/[\w-]+\)\.?$/, '').trim();
}
