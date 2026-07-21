import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { api, Field } from './hubShared';

export function HubAuthScreen({ auth, inviteToken }) {
  const [invite, setInvite] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sharedDocument = new URLSearchParams(window.location.search).has('doc');

  useEffect(() => {
    if (!inviteToken) return;
    api(`/api/hub/profile?invite=${encodeURIComponent(inviteToken)}`)
      .then((data) => {
        setInvite(data.invite);
        setEmail(data.invite.email || '');
      })
      .catch((err) => setError(err.message));
  }, [inviteToken]);

  const signInWithGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      const destination = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      await auth.signInWithGoogle(destination);
    } catch (err) {
      setError(err.message || 'Google sign-in is unavailable');
      setBusy(false);
    }
  };

  const signInWithPassword = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await auth.signInWithEmail(email, password);
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="hub-auth-screen">
      <div className="hub-auth-card">
        <div className="hub-brand">
          <ShieldCheck size={42} aria-hidden="true" />
          <div>
            <h1>Local Effort Hub</h1>
            <p>Staff calendar, messages, documents, and shift pickup.</p>
          </div>
        </div>

        {invite && (
          <div className="hub-notice">
            Invite for {invite.email}. Continue with that Google account to accept it.
          </div>
        )}

        {sharedDocument && !invite && (
          <div className="hub-notice">
            Sign in with Google to open the shared Hub document. Your Hub access is checked before the document loads.
          </div>
        )}

        <button className="hub-primary-button hub-google-button" type="button" onClick={signInWithGoogle} disabled={busy}>
          <LogIn size={20} aria-hidden="true" />
          {busy ? 'Opening Google...' : 'Continue with Google'}
        </button>

        <p className="hub-help hub-auth-or">Use the Google account connected to your Hub profile.</p>

        {showPassword ? (
          <form onSubmit={signInWithPassword} className="hub-form hub-password-fallback">
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" minLength={8} required />
            </Field>
            <button className="hub-primary-button" type="submit" disabled={busy}>
              {busy ? 'Signing in...' : 'Sign in with password'}
            </button>
            <button className="hub-text-button" type="button" onClick={() => { setShowPassword(false); setError(''); }}>
              Back to Google sign-in
            </button>
          </form>
        ) : (
          <button className="hub-text-button" type="button" onClick={() => setShowPassword(true)}>
            Use an existing email and password instead
          </button>
        )}

        {error && <p className="hub-error">{error}</p>}
        <p className="hub-help">
          New staff and customer access is created by invitation. If the wrong Google account opens, choose another account on the Google screen.
        </p>
      </div>
    </main>
  );
}


export function HubPasswordRecovery({ auth }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await auth.updatePassword(password);
      window.location.replace('/hub');
    } catch (err) {
      setError(err.message || 'Unable to update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="hub-auth-screen">
      <div className="hub-auth-card">
        <div className="hub-brand">
          <ShieldCheck size={42} aria-hidden="true" />
          <div>
            <h1>Choose a new password</h1>
            <p>Use at least 8 characters.</p>
          </div>
        </div>
        <form onSubmit={submit} className="hub-form">
          <Field label="New password">
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Confirm new password">
            <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
          </Field>
          {error && <p className="hub-error">{error}</p>}
          <button className="hub-primary-button" type="submit" disabled={busy}>
            {busy ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </main>
  );
}


export function ProfileSetup({ accessToken, inviteToken, onDone, user }) {
  const [invite, setInvite] = useState(null);
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '',
  );
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) return;
    api(`/api/hub/profile?invite=${encodeURIComponent(inviteToken)}`)
      .then((data) => {
        setInvite(data.invite);
        setDisplayName(data.invite.displayNameHint || '');
      })
      .catch((err) => setError(err.message));
  }, [inviteToken]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api('/api/hub/profile', accessToken, {
        method: 'POST',
        body: JSON.stringify({ inviteToken, displayName, title }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="hub-auth-screen">
      <div className="hub-auth-card">
        <h1>Finish Hub Profile</h1>
        {invite && <p className="hub-help">Invite access: {invite.accessLevel}</p>}
        <form className="hub-form" onSubmit={submit}>
          <Field label="Display name">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </Field>
          <Field label="Role or title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          {error && <p className="hub-error">{error}</p>}
          <button className="hub-primary-button" type="submit">Enter Hub</button>
        </form>
      </div>
    </main>
  );
}


export function HubAccessRequired({ auth }) {
  return (
    <main className="hub-auth-screen">
      <div className="hub-auth-card">
        <div className="hub-brand">
          <ShieldCheck size={42} aria-hidden="true" />
          <div>
            <h1>Hub access not found</h1>
            <p>You are signed in as {auth.user?.email}.</p>
          </div>
        </div>
        <p className="hub-help">
          This Google account does not have a Hub profile or matching invitation. Sign out and choose the invited account, or ask a Local Effort admin to check your access.
        </p>
        <button className="hub-primary-button" type="button" onClick={auth.signOut}>
          <LogOut size={18} aria-hidden="true" /> Sign out and choose another account
        </button>
      </div>
    </main>
  );
}

