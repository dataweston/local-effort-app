import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Panel, Field } from './hubShared';
import { LocalistView } from './HubLocalistView';

export const SECURITY_MENU_PASSWORD = 'noodleboy.';

export const SECURITY_MENU_QR_TOKEN = 'neon-kitchen-security';

export const SECURITY_MENU_STORAGE_KEY = 'le:securityMenuAccess';

export const SECURITY_MENU_PROMPT = 'this menu is designed especially for the security team at Neon Kitchen. Please enter your password to order.';


export function SecurityPasswordGate({ children }) {
  const hasQrAccess = () => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('access') === SECURITY_MENU_QR_TOKEN
      || params.get('securityAccess') === SECURITY_MENU_QR_TOKEN;
  };
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(SECURITY_MENU_STORAGE_KEY) === '1' || hasQrAccess();
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasQrAccess()) return;
    window.sessionStorage.setItem(SECURITY_MENU_STORAGE_KEY, '1');
    setUnlocked(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('access');
    url.searchParams.delete('securityAccess');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (password === SECURITY_MENU_PASSWORD) {
      if (typeof window !== 'undefined') window.sessionStorage.setItem(SECURITY_MENU_STORAGE_KEY, '1');
      setUnlocked(true);
      setPassword('');
      setError('');
      return;
    }
    setError('Incorrect password.');
  };

  if (unlocked) return children;

  return (
    <div className="hub-menu-paper">
    <Panel title="Security at Neon" icon={ShieldCheck}>
      <form className="hub-form hub-security-password-form" onSubmit={submit}>
        <p className="hub-security-password-prompt">{SECURITY_MENU_PROMPT}</p>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <button className="hub-primary-button" type="submit" disabled={!password}>
          <ShieldCheck size={13} /> Enter menu
        </button>
        {error && <p className="hub-error">{error}</p>}
      </form>
    </Panel>
    </div>
  );
}


export function SecurityView() {
  return (
    <SecurityPasswordGate>
      <LocalistView
        area="security"
        menuName="Security at Neon"
        successName="Security at Neon"
        showChat={false}
      />
    </SecurityPasswordGate>
  );
}


export function SecurityGuestShell() {
  return (
    <div className="hub-app hub-app-guest">
      <main className="hub-main">
        <header className="hub-topbar">
          <div>
            <h1>Security at Neon</h1>
            <p>Security menu</p>
          </div>
        </header>
        <div className="hub-guest-content">
          <SecurityView />
        </div>
      </main>
    </div>
  );
}

