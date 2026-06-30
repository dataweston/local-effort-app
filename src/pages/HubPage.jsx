import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  CreditCard,
  FileText,
  Home,
  Inbox,
  LogIn,
  LogOut,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  ShieldCheck,
  ShoppingCart,
  Soup,
  Table,
  Upload,
  Utensils,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { GoogleCalendarSync } from '../components/weeklyplanner/GoogleCalendarSync';

const tabs = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'calendar', label: 'Calendar & Shifts', icon: CalendarDays },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'people', label: 'People', icon: UsersRound },
];

const mealPrepTab = { id: 'weeklyMealPrep', label: 'Weekly Meal Prep', icon: Soup };
const foodInputsTab = { id: 'foodInputs', label: 'Food Inputs', icon: Utensils };

const LOCALIST_CUSTOMER_OPTIONS = [
  { key: 'glutenFree', label: 'Gluten free' },
  { key: 'nutAllergy', label: 'Nut allergy' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'dairyFree', label: 'Dairy free' },
];

const LOCALIST_PICKUP_WINDOWS = [
  'Tuesday, 2pm-4pm',
  'Tuesday, 4pm-6pm',
  'Wednesday, 2pm-4pm',
  'Wednesday, 4pm-6pm',
];

const LOCALIST_ITEM_FLAG_LABELS = [
  ['glutenFree', 'Gluten free'],
  ['dairyFree', 'Dairy free'],
  ['containsPork', 'Contains pork'],
  ['containsNuts', 'Contains nuts'],
  ['containsDairy', 'Contains dairy'],
];

const SECURITY_MENU_PASSWORD = 'noodleboy.';
const SECURITY_MENU_QR_TOKEN = 'neon-kitchen-security';
const SECURITY_MENU_STORAGE_KEY = 'le:securityMenuAccess';
const SECURITY_MENU_PROMPT = 'this menu is designed especially for the security team at Neon Kitchen. Please enter your password to order.';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMoneyCents(cents) {
  const dollars = Number(cents || 0) / 100;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = String(value).split(':');
  const parsed = new Date();
  parsed.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function age(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 2) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function api(path, accessToken, options = {}) {
  const devApiRoot = import.meta.env.DEV && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';
  const res = await fetch(`${devApiRoot}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function localistId(prefix) {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`;
}

function localistIdentity() {
  if (typeof window === 'undefined') return { visitorId: localistId('visitor'), sessionId: localistId('session') };
  const storage = window.localStorage;
  let visitorId = storage.getItem('le:localistVisitorId');
  let sessionId = storage.getItem('le:localistSessionId');
  if (!visitorId) {
    visitorId = localistId('visitor');
    storage.setItem('le:localistVisitorId', visitorId);
  }
  if (!sessionId) {
    sessionId = localistId('session');
    storage.setItem('le:localistSessionId', sessionId);
  }
  return { visitorId, sessionId };
}

function localistTrackingContext() {
  if (typeof window === 'undefined') return { localistToken: '', entrySource: 'direct', path: '', referrer: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    localistToken: params.get('localist') || '',
    entrySource: params.get('shared') === '1' ? 'shared' : 'direct',
    path: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || '',
  };
}

function trackLocalistActivity(eventType, data = {}) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      eventType,
      occurredAt: new Date().toISOString(),
      ...localistIdentity(),
      ...localistTrackingContext(),
      ...data,
    };
    api('/api/hub/localist-activity', null, {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch (_err) {
    // Analytics must not block the ordering flow.
  }
}

function Panel({ title, icon: Icon, action, children }) {
  return (
    <section className="hub-panel">
      <div className="hub-panel-head">
        <div className="hub-panel-title">
          {Icon && <Icon size={15} aria-hidden="true" />}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="hub-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function HubAuthScreen({ auth, inviteToken }) {
  const [mode, setMode] = useState(inviteToken ? 'signup' : 'signin');
  const [invite, setInvite] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    api(`/api/hub/profile?invite=${encodeURIComponent(inviteToken)}`)
      .then((data) => {
        setInvite(data.invite);
        setEmail(data.invite.email || '');
        setDisplayName(data.invite.displayNameHint || '');
      })
      .catch((err) => setError(err.message));
  }, [inviteToken]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await auth.signUpWithEmail(email, password, { display_name: displayName });
        await auth.signInWithEmail(email, password);
      } else {
        await auth.signInWithEmail(email, password);
      }
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
            Invite for {invite.email}. Access: {invite.accessLevel}.
          </div>
        )}

        <form onSubmit={submit} className="hub-form">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required />
          </Field>
          {mode === 'signup' && (
            <>
              <Field label="Display name">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </Field>
              <Field label="Role or title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            </>
          )}
          {error && <p className="hub-error">{error}</p>}
          <button className="hub-primary-button" type="submit" disabled={busy}>
            <LogIn size={20} aria-hidden="true" />
            {busy ? 'Working...' : mode === 'signup' ? 'Create profile' : 'Sign in'}
          </button>
        </form>

        <button className="hub-text-button" type="button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          {mode === 'signup' ? 'I already have a Hub account' : 'I have an invite and need a profile'}
        </button>

        <p className="hub-help">
          Use email and password. Invite links control who can create staff, customer, or privileged profiles.
        </p>
      </div>
    </main>
  );
}

function ProfileSetup({ accessToken, inviteToken, onDone }) {
  const [invite, setInvite] = useState(null);
  const [displayName, setDisplayName] = useState('');
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

const HOME_NOTEPAD_TEMPLATE = '#in season#\n- \n\n#events#\n- \n\n#important updates#\n- \n';

function HomeNotepad({ accessToken }) {
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview' | 'canon'
  const [canon, setCanon] = useState(null);
  const [canonBusy, setCanonBusy] = useState(false);
  const lastSavedRef = useRef('');

  // Parse the notepad's #in season# options into canonical dish matches.
  // commit=true creates any missing dishes in the knowledge graph.
  const loadCanon = useCallback(async (commit = false) => {
    setCanonBusy(true);
    try {
      const res = await api('/api/hub/house-notepad-canon', accessToken, commit ? { method: 'POST', body: '{}' } : undefined);
      setCanon(res);
      if (commit) {
        const created = (res.sections?.inSeason || []).filter((d) => d.created).length;
        setStatus(created ? `Canonicalized · ${created} new dish${created === 1 ? '' : 'es'} created` : 'Canonicalized · all matched');
      }
    } catch (err) {
      setStatus(err.message || 'Unable to canonicalize.');
    } finally {
      setCanonBusy(false);
    }
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api('/api/hub/home-notepad', accessToken);
        if (cancelled) return;
        const next = res.note?.body || HOME_NOTEPAD_TEMPLATE;
        setBody(next);
        lastSavedRef.current = next;
      } catch (err) {
        if (!cancelled) setStatus(err.message || 'Unable to load notepad.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    if (!loaded || body === lastSavedRef.current) return undefined;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/home-notepad', accessToken, {
          method: 'POST',
          body: JSON.stringify({ body }),
        });
        lastSavedRef.current = saved.note?.body ?? body;
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, body, loaded]);

  const inSeason = canon?.sections?.inSeason || [];

  return (
    <Panel
      title="House Notepad"
      icon={FileText}
      action={(
        <div className="hub-button-row">
          <button className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>Edit</button>
          <button className={mode === 'preview' ? 'is-active' : ''} onClick={() => setMode('preview')}>Preview</button>
          <button
            className={mode === 'canon' ? 'is-active' : ''}
            onClick={() => { setMode('canon'); loadCanon(false); }}
          >
            <CheckCircle2 size={13} /> Canon
          </button>
        </div>
      )}
    >
      <div className="hub-wordpad-tabs">
        <span>{status || 'Shared on every Today tab. In season, events, and important updates.'}</span>
      </div>
      {mode === 'preview' && <MarkdownPreview body={body || HOME_NOTEPAD_TEMPLATE} />}
      {mode === 'edit' && (
        <textarea
          className="hub-wordpad"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          spellCheck="true"
          placeholder={HOME_NOTEPAD_TEMPLATE}
        />
      )}
      {mode === 'canon' && (
        <div className="hub-canon">
          <div className="hub-button-row" style={{ padding: '6px 0' }}>
            <span className="hub-empty" style={{ margin: 0, flex: 1 }}>
              <strong>#in season#</strong> in-stock options, matched to canonical dishes.
            </span>
            <button onClick={() => loadCanon(true)} disabled={canonBusy}>
              {canonBusy ? 'Working…' : 'Canonicalize (create missing)'}
            </button>
          </div>
          {inSeason.length > 0 ? (
            <ul className="hub-rollup-packaging">
              {inSeason.map((d, i) => (
                <li key={`${d.dishEntityId || d.text}-${i}`} className={d.resolved ? '' : 'is-unresolved'}>
                  {d.resolved
                    ? <CheckCircle2 size={14} className="hub-rollup-ok" aria-label="Matched" />
                    : <span className="hub-rollup-qty" aria-hidden>•</span>}
                  <span>
                    {d.text}
                    {d.created && <em className="hub-rollup-canon"> (new)</em>}
                    {!d.created && d.resolved && d.canonicalName
                      && d.canonicalName.toLowerCase() !== d.text.toLowerCase()
                      && <em className="hub-rollup-canon"> → {d.canonicalName}</em>}
                  </span>
                  {!d.resolved && <span className="hub-pill">{d.candidates?.length ? 'review' : 'new'}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="hub-empty">{canonBusy ? 'Loading…' : 'No #in season# options yet.'}</p>
          )}
        </div>
      )}
    </Panel>
  );
}

// Customer's home: their plan, this week's menu (with thumbs feedback), editable
// profile, and a read-only intake summary. Replaces the old Subscriber Portal
// Dashboard / This Week / Profile / Past-Menus tabs. Strictly their own data.
function CustomerHomeView({ accessToken, setTab }) {
  const [profileData, setProfileData] = useState(null);
  const [week, setWeek] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w] = await Promise.all([
        api('/api/hub/customer-profile', accessToken),
        api('/api/hub/customer-week', accessToken),
      ]);
      setProfileData(p);
      setForm({
        name: p?.customer?.name || '',
        householdSize: p?.profile?.householdSize || '',
        phone: p?.profile?.phone || '',
        address: p?.profile?.address || '',
        deliveryNotes: p?.profile?.deliveryNotes || '',
      });
      setWeek(w);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await api('/api/hub/customer-profile', accessToken, { method: 'PUT', body: JSON.stringify(form) });
      setSaved(true);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const sendFeedback = async (dishId, thumbsUp) => {
    if (!week?.menuWeek) return;
    try {
      await api('/api/hub/customer-week', accessToken, {
        method: 'POST',
        body: JSON.stringify({ dishId, menuWeekId: week.menuWeek.id, thumbsUp }),
      });
      setWeek((prev) => ({
        ...prev,
        items: prev.items.map((it) => it.dishId === dishId
          ? { ...it, feedback: { ...(it.feedback || {}), thumbsUp } }
          : it),
      }));
    } catch { /* ignore */ }
  };

  if (loading) return <p className="hub-empty">Loading your meal prep…</p>;
  const plan = profileData?.plan;
  const survey = profileData?.intakeSurvey;

  return (
    <div className="hub-grid">
      {plan && (
        <Panel title="Your Plan" icon={Soup} action={<button onClick={() => setTab('weeklyMealPrep')}>Weekly Meal Prep</button>}>
          <div className="hub-list">
            {plan.items.map((item) => (
              <div className="hub-row" key={item.key}>
                <strong>{item.label}</strong>
                <span>
                  {item.open ? 'as needed' : item.qty != null ? `${item.qty}/week` : ''}
                  {item.serves ? ` · serves ${item.serves.adults} adult${item.serves.kids ? ` + ${item.serves.kids} kids` : ''}` : ''}
                  {item.style ? ` · ${item.style}` : ''}
                </span>
              </div>
            ))}
            {plan.billing && <div className="hub-row"><strong>Billing</strong><span>{plan.billing.cadence} · food {plan.billing.fulfillment}</span></div>}
          </div>
        </Panel>
      )}

      <Panel title="This Week's Menu" icon={Utensils}>
        {!week?.menuWeek && <p className="hub-empty">No menu published yet.</p>}
        {week?.menuWeek && week.items.length === 0 && <p className="hub-empty">No dishes on this week's menu.</p>}
        <div className="hub-list">
          {(week?.items || []).map((item) => (
            <div className="hub-row" key={item.dishId} style={{ alignItems: 'flex-start' }}>
              <div>
                <strong>{item.title}</strong>
                {item.description && <span>{item.description}</span>}
                {item.allergens?.length > 0 && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Allergens: {item.allergens.join(', ')}</span>}
              </div>
              <div className="hub-button-row">
                <button
                  className={item.feedback?.thumbsUp === true ? 'is-active' : ''}
                  title="Thumbs up"
                  onClick={() => sendFeedback(item.dishId, true)}
                >👍</button>
                <button
                  className={item.feedback?.thumbsUp === false ? 'is-active' : ''}
                  title="Thumbs down"
                  onClick={() => sendFeedback(item.dishId, false)}
                >👎</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Your Info" icon={UsersRound}>
        {form && (
          <form onSubmit={saveProfile} className="hub-form">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Household Size<input value={form.householdSize} onChange={(e) => setForm({ ...form, householdSize: e.target.value })} /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <label>Delivery Notes<textarea value={form.deliveryNotes} onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })} /></label>
            <div className="hub-button-row">
              <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
              {saved && <span className="hub-pill">Saved</span>}
            </div>
          </form>
        )}
      </Panel>

      {survey && typeof survey === 'object' && (
        <Panel title="Intake Survey" icon={FileText}>
          <div className="hub-list">
            {Object.entries(survey).map(([key, val]) => (
              <div className="hub-row" key={key}>
                <strong>{key}</strong>
                <span>{Array.isArray(val) ? val.join(', ') : String(val)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function QuickCapturePanel({ accessToken }) {
  const [text, setText] = useState('');
  const [customer, setCustomer] = useState(null);
  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  // Customer search (optional — picking one removes the hardest parse: "who?")
  useEffect(() => {
    if (!custQuery.trim() || custQuery.trim().length < 2 || !accessToken) { setCustResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: custQuery.trim(), type: 'Customer', limit: '6' });
        const data = await api(`/api/brain/entities?${params}`, accessToken);
        if (!cancelled) setCustResults(data.entities || []);
      } catch { if (!cancelled) setCustResults([]); }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [custQuery, accessToken]);

  function reset() { setText(''); setPreview(null); setError(''); setDone(null); }

  async function runPreview() {
    setBusy(true); setError(''); setDone(null);
    try {
      const data = await api('/api/brain/capture', accessToken, {
        method: 'POST',
        body: JSON.stringify({ text, customerId: customer?.id || null, commit: false }),
      });
      setPreview(data);
    } catch (e) { setError(e.message || 'Could not parse'); }
    finally { setBusy(false); }
  }

  async function commit({ force = false } = {}) {
    setBusy(true); setError('');
    try {
      const data = await api('/api/brain/capture', accessToken, {
        method: 'POST',
        body: JSON.stringify({ text, customerId: customer?.id || null, commit: true, force }),
      });
      if (data.committed) setDone({ kind: 'applied', detail: data.applied, preview: data.preview });
      else if (data.capturedToInbox) setDone({ kind: 'inbox', preview: data.preview });
      else setDone({ kind: 'other' });
      setText(''); setPreview(null);
    } catch (e) { setError(e.message || 'Could not apply'); }
    finally { setBusy(false); }
  }

  const medical = preview?.fields?.corrections?.some((c) => c.severity === 'medical');

  return (
    <Panel title="Quick Capture" icon={Sparkles}>
      {customer ? (
        <div className="hub-row" style={{ alignItems: 'center', gap: 8 }}>
          <strong>For: {customer.name}</strong>
          <button onClick={() => setCustomer(null)} style={{ marginLeft: 'auto' }}>change</button>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <input
            placeholder="Customer (optional — sharpens parsing)"
            value={custQuery}
            onChange={(e) => setCustQuery(e.target.value)}
          />
          {custResults.length > 0 && (
            <div className="hub-list" style={{ maxHeight: 120, overflowY: 'auto' }}>
              {custResults.map((c) => (
                <button key={c.id} className="hub-row" onClick={() => { setCustomer(c); setCustQuery(''); setCustResults([]); }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <textarea
        className="hub-wordpad"
        style={{ minHeight: 56 }}
        rows={2}
        placeholder='e.g. "no legumes this month" · "price: carrots $1.20/lb from CPW" · "task: call flour vendor"'
        value={text}
        onChange={(e) => { setText(e.target.value); setPreview(null); setDone(null); }}
      />

      <div className="hub-button-row" style={{ marginTop: 6 }}>
        <button onClick={runPreview} disabled={busy || !text.trim()}>{busy ? '…' : 'Preview'}</button>
        {preview && !preview.needsConfirm && (
          <button onClick={() => commit()} disabled={busy}>Apply</button>
        )}
        {text && <button onClick={reset} disabled={busy}>Clear</button>}
      </div>

      {error && <p className="hub-empty" style={{ color: 'var(--brand-rose, #b00)' }}>{error}</p>}

      {preview && (
        <div className="hub-canon" style={{ marginTop: 8 }}>
          <div className="hub-row">
            <strong>{preview.intent.replace(/_/g, ' ')}</strong>
            <span>{Math.round((preview.confidence || 0) * 100)}% · {preview.via}</span>
          </div>
          <p style={{ margin: '4px 0' }}>{preview.preview?.summary}</p>
          {preview.needsConfirm && (
            <>
              <p className="hub-empty">
                {medical ? '⚠ Medical/allergy — confirm carefully.'
                  : preview.needsConfirmReason === 'customer-unresolved' ? 'Customer not matched — pick one above or confirm anyway.'
                  : 'Lower confidence — confirm to apply.'}
              </p>
              <div className="hub-button-row">
                <button onClick={() => commit({ force: true })} disabled={busy || (preview.needsConfirmReason === 'customer-unresolved' && !customer)}>
                  Confirm & apply
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {done && (
        <div className="hub-canon" style={{ marginTop: 8 }}>
          {done.kind === 'applied' && <p>✓ Applied: {done.preview?.summary}</p>}
          {done.kind === 'inbox' && <p>↪ Captured to brain inbox for review: {done.preview?.summary}</p>}
          {done.kind === 'other' && <p>Captured.</p>}
        </div>
      )}
    </Panel>
  );
}

function TodayView({ calendar, docs, conversations, shifts, setTab, accessToken, isCustomer }) {
  const todaysItems = calendar.filter((item) => String(item.startsAt || '').startsWith(todayIso()));
  const openShifts = shifts.filter((shift) => shift.open).slice(0, 4);
  const recentDocs = docs.slice(0, 4);
  const recentChats = conversations.slice(0, 4);

  return (
    <div className="hub-grid">
      {!isCustomer && accessToken && <HomeNotepad accessToken={accessToken} />}
      {!isCustomer && accessToken && <QuickCapturePanel accessToken={accessToken} />}
      <Panel title="Today" icon={Home} action={<button onClick={() => setTab('calendar')}>Open calendar</button>}>
        <div className="hub-list">
          {todaysItems.length === 0 && <p className="hub-empty">No scheduled items today.</p>}
          {todaysItems.map((item) => (
            <div className="hub-row" key={item.id}>
              <strong>{item.title}</strong>
              <span>{formatTime(String(item.startsAt || '').slice(11, 16))} {item.subtitle || ''}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Open Shifts" icon={ClipboardList} action={<button onClick={() => setTab('calendar')}>View shifts</button>}>
        <div className="hub-list">
          {openShifts.length === 0 && <p className="hub-empty">No open shifts.</p>}
          {openShifts.map((shift) => (
            <div className="hub-row" key={shift.id}>
              <strong>{shift.title}</strong>
              <span>{formatDate(shift.date)} at {formatTime(shift.startTime)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Recent Chat" icon={MessageSquare} action={<button onClick={() => setTab('chat')}>Open chat</button>}>
        <div className="hub-list">
          {recentChats.map((thread) => (
            <div className="hub-row" key={thread.id || thread.objectId}>
              <strong>{thread.title}</strong>
              <span>{thread.preview || 'No messages yet'}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Documents" icon={FileText} action={<button onClick={() => setTab('docs')}>Open docs</button>}>
        <div className="hub-list">
          {recentDocs.length === 0 && <p className="hub-empty">No documents published.</p>}
          {recentDocs.map((doc) => (
            <div className="hub-row" key={doc.id}>
              <strong>{doc.title}</strong>
              <span>{doc.category} / {doc.visibility}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function CalendarView({ accessToken, profile, isPrivileged }) {
  const [anchor, setAnchor] = useState(todayIso());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickView, setQuickView] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/api/hub/calendar?view=week&date=${anchor}`, accessToken);
      setItems(data.objects || []);
    } finally {
      setLoading(false);
    }
  }, [accessToken, anchor]);

  useEffect(() => { load(); }, [load]);

  const visibleItems = useMemo(() => {
    const viewerName = String(profile?.displayName || '').toLowerCase();
    if (quickView === 'available') return items.filter((item) => item.metadata?.optional || item.subtitle === null);
    if (quickView === 'mine') {
      return items.filter((item) => {
        const people = item.metadata?.people || [];
        return people.some((person) => String(person || '').toLowerCase() === viewerName);
      });
    }
    return items;
  }, [items, profile, quickView]);

  const westonBlocks = useMemo(() => {
    return items.filter((item) => {
      const text = `${item.title || ''} ${item.subtitle || ''} ${item.metadata?.category || ''}`.toLowerCase();
      const people = item.metadata?.people || [];
      return people.some((person) => String(person || '').toLowerCase().includes('weston')) &&
        (text.includes('kitchen time') || text.includes('office hours'));
    });
  }, [items]);

  const grouped = useMemo(() => {
    const result = new Map();
    visibleItems.forEach((item) => {
      const date = String(item.startsAt || item.metadata?.date || '').slice(0, 10) || anchor;
      result.set(date, [...(result.get(date) || []), item]);
    });
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems, anchor]);

  return (
    <div className="hub-schedule-stack">
    <Panel
      title="Calendar"
      icon={CalendarDays}
      action={(
        <div className="hub-button-row">
          <button onClick={() => setAnchor(addDays(anchor, -7))}>Previous</button>
          <button onClick={() => setAnchor(todayIso())}>Today</button>
          <button onClick={() => setAnchor(addDays(anchor, 7))}>Next</button>
          <button className={quickView === 'mine' ? 'is-active' : ''} onClick={() => setQuickView('mine')}>My shifts</button>
          <button className={quickView === 'available' ? 'is-active' : ''} onClick={() => setQuickView('available')}>Available shifts</button>
          <button className={quickView === 'all' ? 'is-active' : ''} onClick={() => setQuickView('all')}>All events</button>
          <GoogleCalendarSync accessToken={accessToken} weekStart={anchor} />
          <button onClick={load}><RefreshCw size={13} /></button>
        </div>
      )}
    >
      {loading && <p className="hub-empty">Loading calendar...</p>}
      <div className="hub-calendar-shell">
        <div className="hub-calendar-list">
          {grouped.map(([date, dayItems]) => (
            <section className="hub-day" key={date}>
              <h3>{formatDate(date)}</h3>
              {dayItems.map((item) => (
                <div className="hub-calendar-item" key={item.id}>
                  <span>{formatTime(String(item.startsAt || '').slice(11, 16)) || 'Any time'}</span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle || item.type} {item.metadata?.optional ? '/ open shift' : ''}</small>
                </div>
              ))}
            </section>
          ))}
          {!loading && grouped.length === 0 && <p className="hub-empty">No calendar items this week.</p>}
        </div>
        <aside className="hub-calendar-widget">
          <strong>Weston kitchen time</strong>
          <strong>Weston office hours</strong>
          {westonBlocks.length === 0 ? (
            <span>Waiting on weeklydemo categories.</span>
          ) : westonBlocks.map((item) => (
            <div key={item.id}>
              <span>{formatDate(String(item.startsAt || item.metadata?.date || '').slice(0, 10))}</span>
              <small>{formatTime(String(item.startsAt || '').slice(11, 16)) || 'Any time'} / {item.title}</small>
            </div>
          ))}
        </aside>
      </div>
    </Panel>
    <ShiftsView accessToken={accessToken} profile={profile} isPrivileged={isPrivileged} />
    </div>
  );
}

function ChatView({ accessToken, people, currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');

  const loadConversations = useCallback(async () => {
    const data = await api('/api/hub/conversations', accessToken);
    setConversations(data.conversations || []);
    if (!selected && data.conversations?.length) setSelected(data.conversations[0]);
  }, [accessToken, selected]);

  const loadMessages = useCallback(async (thread) => {
    if (!thread) return;
    if (!thread.id) {
      const data = await api('/api/hub/conversations', accessToken, {
        method: 'POST',
        body: JSON.stringify({ mode: 'general', action: 'ensure' }),
      });
      setSelected(data.thread);
      return;
    }
    const data = await api(`/api/hub/conversations?threadId=${encodeURIComponent(thread.id)}`, accessToken);
    setMessages(data.messages || []);
  }, [accessToken]);

  useEffect(() => { loadConversations().catch(() => {}); }, [loadConversations]);
  useEffect(() => { loadMessages(selected).catch(() => {}); }, [selected, loadMessages]);

  const startDm = async (person) => {
    const data = await api('/api/hub/conversations', accessToken, {
      method: 'POST',
      body: JSON.stringify({ mode: 'dm', targetUserId: person.userId, action: 'ensure' }),
    });
    setSelected(data.thread);
    await loadConversations();
  };

  const send = async (event) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    const isDm = selected?.objectType === 'hub_dm';
    const targetUserId = isDm ? selected.objectId.split(':').find((id) => id && id !== currentUserId) : undefined;
    await api('/api/hub/conversations', accessToken, {
      method: 'POST',
      body: JSON.stringify({ mode: isDm ? 'dm' : 'general', targetUserId, body: text }),
    });
    setBody('');
    await loadConversations();
    await loadMessages(selected);
  };

  return (
    <div className="hub-chat-layout">
      <Panel title="Chats" icon={MessageSquare}>
        <div className="hub-list">
          {conversations.map((thread) => (
            <button className={`hub-row hub-row-button ${selected?.id === thread.id ? 'is-active' : ''}`} key={thread.id || thread.objectId} onClick={() => setSelected(thread)}>
              <strong>{thread.title}</strong>
              <span>{thread.preview || 'No messages yet'} {thread.lastMessageAt ? `/ ${age(thread.lastMessageAt)}` : ''}</span>
            </button>
          ))}
        </div>
        <h3 className="hub-subhead">Message a person</h3>
        <div className="hub-list">
          {people.map((person) => (
            <button className="hub-row hub-row-button" key={person.id} onClick={() => startDm(person)}>
              <strong>{person.displayName}</strong>
              <span>{person.title || person.accessLevel}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={selected?.title || 'General'} icon={MessageSquare}>
        <div className="hub-message-list">
          {messages.length === 0 && <p className="hub-empty">No messages yet.</p>}
          {messages.map((message) => (
            <div className="hub-message" key={message.id}>
              <strong>{message.senderRole || 'staff'} / {age(message.createdAt)}</strong>
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <form className="hub-compose" onSubmit={send}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a clear update..." />
          <button type="submit"><Send size={13} aria-hidden="true" /> Send</button>
        </form>
      </Panel>
    </div>
  );
}

function DocsView({ accessToken, docs, reloadDocs, isPrivileged }) {
  const [selectedId, setSelectedId] = useState(docs[0]?.id || null);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState({ title: '', summary: '', body: '', category: 'sop', visibility: 'staff' });

  useEffect(() => {
    if (!selectedId) return;
    api(`/api/hub/docs?id=${encodeURIComponent(selectedId)}`, accessToken)
      .then((data) => setSelected(data.document))
      .catch(() => setSelected(null));
  }, [accessToken, selectedId]);

  useEffect(() => {
    if (!selectedId && docs[0]) setSelectedId(docs[0].id);
  }, [docs, selectedId]);

  const createDoc = async (event) => {
    event.preventDefault();
    const data = await api('/api/hub/docs', accessToken, {
      method: 'POST',
      body: JSON.stringify(draft),
    });
    setDraft({ title: '', summary: '', body: '', category: 'sop', visibility: 'staff' });
    await reloadDocs();
    setSelectedId(data.document.id);
  };

  return (
    <div className="hub-doc-layout">
      <Panel title="Documents" icon={FileText}>
        <div className="hub-list">
          {docs.length === 0 && <p className="hub-empty">No documents yet.</p>}
          {docs.map((doc) => (
            <button className={`hub-row hub-row-button ${selectedId === doc.id ? 'is-active' : ''}`} key={doc.id} onClick={() => setSelectedId(doc.id)}>
              <strong>{doc.title}</strong>
              <span>{doc.category} / {doc.visibility}</span>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={selected?.title || 'Document'} icon={FileText}>
        {selected ? (
          <article className="hub-doc-body">
            <p className="hub-doc-summary">{selected.summary}</p>
            <pre>{selected.body}</pre>
          </article>
        ) : (
          <p className="hub-empty">Choose a document.</p>
        )}
      </Panel>
      {isPrivileged && (
        <Panel title="Publish Document" icon={Plus}>
          <form className="hub-form" onSubmit={createDoc}>
            <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
            <Field label="Summary"><input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
            <Field label="Category"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
            <Field label="Visibility">
              <select value={draft.visibility} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })}>
                <option value="staff">Staff</option>
                <option value="privileged">Privileged</option>
              </select>
            </Field>
            <Field label="Body"><textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={8} required /></Field>
            <button className="hub-primary-button" type="submit"><Plus size={13} /> Publish</button>
          </form>
        </Panel>
      )}
    </div>
  );
}

function PeopleView({ people, onMessage }) {
  return (
    <Panel title="People" icon={UsersRound}>
      <div className="hub-people-grid">
        {people.map((person) => (
          <div className="hub-person" key={person.id}>
            <strong>{person.displayName}</strong>
            <span>{person.title || person.accessLevel}</span>
            <small>{person.email}</small>
            <button onClick={() => onMessage(person)}><MessageSquare size={13} /> Message</button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ShiftsView({ accessToken, profile, isPrivileged }) {
  const [from, setFrom] = useState(todayIso());
  const [shifts, setShifts] = useState([]);
  const [draft, setDraft] = useState({ title: '', date: todayIso(), startTime: '09:00', endTime: '' });

  const load = useCallback(async () => {
    const data = await api(`/api/hub/shifts?from=${from}&to=${addDays(from, 14)}`, accessToken);
    setShifts(data.shifts || []);
  }, [accessToken, from]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const claim = async (shift) => {
    await api('/api/hub/shifts', accessToken, {
      method: 'POST',
      body: JSON.stringify({ action: 'claim', plannerCardId: shift.id }),
    });
    await load();
  };

  const putUp = async (shift) => {
    await api('/api/hub/shifts', accessToken, {
      method: 'POST',
      body: JSON.stringify({ action: 'putUp', plannerCardId: shift.id }),
    });
    await load();
  };

  const createShift = async (event) => {
    event.preventDefault();
    await api('/api/hub/shifts', accessToken, { method: 'POST', body: JSON.stringify(draft) });
    setDraft({ title: '', date: todayIso(), startTime: '09:00', endTime: '' });
    await load();
  };

  const viewerName = profile?.displayName || '';

  const shiftAction = (shift) => {
    const mine = shift.people.includes(viewerName);
    if (shift.open && !mine) {
      return <button className="hub-shift-action" onClick={() => claim(shift)}><CheckCircle2 size={14} /> Pick up</button>;
    }
    if (shift.open) {
      return <span className="hub-pill">Up for grabs</span>;
    }
    if (mine || isPrivileged) {
      return <button className="hub-shift-action" onClick={() => putUp(shift)}><Upload size={14} /> Put up for pickup</button>;
    }
    return <span className="hub-pill">Covered</span>;
  };

  return (
    <div className="hub-grid">
      <Panel
        title="Staff Shifts"
        icon={ClipboardList}
        action={<button onClick={() => setFrom(addDays(from, 14))}>Next 2 weeks</button>}
      >
        <div className="hub-list">
          {shifts.length === 0 && <p className="hub-empty">No shifts in this window.</p>}
          {shifts.map((shift) => (
            <div className="hub-shift" key={shift.id}>
              <div>
                <strong>{shift.title}</strong>
                <span>{formatDate(shift.date)} / {formatTime(shift.startTime)} {shift.endTime ? `to ${formatTime(shift.endTime)}` : ''}</span>
                <small>
                  {shift.people.length ? `Assigned: ${shift.people.join(', ')}` : 'No one assigned yet'}
                  {shift.putUp ? ' / put up for pickup' : ''}
                </small>
              </div>
              {shiftAction(shift)}
            </div>
          ))}
        </div>
      </Panel>
      {isPrivileged && (
        <Panel title="Add Open Shift" icon={Plus}>
          <form className="hub-form" onSubmit={createShift}>
            <Field label="Shift name"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required /></Field>
            <Field label="Date"><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required /></Field>
            <Field label="Start"><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} required /></Field>
            <Field label="End"><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></Field>
            <button className="hub-primary-button" type="submit"><Plus size={13} /> Add shift</button>
          </form>
        </Panel>
      )}
    </div>
  );
}

function MarkdownPreview({ body }) {
  const lines = String(body || '').split('\n');
  return (
    <div className="hub-markdown-preview">
      {lines.map((line, index) => {
        const wrapped = line.trim().match(/^#(.+)#$/);
        if (wrapped) return <h3 key={index}>{wrapped[1].trim()}</h3>;
        if (line.startsWith('### ')) return <h4 key={index}>{line.slice(4)}</h4>;
        if (line.startsWith('## ')) return <h3 key={index}>{line.slice(3)}</h3>;
        if (line.startsWith('# ')) return <h2 key={index}>{line.slice(2)}</h2>;
        if (line.startsWith('- ')) return <p key={index}>• {line.slice(2)}</p>;
        if (!line.trim()) return <br key={index} />;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}

function CustomerSpendCell({ customer, intakeDate }) {
  const txns = customer.transactions || [];
  const txnCount = customer.transactionCount || 0;
  const total = customer.totalSpendCents || 0;
  const emailThreads = customer.emailThreads || [];
  const emailCount = customer.emailThreadCount || 0;

  return (
    <div className="hub-spend-cell">
      <span>
        <strong>{formatMoneyCents(total)}</strong>
        {txnCount > 0 ? ` lifetime / ${txnCount} txn${txnCount === 1 ? '' : 's'}` : ' / no transactions'}
      </span>
      {txns.slice(0, 3).map((txn) => (
        <small key={txn.id}>
          {formatDate(String(txn.occurredAt).slice(0, 10))} — {formatMoneyCents(txn.amountCents)}
          {txn.matchedBy === 'email' ? ' (email match)' : ''}
        </small>
      ))}
      {emailCount > 0 ? (
        <small className="hub-spend-emails">
          ✉ {emailCount} email thread{emailCount === 1 ? '' : 's'}
          {emailThreads[0]?.subject ? ` — latest: "${emailThreads[0].subject}"` : ''}
        </small>
      ) : (
        <small className="hub-spend-emails">No email threads found</small>
      )}
      {intakeDate && (
        <small>Intake: {formatDate(String(intakeDate).slice(0, 10))}</small>
      )}
    </div>
  );
}

// Derive the prep week's Sunday from a note tab id ("week-2026-06-28"), so the
// menu panel parses the correct week's notepad.
function weekStartFromTabId(tabId) {
  const match = /week-(\d{4}-\d{2}-\d{2})$/.exec(String(tabId || ''));
  return match ? match[1] : null;
}

const MENU_MEAL_ORDER = ['dinner', 'lunch', 'breakfast', 'kids', 'snacks'];
const MENU_MEAL_LABEL = { dinner: 'Dinners', lunch: 'Lunches', breakfast: 'Breakfasts', kids: 'Kids', snacks: 'Snacks' };

// Permanent category headings seeded into a blank Weekly Meal Prep week. Mirrors
// MENU_TEMPLATE in api-handlers/hub/_mealMenuParse.js (keep in sync). Under each
// heading: a dish NAME line (main component), then prose description/side lines.
const MEAL_MENU_TEMPLATE = ['Dinners', 'Lunches', 'Breakfasts', 'Kids', 'Snacks']
  .map((h) => `${h}\n`).join('\n');

// Staff-only view of the week's MENU and its formalized canonical dishes.
// Source: the active week's Weekly Meal Prep notepad, parsed via
// /api/hub/master-menu. Dishes are grouped by meal category (the subheading they
// sit under: #dinners# #lunches# #breakfasts# #kids meals#), and each is matched
// to a knowledge-graph Dish entity. Counts, stations, and chef assignment are a
// later prep-breakdown step, not shown here.
function MasterMenuPanel({ accessToken, weekStart, weekLabel }) {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
      const next = await api(`/api/hub/master-menu${query}`, accessToken);
      setMenu(next);
    } catch (err) {
      setError(err.message || 'Unable to parse menu.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, weekStart]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const dishes = menu?.dishes || [];
  const summary = menu?.summary;
  // Group dishes by meal, preserving the canonical meal order.
  const byMeal = MENU_MEAL_ORDER
    .map((meal) => ({ meal, dishes: dishes.filter((d) => d.meal === meal) }))
    .filter((group) => group.dishes.length > 0);

  return (
    <Panel
      title="This Week&apos;s Menu"
      icon={ClipboardList}
      action={(
        <div className="hub-button-row">
          <button onClick={() => load()}><RefreshCw size={13} /></button>
        </div>
      )}
    >
      <p className="hub-empty" style={{ marginTop: 0 }}>
        Parsed from {weekLabel ? <strong>{weekLabel}</strong> : 'this week'}&apos;s prep notepad
        below, under <code>Dinners / Lunches / Breakfasts / Kids / Snacks</code>. Write each dish as a
        name line (the main component) then a line or two of sides &amp; ingredients. Each dish name is
        matched to a canonical dish in the knowledge graph.
      </p>
      <div className="hub-foodinputs-status">
        <span>
          {loading
            ? 'Parsing menu...'
            : error
            || (summary
              ? `${summary.total} dishes · ${summary.resolved} matched · ${summary.unresolved} unmatched`
              : 'No menu yet.')}
        </span>
      </div>

      {byMeal.length > 0 ? (
        byMeal.map((group) => (
          <div key={group.meal} className="hub-menu-meal">
            <h5>{MENU_MEAL_LABEL[group.meal]}</h5>
            <ul className="hub-rollup-packaging">
              {group.dishes.map((dish, i) => (
                <li key={`${dish.dishEntityId || dish.text}-${i}`} className={dish.resolved ? '' : 'is-unresolved'}>
                  {dish.resolved
                    ? <CheckCircle2 size={14} className="hub-rollup-ok" aria-label="Matched" />
                    : <span className="hub-rollup-qty" aria-hidden>•</span>}
                  <span>
                    {dish.text}
                    {dish.resolved && dish.canonicalName
                      && dish.canonicalName.toLowerCase() !== dish.text.toLowerCase()
                      && <em className="hub-rollup-canon"> → {dish.canonicalName}</em>}
                    {dish.description && <small className="hub-dish-desc">{dish.description}</small>}
                  </span>
                  {!dish.resolved && (
                    <span className="hub-pill" title="No confident canonical dish match">
                      {dish.candidates?.length ? 'review' : 'new'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        !loading && (
          <p className="hub-empty">
            Write this week&apos;s menu in the prep notepad below under
            {' '}<code>Dinners</code>, <code>Lunches</code>, <code>Breakfasts</code>,
            {' '}<code>Kids</code>, <code>Snacks</code> — one dish name per line with sides
            beneath — then refresh.
          </p>
        )
      )}
    </Panel>
  );
}

function WeeklyMealPrepView({ accessToken, isPrivileged, isCustomer = false }) {
  const [data, setData] = useState({ customers: [], upcomingCustomers: [], notes: [], mode: 'staff' });
  const [activeTab, setActiveTab] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(false);
  const lastSavedRef = useRef('');
  const activeTabRef = useRef(activeTab);

  // Customer view is read-only. Respect both the backend mode and a privileged
  // user's "preview as customer" toggle so the preview is faithful.
  const canEditNotes = data.mode !== 'customer' && !isCustomer;

  const load = useCallback(async ({ keepStatus = false } = {}) => {
    setLoading(true);
    try {
      const next = await api('/api/hub/weekly-meal-prep', accessToken);
      setData(next);
      const selected = (next.notes || []).find((note) => note.id === activeTabRef.current) || next.notes?.[0];
      if (selected) {
        activeTabRef.current = selected.id;
        setActiveTab(selected.id);
        // Seed the permanent category headings into a blank week so the menu
        // always has Dinners/Lunches/Breakfasts/Kids/Snacks to write under.
        const body = selected.document?.body || (next.mode !== 'customer' ? MEAL_MENU_TEMPLATE : '');
        setNoteBody(body);
        lastSavedRef.current = body;
      }
      if (!keepStatus) setStatus('');
    } catch (err) {
      setStatus(err.message || 'Unable to load weekly meal prep.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  useEffect(() => {
    if (!canEditNotes || noteBody === lastSavedRef.current) return;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/weekly-meal-prep', accessToken, {
          method: 'POST',
          body: JSON.stringify({ tabId: activeTab, body: noteBody }),
        });
        lastSavedRef.current = saved.note?.document?.body || noteBody;
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, activeTab, canEditNotes, noteBody]);

  const chooseNote = (tabId) => {
    const next = data.notes.find((note) => note.id === tabId);
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    // Blank week → seed the permanent category headings (staff only).
    const body = next?.document?.body || (canEditNotes ? MEAL_MENU_TEMPLATE : '');
    setNoteBody(body);
    lastSavedRef.current = body;
  };

  const customerLabel = isCustomer
    ? 'Customer view'
    : isPrivileged
    ? 'Privileged view: staff and customer'
    : 'Staff view';

  return (
    <div className="hub-meal-prep">
      <Panel
        title={isCustomer ? 'Your Meal Prep Profile' : 'Active Customer Profiles'}
        icon={Soup}
        action={(
          <div className="hub-button-row">
            {!isCustomer && <span className="hub-pill">{customerLabel}</span>}
            <button onClick={() => load()}><RefreshCw size={13} /></button>
          </div>
        )}
      >
        {loading && <p className="hub-empty">Loading meal prep...</p>}
        <div className="hub-customer-table-wrap">
          <table className="hub-customer-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Profile</th>
                <th>Latest Order</th>
                <th>Spend &amp; History</th>
                <th>Brain Signals</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                    {customer.mealPrepStage === 'paused' && <span className="hub-pill hub-pill-muted">paused</span>}
                    {customer.source === 'brain' && customer.mealPrepStage !== 'paused' && <span className="hub-pill">from intake</span>}
                    <span>{customer.users.map((user) => user.email).join(', ') || customer.slug || ''}</span>
                  </td>
                  <td>{customer.planSummary || customer.priceTierDefault || 'No plan rules'}</td>
                  <td>
                    <span>{customer.profile.householdSize || 'Household not set'}</span>
                    <small>{customer.profile.deliveryNotes || customer.profile.address || ''}</small>
                  </td>
                  <td>
                    {customer.latestOrder ? (
                      <>
                        <span>{formatDate(String(customer.latestOrder.weekStart).slice(0, 10))} / {customer.latestOrder.itemCount} items</span>
                        <small>{customer.latestOrder.items.slice(0, 3).map((item) => `${item.quantity}x ${item.title}`).join('; ')}</small>
                      </>
                    ) : 'No order yet'}
                  </td>
                  <td>
                    <CustomerSpendCell customer={customer} />
                  </td>
                  <td>
                    <span>{customer.brain?.inferences?.[0]?.summary || customer.brain?.assertions?.[0]?.dst || 'No active brain signal'}</span>
                    {customer.brain?.properties && <small>{customer.brain.properties.householdSize || customer.brain.properties.slug || ''}</small>}
                  </td>
                </tr>
              ))}
              {!loading && data.customers.length === 0 && (
                <tr><td colSpan="6">No customer profiles are linked yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {data.mode !== 'customer' && (
        <Panel
          title="Upcoming Customers"
          icon={Soup}
          action={<span className="hub-pill">Intake submitted</span>}
        >
          <p className="hub-empty" style={{ marginTop: 0 }}>
            New profiles created from the website meal-prep intake. They&apos;re not active customers yet.
          </p>
          <div className="hub-customer-table-wrap">
            <table className="hub-customer-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Household</th>
                  <th>Estimate</th>
                  <th>Preferred Start</th>
                  <th>History &amp; Emails</th>
                </tr>
              </thead>
              <tbody>
                {(data.upcomingCustomers || []).map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <span>{customer.email || customer.phone || '—'}</span>
                    </td>
                    <td>
                      <span>{customer.householdSize || 'Household not set'}</span>
                      <small>{customer.address || ''}</small>
                    </td>
                    <td>
                      {customer.estimateWeeklyTotal != null
                        ? `$${Number(customer.estimateWeeklyTotal).toLocaleString('en-US', { maximumFractionDigits: 2 })}/wk`
                        : 'No estimate'}
                    </td>
                    <td>{customer.preferredStartDate ? formatDate(String(customer.preferredStartDate).slice(0, 10)) : 'Flexible'}</td>
                    <td>
                      <CustomerSpendCell customer={customer} intakeDate={customer.intakeSubmittedAt} />
                    </td>
                  </tr>
                ))}
                {!loading && (data.upcomingCustomers || []).length === 0 && (
                  <tr><td colSpan="5">No upcoming customers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {canEditNotes && (
        <MasterMenuPanel
          accessToken={accessToken}
          weekStart={weekStartFromTabId(activeTab)}
          weekLabel={(data.notes || []).find((note) => note.id === activeTab)?.title || ''}
        />
      )}

      <Panel
        title="Shared Prep Notes"
        icon={FileText}
        action={(
          <div className="hub-button-row">
            <button className={preview ? '' : 'is-active'} onClick={() => setPreview(false)}>Edit</button>
            <button className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>Preview</button>
          </div>
        )}
      >
        <div className="hub-wordpad-tabs">
          {(data.notes || []).map((note) => (
            <button key={note.id} className={activeTab === note.id ? 'is-active' : ''} onClick={() => chooseNote(note.id)}>
              {note.title}
            </button>
          ))}
          <span>{status || 'Shared with all staff. Tabs fall off Tuesday and archive to the brain.'}</span>
        </div>
        {canEditNotes ? (
          preview ? (
            <MarkdownPreview body={noteBody} />
          ) : (
            <textarea
              className="hub-wordpad"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              spellCheck="true"
              placeholder={MEAL_MENU_TEMPLATE}
            />
          )
        ) : (
          <MarkdownPreview body={noteBody || 'No staff note published yet.'} />
        )}
      </Panel>
    </div>
  );
}

const FOOD_INPUTS_MARKDOWN_PLACEHOLDER = '#dishes#\n- \n\n#ingredients#\n- \n\n#questions#\n- \n\n#quality notes#\n- \n';

const FOOD_INPUTS_DATE_TZ = 'America/Chicago';

function foodInputsTodayIso() {
  return new Date().toLocaleDateString('en-CA', { timeZone: FOOD_INPUTS_DATE_TZ });
}

// Parse a Food Inputs note into spreadsheet rows. `#section#` headers (and
// markdown `#`/`##`/`###` headings) become the value of a "Section" column;
// each `- ` bullet (or any other non-empty, non-heading line) becomes one row
// tagged with the section it falls under. Returns { columns, rows }.
function noteToSheet(markdown) {
  const columns = ['Section', 'Item'];
  const rows = [];
  let section = '';
  String(markdown || '').split('\n').forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const wrapped = line.match(/^#(.+)#$/);          // #dishes#
    const heading = line.match(/^#{1,3}\s+(.+)$/);   // ## Dishes
    if (wrapped) { section = wrapped[1].trim(); return; }
    if (heading) { section = heading[1].trim(); return; }
    const item = line.replace(/^[-*]\s+/, '').trim(); // strip bullet marker
    if (!item) return;
    rows.push([section, item]);
  });
  return { columns, rows: rows.length ? rows : [['', '']] };
}

// Shared two-way log between the kitchen and the customer (David & Allison).
// Week tabs across the top; toggle between a markdown notepad (default) and a
// spreadsheet grid. Both views autosave. Mirrors the meal-prep notepad style.
function FoodInputsView({ accessToken }) {
  const [weeks, setWeeks] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [view, setView] = useState('markdown'); // 'markdown' | 'sheet'
  const [markdown, setMarkdown] = useState('');
  const [sheet, setSheet] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState(false);

  const [pinnedDates, setPinnedDates] = useState([]); // extra week-dates reached via calendar
  const [datePick, setDatePick] = useState(foodInputsTodayIso());
  const pendingSelectDateRef = useRef(null); // date whose week tab to select after next load

  const activeTabRef = useRef(activeTab);
  const lastSavedMdRef = useRef('');
  const lastSavedSheetRef = useRef('');

  const applyWeek = useCallback((week) => {
    const md = week?.markdown || '';
    const sheetValue = week?.sheet || { columns: [], rows: [] };
    setMarkdown(md);
    setSheet(sheetValue);
    lastSavedMdRef.current = md;
    lastSavedSheetRef.current = JSON.stringify(sheetValue);
  }, []);

  // `selectId` lets a caller (e.g. the calendar) force a specific week tab to
  // become active once the data for it has loaded.
  const load = useCallback(async ({ pins = [], selectId = null } = {}) => {
    setLoading(true);
    try {
      const query = pins.length ? `?pin=${encodeURIComponent(pins.join(','))}` : '';
      const next = await api(`/api/hub/food-inputs${query}`, accessToken);
      const list = next.weeks || [];
      setWeeks(list);
      // If a calendar pick is pending, prefer the week that contains that date.
      const pendingDate = pendingSelectDateRef.current;
      const weekForDate = pendingDate
        ? list.find((week) => {
            const start = new Date(`${week.weekStart}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            const picked = new Date(`${pendingDate}T00:00:00`);
            return picked >= start && picked <= end;
          })
        : null;
      pendingSelectDateRef.current = null;
      const wantId = weekForDate?.id || selectId || activeTabRef.current;
      const selected = list.find((week) => week.id === wantId) || list[0];
      if (selected) {
        activeTabRef.current = selected.id;
        setActiveTab(selected.id);
        applyWeek(selected);
      }
      setStatus('');
    } catch (err) {
      setStatus(err.message || 'Unable to load food inputs.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, applyWeek]);

  useEffect(() => { load({ pins: pinnedDates }).catch(() => {}); }, [load, pinnedDates]);

  // Autosave markdown.
  useEffect(() => {
    if (!activeTab || markdown === lastSavedMdRef.current) return undefined;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/food-inputs', accessToken, {
          method: 'POST',
          body: JSON.stringify({ tabId: activeTab, view: 'markdown', markdown }),
        });
        lastSavedMdRef.current = saved.week?.markdown ?? markdown;
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, activeTab, markdown]);

  // Autosave spreadsheet.
  useEffect(() => {
    if (!activeTab) return undefined;
    const serialized = JSON.stringify(sheet);
    if (serialized === lastSavedSheetRef.current) return undefined;
    setStatus('Saving...');
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api('/api/hub/food-inputs', accessToken, {
          method: 'POST',
          body: JSON.stringify({ tabId: activeTab, view: 'sheet', sheet }),
        });
        lastSavedSheetRef.current = saved.week?.sheet ? JSON.stringify(saved.week.sheet) : serialized;
        if (saved.week?.sheet) setSheet(saved.week.sheet);
        setStatus(`Saved ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);
      } catch (err) {
        setStatus(err.message || 'Autosave failed.');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [accessToken, activeTab, sheet]);

  const chooseTab = (tabId) => {
    const next = weeks.find((week) => week.id === tabId);
    activeTabRef.current = tabId;
    setActiveTab(tabId);
    if (next) applyWeek(next);
  };

  const setCell = (rowIndex, colIndex, value) => {
    setSheet((prev) => {
      const rows = prev.rows.map((row) => [...row]);
      if (!rows[rowIndex]) return prev;
      rows[rowIndex][colIndex] = value;
      return { ...prev, rows };
    });
  };

  const setColumn = (colIndex, value) => {
    setSheet((prev) => {
      const columns = [...prev.columns];
      columns[colIndex] = value;
      return { ...prev, columns };
    });
  };

  const addRow = () => {
    setSheet((prev) => ({ ...prev, rows: [...prev.rows, prev.columns.map(() => '')] }));
  };

  const addColumn = () => {
    setSheet((prev) => ({
      columns: [...prev.columns, `Column ${prev.columns.length + 1}`],
      rows: prev.rows.map((row) => [...row, '']),
    }));
  };

  const removeRow = (rowIndex) => {
    setSheet((prev) => ({ ...prev, rows: prev.rows.filter((_, index) => index !== rowIndex) }));
  };

  const weekContaining = (dateIso) => weeks.find((week) => {
    const start = new Date(`${week.weekStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const picked = new Date(`${dateIso}T00:00:00`);
    return picked >= start && picked <= end;
  });

  // Calendar pick: if the date's week is already a tab, just select it.
  // Otherwise pin the date — the load effect refetches with the pin and the
  // pending-select ref makes that week's tab active once it arrives.
  const goToDate = (dateIso) => {
    if (!dateIso) return;
    const existing = weekContaining(dateIso);
    if (existing) {
      chooseTab(existing.id);
      return;
    }
    pendingSelectDateRef.current = dateIso;
    setPinnedDates((prev) => (prev.includes(dateIso) ? prev : [...prev, dateIso]));
  };

  // Convert the current note into spreadsheet rows. Asks append vs replace so
  // existing sheet cells are never silently discarded.
  const convertNoteToSheet = () => {
    const parsed = noteToSheet(markdown);
    if (!parsed.rows.length) return;
    const hasSheetData = sheet.rows.some((row) => row.some((cell) => String(cell || '').trim()));
    let mode = 'replace';
    if (hasSheetData) {
      // eslint-disable-next-line no-alert
      const append = window.confirm(
        'Add the note rows below your existing spreadsheet rows?\n\nOK = append to current sheet\nCancel = replace the sheet with the note',
      );
      mode = append ? 'append' : 'replace';
    }
    setSheet((prev) => {
      if (mode === 'append') {
        // Keep current columns; map parsed rows onto current width.
        const width = prev.columns.length || parsed.columns.length;
        const columns = prev.columns.length ? prev.columns : parsed.columns;
        const newRows = parsed.rows.map((row) => {
          const cells = row.slice(0, width);
          while (cells.length < width) cells.push('');
          return cells;
        });
        return { columns, rows: [...prev.rows, ...newRows] };
      }
      return parsed;
    });
    setView('sheet');
    setStatus('Converted note to spreadsheet.');
  };

  return (
    <div className="hub-meal-prep">
      <Panel
        title="Food Inputs"
        icon={Utensils}
        action={(
          <div className="hub-button-row">
            <button className={view === 'markdown' ? 'is-active' : ''} onClick={() => setView('markdown')}>
              <FileText size={13} /> Notes
            </button>
            <button className={view === 'sheet' ? 'is-active' : ''} onClick={() => setView('sheet')}>
              <Table size={13} /> Spreadsheet
            </button>
            <button onClick={() => load({ pins: pinnedDates })}><RefreshCw size={13} /></button>
          </div>
        )}
      >
        <p className="hub-empty" style={{ marginTop: 0 }}>
          Trade notes and track dishes, questions, ingredients, and quality inputs with the kitchen. Saves automatically.
        </p>
        <div className="hub-foodinputs-datebar">
          <div className="hub-foodinputs-tabs">
            {weeks.map((week) => (
              <button key={week.id} className={activeTab === week.id ? 'is-active' : ''} onClick={() => chooseTab(week.id)}>
                {week.title}
              </button>
            ))}
          </div>
          <label className="hub-foodinputs-datepick">
            <CalendarDays size={13} aria-hidden="true" />
            <span>Go to date</span>
            <input
              type="date"
              value={datePick}
              onChange={(event) => {
                setDatePick(event.target.value);
                goToDate(event.target.value);
              }}
            />
          </label>
        </div>
        <div className="hub-foodinputs-status">
          <span>{loading ? 'Loading...' : status || 'Shared with the kitchen. Pick any date to open its week.'}</span>
        </div>

        {view === 'markdown' ? (
          <>
            <div className="hub-button-row" style={{ padding: '8px 0' }}>
              <button className={preview ? '' : 'is-active'} onClick={() => setPreview(false)}>Edit</button>
              <button className={preview ? 'is-active' : ''} onClick={() => setPreview(true)}>Preview</button>
              <button onClick={convertNoteToSheet} title="Turn these notes into spreadsheet rows">
                <Table size={13} /> Convert to spreadsheet
              </button>
            </div>
            {preview ? (
              <MarkdownPreview body={markdown || FOOD_INPUTS_MARKDOWN_PLACEHOLDER} />
            ) : (
              <textarea
                className="hub-wordpad"
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                spellCheck="true"
                placeholder={FOOD_INPUTS_MARKDOWN_PLACEHOLDER}
              />
            )}
          </>
        ) : (
          <div className="hub-sheet">
            <div className="hub-sheet-scroll">
              <table className="hub-sheet-table">
                <thead>
                  <tr>
                    <th className="hub-sheet-rownum" aria-hidden="true" />
                    {sheet.columns.map((column, colIndex) => (
                      <th key={colIndex}>
                        <input
                          value={column}
                          onChange={(event) => setColumn(colIndex, event.target.value)}
                          aria-label={`Column ${colIndex + 1} header`}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="hub-sheet-rownum">
                        <button type="button" onClick={() => removeRow(rowIndex)} aria-label={`Remove row ${rowIndex + 1}`}>
                          <X size={12} />
                        </button>
                      </td>
                      {sheet.columns.map((_, colIndex) => (
                        <td key={colIndex}>
                          <input
                            value={row[colIndex] ?? ''}
                            onChange={(event) => setCell(rowIndex, colIndex, event.target.value)}
                            aria-label={`Row ${rowIndex + 1} ${sheet.columns[colIndex] || `column ${colIndex + 1}`}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hub-button-row" style={{ padding: '10px 0 0' }}>
              <button onClick={addRow}><Plus size={13} /> Add row</button>
              <button onClick={addColumn}><Plus size={13} /> Add column</button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function PrivilegedTools({ accessToken, reloadDocs }) {
  const [invite, setInvite] = useState({ email: '', accessLevel: 'staff', displayNameHint: '' });
  const [created, setCreated] = useState(null);
  const [brain, setBrain] = useState({ sourceType: 'brain_inbox', sourceId: '', title: '', visibility: 'staff' });
  const [localistWindow, setLocalistWindow] = useState(null);
  const [localistMessage, setLocalistMessage] = useState('');
  const [localistStatus, setLocalistStatus] = useState('');
  const [localistBusy, setLocalistBusy] = useState(false);
  const [localistAnalytics, setLocalistAnalytics] = useState(null);
  const [localistAnalyticsStatus, setLocalistAnalyticsStatus] = useState('Loading activity...');
  const [localistOrders, setLocalistOrders] = useState(null);
  const [localistOrdersStatus, setLocalistOrdersStatus] = useState('Loading orders...');

  const createInvite = async (event) => {
    event.preventDefault();
    const data = await api('/api/hub/invites', accessToken, { method: 'POST', body: JSON.stringify(invite) });
    setCreated(data.invite);
  };

  const publishBrain = async (event) => {
    event.preventDefault();
    await api('/api/hub/brain-publish', accessToken, { method: 'POST', body: JSON.stringify(brain) });
    setBrain({ sourceType: 'brain_inbox', sourceId: '', title: '', visibility: 'staff' });
    await reloadDocs();
  };

  const createLocalistWindow = async () => {
    setLocalistStatus('');
    setLocalistBusy(true);
    try {
      const data = await api('/api/hub/localist-window', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'create', hoursValid: 48 }),
      });
      setLocalistWindow(data.window);
      setLocalistMessage(`Local Effort Localist menu is live for 48 hours: ${data.window.url} Reply STOP to opt out.`);
      setLocalistStatus('Link ready.');
      loadLocalistAnalytics().catch(() => {});
    } catch (err) {
      setLocalistStatus(err.message || 'Unable to create link.');
    } finally {
      setLocalistBusy(false);
    }
  };

  const sendLocalistSms = async () => {
    if (!localistWindow?.url) return;
    setLocalistStatus('Sending SMS through Brevo...');
    setLocalistBusy(true);
    try {
      const token = new URL(localistWindow.url, window.location.origin).searchParams.get('localist');
      if (!token) throw new Error('Localist token missing from generated link.');
      const data = await api('/api/hub/localist-window', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          action: 'sendSms',
          token,
          message: localistMessage,
        }),
      });
      setLocalistWindow(data.window);
      const brevoStatus = data.brevo?.status ? ` Brevo status: ${data.brevo.status}.` : '';
      const sentCount = Number(data.brevo?.statistics?.sent);
      const sentText = Number.isFinite(sentCount) ? ` Sent count: ${sentCount}.` : '';
      setLocalistStatus(`SMS submitted to Brevo as campaign ${data.brevo?.campaignId || data.window?.smsCampaignId || ''}.${brevoStatus}${sentText}`.trim());
      loadLocalistAnalytics().catch(() => {});
    } catch (err) {
      setLocalistStatus(err.message || 'Unable to send SMS.');
    } finally {
      setLocalistBusy(false);
    }
  };

  const checkLocalistSmsStatus = async () => {
    setLocalistStatus('Checking SMS setup...');
    setLocalistBusy(true);
    try {
      const data = await api('/api/hub/localist-window', accessToken, {
        method: 'POST',
        body: JSON.stringify({ action: 'smsStatus' }),
      });
      const sms = data.sms || {};
      if (sms.ready) {
        setLocalistStatus(`SMS setup ready. Sender: ${sms.sender}. Brevo list IDs: ${(sms.listIds || []).join(', ')}.`);
      } else {
        const missing = [
          !sms.hasApiKey ? 'BREVO_API_KEY' : null,
          !sms.listIds?.length ? 'BREVO_LOCALIST_LIST_ID' : null,
          !sms.sender ? 'BREVO_LOCALIST_SMS_SENDER' : null,
        ].filter(Boolean).join(', ');
        setLocalistStatus(`SMS setup is incomplete. Missing: ${missing || 'unknown config'}.`);
      }
    } catch (err) {
      setLocalistStatus(err.message || 'Unable to check SMS setup.');
    } finally {
      setLocalistBusy(false);
    }
  };

  const copyLocalistLink = async () => {
    if (!localistWindow?.url || !navigator.clipboard) return;
    await navigator.clipboard.writeText(localistWindow.url);
    setLocalistStatus('Link copied.');
  };

  const loadLocalistAnalytics = useCallback(async () => {
    setLocalistAnalyticsStatus('Loading activity...');
    try {
      const data = await api('/api/hub/localist-activity?limit=8', accessToken);
      setLocalistAnalytics(data.windows || []);
      setLocalistAnalyticsStatus('');
    } catch (err) {
      setLocalistAnalytics([]);
      setLocalistAnalyticsStatus(err.message || 'Unable to load Localist activity.');
    }
  }, [accessToken]);

  const loadLocalistOrders = useCallback(async () => {
    setLocalistOrdersStatus('Loading orders...');
    try {
      const data = await api('/api/hub/localist-orders?hours=168&limit=50', accessToken);
      setLocalistOrders(data);
      setLocalistOrdersStatus('');
    } catch (err) {
      setLocalistOrders({ orders: [], summary: {} });
      setLocalistOrdersStatus(err.message || 'Unable to load Localist orders.');
    }
  }, [accessToken]);

  useEffect(() => {
    loadLocalistAnalytics().catch(() => {});
  }, [loadLocalistAnalytics]);

  useEffect(() => {
    loadLocalistOrders().catch(() => {});
  }, [loadLocalistOrders]);

  const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;
  const shortDateTime = (value) => (
    value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not yet'
  );

  return (
    <div className="hub-grid">
      <Panel title="Invite User" icon={UserPlus}>
        <form className="hub-form" onSubmit={createInvite}>
          <Field label="Email"><input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required /></Field>
          <Field label="Access">
            <select value={invite.accessLevel} onChange={(e) => setInvite({ ...invite, accessLevel: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
              <option value="privileged">Privileged</option>
            </select>
          </Field>
          <Field label="Name hint"><input value={invite.displayNameHint} onChange={(e) => setInvite({ ...invite, displayNameHint: e.target.value })} /></Field>
          <button className="hub-primary-button" type="submit"><UserPlus size={13} /> Create invite</button>
        </form>
        {created && (
          <div className="hub-copy-box">
            <strong>Invite link</strong>
            <input readOnly value={created.url || ''} onFocus={(e) => e.target.select()} />
          </div>
        )}
      </Panel>
      <Panel title="Send Brain to Hub" icon={Inbox}>
        <form className="hub-form" onSubmit={publishBrain}>
          <Field label="Source">
            <select value={brain.sourceType} onChange={(e) => setBrain({ ...brain, sourceType: e.target.value })}>
              <option value="brain_inbox">Brain inbox item</option>
              <option value="brain_entity">Brain entity</option>
            </select>
          </Field>
          <Field label="Source ID"><input value={brain.sourceId} onChange={(e) => setBrain({ ...brain, sourceId: e.target.value })} required /></Field>
          <Field label="Hub title"><input value={brain.title} onChange={(e) => setBrain({ ...brain, title: e.target.value })} /></Field>
          <Field label="Visibility">
            <select value={brain.visibility} onChange={(e) => setBrain({ ...brain, visibility: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="privileged">Privileged</option>
            </select>
          </Field>
          <button className="hub-primary-button" type="submit"><FileText size={13} /> Publish as doc</button>
        </form>
      </Panel>
      <Panel title="Localist Window" icon={ShoppingCart}>
        <div className="hub-form">
          <div className="hub-button-row">
            <button type="button" onClick={createLocalistWindow} disabled={localistBusy}>
              <Plus size={13} /> Generate link
            </button>
            <button type="button" onClick={sendLocalistSms} disabled={localistBusy || !localistWindow?.url}>
              <Send size={13} /> Send SMS
            </button>
            <button type="button" onClick={checkLocalistSmsStatus} disabled={localistBusy}>
              <RefreshCw size={13} /> Check SMS
            </button>
          </div>
          {localistWindow?.url && (
            <>
              <Field label="Link">
                <input readOnly value={localistWindow.url} onFocus={(e) => e.target.select()} />
              </Field>
              <Field label="Message">
                <textarea
                  rows={4}
                  value={localistMessage}
                  onChange={(e) => setLocalistMessage(e.target.value)}
                />
              </Field>
              <div className="hub-button-row">
                <button type="button" onClick={copyLocalistLink}>
                  <Copy size={13} /> Copy link
                </button>
                {localistWindow.smsSentAt && <span className="hub-pill">Sent</span>}
              </div>
            </>
          )}
          {localistStatus && <p className="hub-empty">{localistStatus}</p>}
        </div>
      </Panel>
      <Panel
        title="Localist Activity"
        icon={ClipboardList}
        action={(
          <button type="button" onClick={loadLocalistAnalytics}>
            <RefreshCw size={13} />
          </button>
        )}
      >
        {localistAnalyticsStatus && <p className="hub-empty">{localistAnalyticsStatus}</p>}
        {localistAnalytics && localistAnalytics.length === 0 && !localistAnalyticsStatus && (
          <p className="hub-empty">No Localist activity has been recorded yet.</p>
        )}
        <div className="hub-localist-analytics">
          {(localistAnalytics || []).map((windowEntry) => {
            const metrics = windowEntry.metrics || {};
            return (
              <article className="hub-localist-window-card" key={windowEntry.id}>
                <div className="hub-localist-window-head">
                  <div>
                    <strong>{windowEntry.valid ? 'Active window' : 'Closed window'}</strong>
                    <span>Expires {shortDateTime(windowEntry.expiresAt)}</span>
                  </div>
                  {windowEntry.smsCampaignId && <span className="hub-pill">Brevo {windowEntry.smsCampaignId}</span>}
                </div>
                <div className="hub-metric-grid">
                  <div className="hub-metric"><span>Visitors</span><strong>{metrics.uniqueVisitors || 0}</strong></div>
                  <div className="hub-metric"><span>Shared visitors</span><strong>{metrics.sharedVisitors || 0}</strong></div>
                  <div className="hub-metric"><span>Shares</span><strong>{metrics.shareEvents || 0}</strong></div>
                  <div className="hub-metric"><span>Share rate</span><strong>{percent(metrics.shareRate)}</strong></div>
                  <div className="hub-metric"><span>Carts</span><strong>{metrics.cartsStarted || 0}</strong></div>
                  <div className="hub-metric"><span>Abandoned</span><strong>{metrics.abandonedCarts || 0}</strong></div>
                  <div className="hub-metric"><span>Checkout starts</span><strong>{metrics.checkoutStarts || 0}</strong></div>
                  <div className="hub-metric"><span>Paid</span><strong>{metrics.checkoutSuccesses || 0}</strong></div>
                </div>
                <small>
                  Last activity {shortDateTime(metrics.lastActivityAt)}
                  {windowEntry.smsSentAt ? ` / SMS sent ${shortDateTime(windowEntry.smsSentAt)}` : ''}
                </small>
              </article>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="Localist Orders"
        icon={CreditCard}
        action={(
          <button type="button" onClick={loadLocalistOrders}>
            <RefreshCw size={13} />
          </button>
        )}
      >
        {localistOrdersStatus && <p className="hub-empty">{localistOrdersStatus}</p>}
        {localistOrders && (
          <div className="hub-localist-analytics">
            <div className="hub-metric-grid">
              <div className="hub-metric"><span>Paid</span><strong>{localistOrders.summary?.paidCount || 0}</strong></div>
              <div className="hub-metric"><span>Paid total</span><strong>{formatCurrency(localistOrders.summary?.paidTotalCents || 0)}</strong></div>
              <div className="hub-metric"><span>Pending</span><strong>{localistOrders.summary?.pendingCount || 0}</strong></div>
              <div className="hub-metric"><span>All orders</span><strong>{localistOrders.summary?.orderCount || 0}</strong></div>
            </div>
            {(localistOrders.orders || []).length === 0 && !localistOrdersStatus && (
              <p className="hub-empty">No Localist orders have been recorded yet.</p>
            )}
            {(localistOrders.orders || []).map((orderEntry) => (
              <article className="hub-localist-window-card" key={orderEntry.id}>
                <div className="hub-localist-window-head">
                  <div>
                    <strong>{orderEntry.customerName}</strong>
                    <span>
                      {orderEntry.status} / {formatCurrency(orderEntry.totalCents)}
                      {orderEntry.paidAt ? ` / paid ${shortDateTime(orderEntry.paidAt)}` : ` / started ${shortDateTime(orderEntry.checkoutStartedAt)}`}
                    </span>
                  </div>
                  <span className="hub-pill">{orderEntry.pickupWindow}</span>
                </div>
                <div className="hub-localist-order-detail">
                  {orderEntry.customerEmail && <span>Email: {orderEntry.customerEmail}</span>}
                  {orderEntry.customerPhone && <span>Phone: {orderEntry.customerPhone}</span>}
                  {orderEntry.customerNote && <span>Notes/allergies: {orderEntry.customerNote}</span>}
                  {orderEntry.squareOrderId && <span>Square order: {orderEntry.squareOrderId}</span>}
                  {orderEntry.squareReceiptUrl && <span>Square receipt: {orderEntry.squareReceiptUrl}</span>}
                  {orderEntry.brainInboxItemId && <span>Brain inbox: {orderEntry.brainInboxItemId}</span>}
                </div>
                <div className="hub-localist-order-items">
                  {(orderEntry.items || []).map((item) => (
                    <span key={`${orderEntry.id}-${item.id}`}>
                      {item.quantity}x {item.name}
                      {item.customerOptions?.length ? ` (${item.customerOptions.join(', ')})` : ''}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function formatCurrency(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
}

function parseLocalistPriceCents(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const dollars = Number(match[1]);
  return Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : null;
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

function formatPhone(value) {
  const digits = normalizePhone(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function LocalistView({
  area = 'localist',
  menuName = 'Localist',
  successName = 'Localist',
  showChat = true,
}) {
  const [items, setItems] = useState(null);
  const [content, setContent] = useState(null);
  const [order, setOrder] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupWindow, setPickupWindow] = useState('');
  const [note, setNote] = useState('');
  const [customerOptions, setCustomerOptions] = useState({});
  const [shareStatus, setShareStatus] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState(() => (
    new URLSearchParams(window.location.search).get('checkout') === `${area}-success` ? 'success' : 'idle'
  ));
  const [checkoutError, setCheckoutError] = useState('');
  const successTrackedRef = useRef(false);

  useEffect(() => {
    api(`/api/hub/localist-menu?area=${encodeURIComponent(area)}`)
      .then((data) => {
        setContent(data.content || null);
        setItems(data.items || []);
        if (area === 'localist') {
          trackLocalistActivity('localist.menu.loaded', {
            metadata: { itemCount: data.items?.length || 0 },
          });
        }
      })
      .catch(() => {
        setContent(null);
        setItems([]);
      });
  }, [area]);

  const pricedItems = useMemo(() => (items || []).map((item) => {
    const exactPrice = Number(item.priceCents);
    const priceCents = Number.isFinite(exactPrice) && exactPrice > 0
      ? Math.round(exactPrice)
      : parseLocalistPriceCents(item.price);
    return { ...item, priceCents };
  }), [items]);

  const selectedItems = useMemo(() => pricedItems
    .map((item) => ({
      ...item,
      quantity: Number(order[item._id]) || 0,
      customerOptions: customerOptions[item._id] || {},
    }))
    .filter((item) => item.quantity > 0), [pricedItems, order, customerOptions]);

  const totalCents = selectedItems.reduce((sum, item) => sum + (item.priceCents || 0) * item.quantity, 0);
  const totalQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const checkoutBusy = checkoutStatus === 'loading';
  const requiresPickupWindow = area === 'localist';
  const canCheckout = totalQuantity > 0
    && totalCents > 0
    && name.trim()
    && email.trim()
    && (!requiresPickupWindow || pickupWindow)
    && !checkoutBusy;
  const cartPayload = useMemo(() => ({
    totalQuantity,
    totalCents,
    items: selectedItems.map((item) => ({
      id: item._id,
      name: item.name,
      quantity: item.quantity,
      priceCents: item.priceCents || 0,
      customerOptions: item.customerOptions,
    })),
  }), [selectedItems, totalCents, totalQuantity]);

  useEffect(() => {
    if (totalQuantity <= 0) return undefined;
    const timer = window.setTimeout(() => {
      if (area === 'localist') trackLocalistActivity('localist.cart.updated', { cart: cartPayload });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [area, cartPayload, totalQuantity]);

  useEffect(() => {
    if (checkoutStatus !== 'success' || successTrackedRef.current) return;
    successTrackedRef.current = true;
    if (area === 'localist') {
      trackLocalistActivity('localist.checkout.success', {
        metadata: { returnedFromSquare: true },
      });
    }
  }, [area, checkoutStatus]);

  const setQuantity = (id, quantity) => {
    const item = pricedItems.find((candidate) => candidate._id === id);
    const inventoryCount = Number(item?.inventoryCount);
    const maxQuantity = Number.isFinite(inventoryCount) && inventoryCount >= 0
      ? Math.min(20, Math.round(inventoryCount))
      : 20;
    const nextQuantity = Math.max(0, Math.min(Number(quantity) || 0, maxQuantity));
    setOrder((prev) => {
      const next = { ...prev };
      if (nextQuantity) next[id] = nextQuantity;
      else delete next[id];
      return next;
    });
  };

  const setCustomerOption = (itemId, key, checked) => {
    setCustomerOptions((prev) => {
      const itemOptions = { ...(prev[itemId] || {}) };
      if (checked) itemOptions[key] = true;
      else delete itemOptions[key];
      return { ...prev, [itemId]: itemOptions };
    });
  };

  const shareLocalistLink = async () => {
    const { localistToken } = localistTrackingContext();
    if (!localistToken) return;
    const url = new URL(window.location.href);
    url.searchParams.set('localist', localistToken);
    url.searchParams.set('shared', '1');
    url.searchParams.delete('checkout');
    const shareUrl = url.toString();
    let shareMethod = 'clipboard';
    try {
      if (navigator.share) {
        shareMethod = 'web_share';
        await navigator.share({ title: 'Local Effort Localist menu', url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        window.prompt('Copy Localist link', shareUrl);
      }
      trackLocalistActivity('localist.link.shared', { shareMethod });
      setShareStatus(shareMethod === 'web_share' ? 'Share opened.' : 'Shared link copied.');
    } catch (_err) {
      setShareStatus('');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canCheckout) return;
    setCheckoutStatus('loading');
    setCheckoutError('');

    try {
      const params = new URLSearchParams(window.location.search);
      const identity = localistIdentity();
      const tracking = localistTrackingContext();
      if (area === 'localist') trackLocalistActivity('localist.checkout.started', { cart: cartPayload });
      const data = await api('/api/hub/localist-checkout', null, {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          phone: formatPhone(phone),
          pickupWindow: requiresPickupWindow ? pickupWindow : '',
          note,
          localistToken: params.get('localist') || '',
          visitorId: identity.visitorId,
          sessionId: identity.sessionId,
          entrySource: tracking.entrySource,
          sourceArea: area,
          items: selectedItems.map((item) => ({
            id: item._id,
            quantity: item.quantity,
            customerOptions: item.customerOptions,
          })),
        }),
      });
      if (!data.url) throw new Error('Square did not return a checkout link.');
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err.message || 'Unable to start checkout.');
      setCheckoutStatus('idle');
    }
  };

  if (checkoutStatus === 'success') {
    return (
      <div className="hub-menu-paper">
        <Panel title="Payment received" icon={CheckCircle2}>
          <p className="hub-empty hub-menu-thanks">
            Thanks{name ? `, ${name}` : ''} — your {successName} order is in. See you at pickup.
          </p>
          <button
            className="hub-primary-button"
            style={{ marginTop: 16 }}
            type="button"
            onClick={() => {
              setCheckoutStatus('idle');
              setOrder({});
              setName('');
              setEmail('');
              setPhone('');
              setPickupWindow('');
              setNote('');
              setCustomerOptions({});
            }}
          >
            Place another order
          </button>
        </Panel>
        {showChat && <LocalistChat />}
      </div>
    );
  }

  return (
    <div className="hub-menu-paper">
    <Panel
      title={area === 'localist' ? 'Place an order' : `A menu for ${menuName}`}
      icon={ShoppingCart}
    >
      {content && (
        <section className="hub-localist-intro">
          {content.eyebrow && <small>{content.eyebrow}</small>}
          {content.headline && <h3>{content.headline}</h3>}
          {content.body && <p>{content.body}</p>}
          {content.note && <span>{content.note}</span>}
        </section>
      )}
      {area === 'localist' && localistTrackingContext().localistToken && (
        <div className="hub-localist-share">
          <button type="button" onClick={shareLocalistLink}>
            <Send size={13} /> Share menu
          </button>
          {shareStatus && <span>{shareStatus}</span>}
        </div>
      )}
      {items === null && <p className="hub-empty">Loading {menuName} menu...</p>}
      {items !== null && items.length === 0 && <p className="hub-empty">No items available.</p>}
      {items !== null && items.length > 0 && (
        <form className="hub-form hub-localist-form" onSubmit={submit}>
          <div className="hub-localist-list">
            {pricedItems.map((item) => {
              const quantity = Number(order[item._id]) || 0;
              const inventoryCount = Number(item.inventoryCount);
              const tracksInventory = Number.isFinite(inventoryCount) && inventoryCount >= 0;
              const roundedInventoryCount = tracksInventory ? Math.round(inventoryCount) : null;
              const soldOut = roundedInventoryCount === 0;
              const maxQuantity = tracksInventory ? Math.min(20, roundedInventoryCount) : 20;
              const disabled = !item.priceCents || soldOut;
              const itemOptions = customerOptions[item._id] || {};
              const activeFlags = LOCALIST_ITEM_FLAG_LABELS
                .filter(([key]) => item.dietaryFlags?.[key])
                .map(([, label]) => label);
              return (
                <div key={item._id} className={`hub-row hub-localist-item${soldOut ? ' is-sold-out' : ''}`}>
                  <div className="hub-localist-item-copy">
                    <strong>
                      {item.name}
                      <span className="hub-localist-price">
                        {item.price || (item.priceCents ? formatCurrency(item.priceCents) : 'No checkout price')}
                      </span>
                    </strong>
                    {tracksInventory && (
                      <span className={`hub-localist-inventory${soldOut ? ' is-sold-out' : ''}${!soldOut && roundedInventoryCount <= 3 ? ' is-low' : ''}`}>
                        {soldOut
                          ? 'Sold out'
                          : roundedInventoryCount === 1
                            ? 'Only 1 left'
                            : `${roundedInventoryCount} remaining`}
                      </span>
                    )}
                    {item.description && <span>{item.description}</span>}
                    {activeFlags.length > 0 && (
                      <div className="hub-localist-flags">
                        {activeFlags.map((flag) => <span key={flag}>{flag}</span>)}
                      </div>
                    )}
                    <div className="hub-localist-options" aria-label={`${item.name} dietary options`}>
                      {LOCALIST_CUSTOMER_OPTIONS.map((option) => (
                        <label key={option.key} className="hub-localist-option">
                          <input
                            type="checkbox"
                            checked={itemOptions[option.key] === true}
                            onChange={(e) => setCustomerOption(item._id, option.key, e.target.checked)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="hub-localist-quantity" aria-label={`${item.name} quantity`}>
                    <button
                      type="button"
                      onClick={() => setQuantity(item._id, quantity - 1)}
                      disabled={quantity === 0}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      value={quantity}
                      inputMode="numeric"
                      aria-label={`${item.name} quantity`}
                      onChange={(event) => setQuantity(item._id, Number(event.target.value))}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(item._id, quantity + 1)}
                      disabled={disabled || quantity >= maxQuantity}
                      aria-label={`Add ${item.name}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </Field>
          <Field label="Email for confirmation">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
          </Field>
          <Field label="Phone (optional)">
            <input value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" />
          </Field>
          {requiresPickupWindow && (
            <Field label="Pickup window">
              <select value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} required>
                <option value="">Select pickup window</option>
                {LOCALIST_PICKUP_WINDOWS.map((windowLabel) => (
                  <option key={windowLabel} value={windowLabel}>{windowLabel}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Notes (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, delivery instructions..." />
          </Field>
          <div className="hub-localist-checkout">
            <div>
              <span>Total</span>
              <strong>{formatCurrency(totalCents)}</strong>
              <small>{totalQuantity ? `${totalQuantity} item${totalQuantity === 1 ? '' : 's'}` : 'Choose items above'}</small>
            </div>
            <button className="hub-primary-button" type="submit" disabled={!canCheckout}>
              <CreditCard size={13} /> {checkoutBusy ? 'Opening Square...' : 'Checkout with Square'}
            </button>
          </div>
          {checkoutError && <p className="hub-error">{checkoutError}</p>}
        </form>
      )}
    </Panel>
    {showChat && <LocalistChat />}
    </div>
  );
}

const CHAT_UPLOAD_MIME_TYPES = ['image/gif', 'image/png', 'image/jpeg', 'image/webp'];
const CHAT_UPLOAD_MAX_BYTES = 1 * 1024 * 1024;
const URL_PATTERN = /(https?:\/\/[^\s<]+)/gi;

function isEmbeddableGifPage(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const href = parsed.href.toLowerCase();
    const directImage = /\.(gif|png|jpe?g|webp)(\?|#|$)/.test(href) || href.startsWith('data:image/');
    return !directImage && (host.includes('giphy.com') || host.includes('tenor.com'));
  } catch (_err) {
    return false;
  }
}

function MessageText({ text }) {
  if (!text) return null;
  const parts = String(text).split(URL_PATTERN);
  return (
    <p>
      {parts.map((part, index) => (
        /^https?:\/\//i.test(part) ? (
          <a href={part} target="_blank" rel="noreferrer" key={`${part}-${index}`}>
            {part}
          </a>
        ) : part
      ))}
    </p>
  );
}

function LocalistChat() {
  const [messages, setMessages] = useState([]);
  const [senderName, setSenderName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('le:localistChatName') || '';
  });
  const [draftName, setDraftName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('le:localistChatName') || '';
  });
  const [joined, setJoined] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem('le:localistChatName');
  });
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUpload, setImageUpload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const uploadInputRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const data = await api('/api/hub/localist-chat');
    setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    loadMessages().catch(() => {});
    const timer = window.setInterval(() => loadMessages().catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  const joinChat = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    if (!name) return;
    setSenderName(name);
    setJoined(true);
    setError('');
    if (typeof window !== 'undefined') window.localStorage.setItem('le:localistChatName', name);
  };

  const leaveChatName = () => {
    setJoined(false);
    setDraftName(senderName);
  };

  const attachUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!CHAT_UPLOAD_MIME_TYPES.includes(file.type)) {
      setError('Upload a GIF, PNG, JPG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > CHAT_UPLOAD_MAX_BYTES) {
      setError('Upload must be 1 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUpload({
        dataUrl: String(reader.result || ''),
        name: file.name,
        mimeType: file.type,
      });
    };
    reader.onerror = () => setError('Unable to read that upload.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const clearUpload = () => {
    setImageUpload(null);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const submit = async (event) => {
    event.preventDefault();
    const name = senderName.trim();
    const text = body.trim();
    const media = imageUrl.trim();
    if (!joined || !name || (!text && !media && !imageUpload)) return;

    setBusy(true);
    setError('');
    try {
      await api('/api/hub/localist-chat', null, {
        method: 'POST',
        body: JSON.stringify({
          senderName: name,
          body: text,
          imageUrl: media,
          imageUpload,
        }),
      });
      setBody('');
      setImageUrl('');
      clearUpload();
      await loadMessages();
    } catch (err) {
      setError(err.message || 'Unable to send message.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Localist Chat" icon={MessageSquare}>
      <div className="hub-message-list hub-localist-chat-list">
        {messages.length === 0 && <p className="hub-empty">No messages yet.</p>}
        {messages.map((message) => (
          <div className="hub-message" key={message.id}>
            <strong>{message.senderName || 'Guest'} / {age(message.createdAt)}</strong>
            <MessageText text={message.body} />
            {message.attachments?.map((attachment) => (
              attachment.type === 'image' && attachment.url ? (
                isEmbeddableGifPage(attachment.url) ? (
                  <div className="hub-message-attachment" key={attachment.url}>
                    <iframe src={attachment.url} title="GIF" loading="lazy" />
                    <a className="hub-message-attachment-source" href={attachment.url} target="_blank" rel="noreferrer">Open GIF</a>
                  </div>
                ) : (
                  <a className="hub-message-attachment" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
                    <img src={attachment.url} alt={attachment.name || ''} loading="lazy" />
                  </a>
                )
              ) : null
            ))}
          </div>
        ))}
      </div>
      {!joined ? (
        <form className="hub-form hub-localist-chat-join" onSubmit={joinChat}>
          <Field label="Name">
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} autoComplete="name" required />
          </Field>
          <button className="hub-primary-button" type="submit" disabled={!draftName.trim()}>
            <MessageSquare size={13} /> Join chat
          </button>
          {error && <p className="hub-error">{error}</p>}
        </form>
      ) : (
        <form className="hub-form hub-localist-chat-form" onSubmit={submit}>
          <div className="hub-localist-chat-identity">
            <span>{senderName}</span>
            <button type="button" onClick={leaveChatName}>Change</button>
          </div>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Ask a question or share an update..."
              rows={2}
            />
          </Field>
          <Field label="Image/GIF link">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." inputMode="url" autoComplete="url" />
          </Field>
          <div className="hub-localist-chat-upload">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/gif,image/png,image/jpeg,image/webp"
              onChange={attachUpload}
            />
            <button type="button" onClick={() => uploadInputRef.current?.click()}>
              <Upload size={13} /> Upload
            </button>
            {imageUpload && (
              <div className="hub-localist-upload-preview">
                <img src={imageUpload.dataUrl} alt="" />
                <span>{imageUpload.name}</span>
                <button type="button" onClick={clearUpload} aria-label="Remove upload">
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
          <button className="hub-primary-button" type="submit" disabled={busy || (!body.trim() && !imageUrl.trim() && !imageUpload)}>
            <Send size={13} /> {busy ? 'Sending...' : 'Send'}
          </button>
          {error && <p className="hub-error">{error}</p>}
        </form>
      )}
    </Panel>
  );
}

function SecurityPasswordGate({ children }) {
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
            autoFocus
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

function SecurityView() {
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

function SecurityGuestShell() {
  return (
    <div className="hub-app hub-app-guest">
      <style>{hubCss}</style>
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

function LocalistClosedScreen() {
  return (
    <>
      <style>{hubCss}</style>
      <main className="hub-auth-screen">
        <section className="hub-auth-card">
          <div className="hub-brand">
            <ShieldCheck size={24} />
            <div>
              <h1>This menu has closed</h1>
              <p>The Localist link is no longer live.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function LocalistGuestShell({ localistWindow }) {
  const expiresAt = localistWindow?.expiresAt
    ? new Date(localistWindow.expiresAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackLocalistActivity('localist.window.viewed', {
      metadata: {
        windowId: localistWindow?.id || '',
        expiresAt: localistWindow?.expiresAt || '',
      },
    });
  }, [localistWindow]);

  return (
    <div className="hub-app hub-app-guest">
      <style>{hubCss}</style>
      <main className="hub-main">
        <header className="hub-topbar">
          <div>
            <h1>Localist</h1>
            <p>{expiresAt ? `Open until ${expiresAt}` : 'Localist view'}</p>
          </div>
        </header>
        <div className="hub-guest-content">
          <LocalistView />
        </div>
      </main>
    </div>
  );
}

export default function HubPage() {
  const auth = useSupabaseAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';
  const localistToken = new URLSearchParams(window.location.search).get('localist') || '';
  const hubPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const isSecurityRoute = hubPath === '/hub/security';
  const isInputsRoute = hubPath === '/hub/inputs';
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [localistAccess, setLocalistAccess] = useState({ loaded: !localistToken, window: null });
  const [tab, setTab] = useState(isSecurityRoute ? 'security' : isInputsRoute ? 'foodInputs' : 'today');
  // Privileged-only "view as" override: see the whole Hub as a staff or customer
  // would. null = view with your real (privileged) access. Production-safe: only
  // a genuinely privileged profile can set this; it never elevates access.
  const [viewAs, setViewAs] = useState(null); // null | 'staff' | 'customer'
  const [people, setPeople] = useState([]);
  const [docs, setDocs] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => { meta.setAttribute('content', ''); };
  }, []);

  useEffect(() => {
    if (!localistToken) return;
    setLocalistAccess({ loaded: false, window: null });
    api(`/api/hub/localist-window?token=${encodeURIComponent(localistToken)}`)
      .then((data) => setLocalistAccess({ loaded: true, window: data.window || null }))
      .catch(() => setLocalistAccess({ loaded: true, window: null }));
  }, [localistToken]);

  const loadProfile = useCallback(async () => {
    if (!auth.accessToken) return;
    setProfileLoaded(false);
    try {
      const data = await api('/api/hub/profile', auth.accessToken);
      setProfile(data.profile || null);
    } finally {
      setProfileLoaded(true);
    }
  }, [auth.accessToken]);

  const reloadDocs = useCallback(async () => {
    const data = await api('/api/hub/docs', auth.accessToken);
    setDocs(data.documents || []);
  }, [auth.accessToken]);

  const loadShellData = useCallback(async () => {
    if (!auth.accessToken || !profile) return;
    if (profile.accessLevel === 'customer') return;
    const start = todayIso();
    const [peopleData, docsData, calendarData, convData, shiftData] = await Promise.all([
      api('/api/hub/people', auth.accessToken),
      api('/api/hub/docs', auth.accessToken),
      api(`/api/hub/calendar?view=week&date=${start}`, auth.accessToken),
      api('/api/hub/conversations', auth.accessToken),
      api(`/api/hub/shifts?from=${start}&to=${addDays(start, 14)}`, auth.accessToken),
    ]);
    setPeople(peopleData.people || []);
    setDocs(docsData.documents || []);
    setCalendar(calendarData.objects || []);
    setConversations(convData.conversations || []);
    setShifts(shiftData.shifts || []);
  }, [auth.accessToken, profile]);

  useEffect(() => { loadProfile().catch(() => setProfileLoaded(true)); }, [loadProfile]);
  useEffect(() => { loadShellData().catch(() => {}); }, [loadShellData]);

  // Real access from the profile (the source of truth for what's permitted).
  const actualIsPrivileged = !!profile && (profile.accessLevel === 'privileged' || profile.isPrivileged || auth.isAdmin);
  const isLocalist = !!profile && profile.accessLevel === 'localist';
  const actualIsCustomer = !!profile && profile.accessLevel === 'customer';

  // Effective role used to RENDER the Hub. A privileged user can preview the Hub
  // as staff or customer via `viewAs`; this only ever narrows what they see, never
  // grants access. Non-privileged users always render at their real role.
  const canViewAs = actualIsPrivileged;
  const effectiveViewAs = canViewAs ? viewAs : null;
  const isPrivileged = actualIsPrivileged && !effectiveViewAs;
  const isCustomer = actualIsCustomer || effectiveViewAs === 'customer';
  const adminTab = { id: 'admin', label: 'Admin', icon: ShieldCheck };
  const localistTab = { id: 'localist', label: 'Localist', icon: ShoppingCart };
  const securityTab = { id: 'security', label: 'Security at Neon', icon: ShieldCheck };
  // Customer-visible tabs: Today, Weekly Meal Prep, Chat (only their own data).
  const todayTab = tabs[0];
  const chatTab = tabs.find((t) => t.id === 'chat');
  const customerTabs = [todayTab, mealPrepTab, chatTab];
  const navTabs = isInputsRoute
    ? [foodInputsTab]
    : isLocalist
    ? [localistTab]
    : isCustomer
    ? customerTabs
    : isPrivileged
    ? [...tabs, mealPrepTab, foodInputsTab, adminTab, localistTab, securityTab]
    : [...tabs, mealPrepTab, foodInputsTab, localistTab, securityTab];
  const mobileNavTabs = isInputsRoute
    ? [foodInputsTab]
    : isLocalist
    ? [localistTab]
    : isCustomer
    ? customerTabs
    : isPrivileged
    ? [tabs[0], tabs[1], mealPrepTab, foodInputsTab, adminTab, localistTab, securityTab]
    : [tabs[0], tabs[1], mealPrepTab, foodInputsTab, tabs[3], localistTab, securityTab];
  // Tabs a customer is allowed to land on; anything else falls back to Today.
  const customerTabIds = new Set(customerTabs.map((t) => t.id));
  const activeTab = isInputsRoute
    ? 'foodInputs'
    : isLocalist
    ? 'localist'
    : isCustomer
    ? (customerTabIds.has(tab) ? tab : 'today')
    : tab;

  if (localistToken) {
    if (!localistAccess.loaded) {
      return (
        <>
          <style>{hubCss}</style>
          <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>
        </>
      );
    }
    if (!localistAccess.window?.valid) return <LocalistClosedScreen />;
    return <LocalistGuestShell localistWindow={localistAccess.window} />;
  }

  if (isSecurityRoute) return <SecurityGuestShell />;

  if (auth.loading) {
    return (
      <>
        <style>{hubCss}</style>
        <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>
      </>
    );
  }
  if (!auth.user) {
    return (
      <>
        <style>{hubCss}</style>
        <HubAuthScreen auth={auth} inviteToken={inviteToken} />
      </>
    );
  }
  if (profileLoaded && !profile) {
    return (
      <>
        <style>{hubCss}</style>
        <ProfileSetup accessToken={auth.accessToken} inviteToken={inviteToken} onDone={loadProfile} />
      </>
    );
  }
  if (!profileLoaded) {
    return (
      <>
        <style>{hubCss}</style>
        <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>
      </>
    );
  }

  return (
    <div className="hub-app">
      <style>{hubCss}</style>
      <aside className="hub-sidebar">
        <div className="hub-logo">
          <ShieldCheck size={18} />
          <div>
            <strong>Hub</strong>
            <span>{profile.displayName}</span>
          </div>
        </div>
        <nav>
          {navTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeTab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <button className="hub-signout" onClick={auth.signOut}><LogOut size={13} /> Sign out</button>
      </aside>

      <main className="hub-main">
        <header className="hub-topbar">
          <div>
            <h1>{navTabs.find((item) => item.id === activeTab)?.label || 'Hub'}</h1>
            <p>
              {isLocalist ? 'Localist view' : isCustomer ? 'Customer view' : isPrivileged ? 'Privileged view' : 'Staff view'}
              {effectiveViewAs && <span className="hub-pill" style={{ marginLeft: 8 }}>previewing as {effectiveViewAs}</span>}
            </p>
          </div>
          <div className="hub-button-row">
            {canViewAs && (
              <div className="hub-button-row hub-viewas" title="Preview the Hub as a staff or customer would see it">
                <button className={!viewAs ? 'is-active' : ''} onClick={() => setViewAs(null)}>Privileged</button>
                <button className={viewAs === 'staff' ? 'is-active' : ''} onClick={() => setViewAs('staff')}>Staff</button>
                <button className={viewAs === 'customer' ? 'is-active' : ''} onClick={() => setViewAs('customer')}>Customer</button>
              </div>
            )}
            <button onClick={loadShellData}><RefreshCw size={13} /> Refresh</button>
          </div>
        </header>

        {activeTab === 'today' && isCustomer && <CustomerHomeView accessToken={auth.accessToken} setTab={setTab} />}
        {activeTab === 'today' && !isCustomer && <TodayView calendar={calendar} docs={docs} conversations={conversations} shifts={shifts} setTab={setTab} accessToken={auth.accessToken} isCustomer={isCustomer} />}
        {/* Privileged "view as customer" hides the staff House Notepad via isCustomer above. */}
        {(activeTab === 'calendar' || activeTab === 'shifts') && <CalendarView accessToken={auth.accessToken} profile={profile} isPrivileged={isPrivileged} />}
        {activeTab === 'chat' && <ChatView accessToken={auth.accessToken} people={people} currentUserId={profile.userId} />}
        {activeTab === 'docs' && <DocsView accessToken={auth.accessToken} docs={docs} reloadDocs={reloadDocs} isPrivileged={isPrivileged} />}
        {activeTab === 'people' && <PeopleView people={people} onMessage={() => setTab('chat')} />}
        {activeTab === 'weeklyMealPrep' && <WeeklyMealPrepView accessToken={auth.accessToken} isPrivileged={isPrivileged} isCustomer={isCustomer} />}
        {activeTab === 'foodInputs' && <FoodInputsView accessToken={auth.accessToken} />}
        {activeTab === 'admin' && isPrivileged && <PrivilegedTools accessToken={auth.accessToken} reloadDocs={reloadDocs} />}
        {activeTab === 'localist' && <LocalistView />}
        {activeTab === 'security' && <SecurityView />}
      </main>

      <nav className="hub-mobile-nav">
        {mobileNavTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activeTab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const hubCss = `
.hub-app,
.hub-auth-screen {
  --hub-bg: #f5f3ee;
  --hub-panel: #ffffff;
  --hub-ink: #1a1d1b;
  --hub-muted: #6b7068;
  --hub-border: #e0dbd0;
  --hub-border-light: #ece8e0;
  --hub-accent: #345c51;
  --hub-accent-bg: #eaf1ee;
  --hub-accent-text: #ffffff;
  --hub-row-hover: #f8f6f1;
}
.hub-app {
  min-height: 100vh;
  display: flex;
  background: var(--hub-bg);
  color: var(--hub-ink);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

/* ── Sidebar ── */
.hub-sidebar {
  width: 216px;
  min-width: 216px;
  background: #eee9df;
  border-right: 1px solid var(--hub-border);
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.hub-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 10px;
  border-bottom: 1px solid var(--hub-border);
  margin-bottom: 4px;
}
.hub-logo strong { display: block; font-size: 14px; font-weight: 700; line-height: 1; }
.hub-logo span { display: block; font-size: 11px; color: var(--hub-muted); margin-top: 2px; }
.hub-sidebar nav { display: flex; flex-direction: column; gap: 1px; flex: 1; }
.hub-sidebar nav button {
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--hub-ink);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.hub-sidebar nav button:hover { background: rgba(0,0,0,0.05); }
.hub-sidebar nav button.is-active {
  background: var(--hub-accent);
  color: var(--hub-accent-text);
  font-weight: 600;
}
.hub-signout {
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--hub-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--hub-border);
}
.hub-signout:hover { color: #7a2f2f; }

/* ── Main area ── */
.hub-main { flex: 1; min-width: 0; padding: 16px 20px 72px; overflow: auto; }
.hub-app-guest .hub-main { max-width: 760px; margin: 0 auto; width: 100%; }
.hub-guest-content { display: grid; gap: 12px; }
.hub-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--hub-border);
}
.hub-topbar h1 { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.2; }
.hub-topbar p { margin: 2px 0 0; font-size: 11px; color: var(--hub-muted); }
.hub-topbar button,
.hub-panel-head button,
.hub-button-row button,
.hub-person button,
.hub-shift-action {
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.hub-topbar button:hover,
.hub-panel-head button:hover,
.hub-button-row button:hover,
.hub-person button:hover,
.hub-shift-action:hover { background: var(--hub-row-hover); }
.hub-button-row { display: flex; gap: 4px; }
.hub-button-row button.is-active { background: var(--hub-accent-bg); color: var(--hub-accent); border-color: #b9d1c8; }

/* ── Grid & panels ── */
.hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.hub-panel {
  background: var(--hub-panel);
  border: 1px solid var(--hub-border);
  border-radius: 7px;
  overflow: hidden;
}
.hub-panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--hub-border-light);
}
.hub-panel-title { display: flex; align-items: center; gap: 7px; }
.hub-panel h2 { margin: 0; font-size: 13px; font-weight: 600; }
.hub-subhead { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--hub-muted); margin: 12px 14px 4px; }

/* ── Lists & rows ── */
.hub-list { display: flex; flex-direction: column; }
.hub-row {
  border-bottom: 1px solid var(--hub-border-light);
  background: transparent;
  padding: 8px 14px;
  text-align: left;
}
.hub-row:last-child { border-bottom: none; }
.hub-row strong { display: block; font-size: 13px; font-weight: 600; line-height: 1.35; }
.hub-row span { display: block; color: var(--hub-muted); font-size: 11px; margin-top: 1px; }
.hub-row-button { width: 100%; cursor: pointer; background: transparent; border: none; }
.hub-row-button:hover { background: var(--hub-row-hover); }
.hub-row-button.is-active { background: var(--hub-accent-bg); }
.hub-row-button.is-active strong { color: var(--hub-accent); }
.hub-empty { color: var(--hub-muted); font-size: 12px; margin: 0; padding: 10px 14px; }

/* ── Calendar ── */
.hub-schedule-stack { display: grid; gap: 12px; }
.hub-calendar-list { display: flex; flex-direction: column; gap: 16px; padding: 12px 14px; }
.hub-calendar-shell { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 12px; align-items: start; }
.hub-day h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hub-muted); margin: 0 0 6px; }
.hub-calendar-item {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 2px 10px;
  padding: 7px 10px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  margin-bottom: 4px;
}
.hub-calendar-item span { font-size: 11px; font-weight: 700; color: var(--hub-accent); }
.hub-calendar-item strong { font-size: 13px; font-weight: 600; }
.hub-calendar-item small { grid-column: 2; color: var(--hub-muted); font-size: 11px; }
.hub-calendar-widget {
  margin: 12px 14px 12px 0;
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  background: var(--hub-bg);
  padding: 10px;
  display: grid;
  gap: 6px;
}
.hub-calendar-widget strong { font-size: 12px; }
.hub-calendar-widget span,
.hub-calendar-widget small { color: var(--hub-muted); font-size: 11px; }

/* ── Chat ── */
.hub-chat-layout { display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: 12px; }
.hub-doc-layout { display: grid; grid-template-columns: minmax(200px, 260px) 1fr minmax(200px, 280px); gap: 12px; }
.hub-message-list {
  min-height: 50vh;
  max-height: 60vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
}
.hub-message { padding: 8px 10px; background: var(--hub-bg); border-radius: 5px; }
.hub-message strong { color: var(--hub-muted); font-size: 11px; display: block; margin-bottom: 3px; }
.hub-message p { margin: 0; font-size: 13px; line-height: 1.45; }
.hub-compose { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--hub-border-light); }

/* ── Inputs & forms ── */
.hub-compose input,
.hub-field input,
.hub-field select,
.hub-field textarea,
.hub-copy-box input {
  width: 100%;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  padding: 0 10px;
  height: 32px;
  font-size: 13px;
  background: var(--hub-panel);
  color: var(--hub-ink);
}
.hub-field textarea { height: auto; padding: 8px 10px; }
.hub-compose button, .hub-primary-button {
  height: 32px;
  border: 0;
  border-radius: 5px;
  background: var(--hub-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  cursor: pointer;
  white-space: nowrap;
}
.hub-primary-button:disabled { opacity: 0.45; cursor: not-allowed; }
.hub-form { display: grid; gap: 10px; padding: 12px 14px; }
.hub-field span { display: block; margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--hub-muted); text-transform: uppercase; letter-spacing: 0.03em; }

/* ── Docs ── */
.hub-doc-body { padding: 12px 14px; }
.hub-doc-body pre { white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.6; }
.hub-doc-summary { color: var(--hub-muted); font-size: 12px; margin: 0 0 10px; }

/* ── People ── */
.hub-people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; padding: 12px 14px; }
.hub-person {
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  background: var(--hub-bg);
  padding: 10px 12px;
  display: grid;
  gap: 3px;
}
.hub-person strong { font-size: 13px; font-weight: 600; }
.hub-person span, .hub-person small { color: var(--hub-muted); font-size: 11px; overflow-wrap: anywhere; }
.hub-person button { margin-top: 6px; }

/* ── Shifts ── */
.hub-shift {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--hub-border-light);
}
.hub-shift:last-child { border-bottom: none; }
.hub-shift strong { display: block; font-size: 13px; font-weight: 600; }
.hub-shift span, .hub-shift small { display: block; color: var(--hub-muted); font-size: 11px; margin-top: 1px; }
.hub-pill {
  border: 1px solid var(--hub-border);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--hub-accent);
  white-space: nowrap;
}

/* ── Weekly meal prep ── */
.hub-meal-prep { display: grid; gap: 12px; }
.hub-customer-table-wrap {
  max-height: min(430px, 52svh);
  overflow: auto;
  border-top: 1px solid var(--hub-border-light);
}
.hub-customer-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
  font-size: 12px;
}
.hub-customer-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--hub-panel);
  border-bottom: 1px solid var(--hub-border);
  color: var(--hub-muted);
  font-size: 11px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 10px;
}
.hub-customer-table td {
  vertical-align: top;
  border-bottom: 1px solid var(--hub-border-light);
  padding: 9px 10px;
}
.hub-customer-table strong,
.hub-customer-table span,
.hub-customer-table small {
  display: block;
}
.hub-customer-table small,
.hub-customer-table span:not(:first-child) {
  color: var(--hub-muted);
  font-size: 11px;
  margin-top: 2px;
}
.hub-spend-cell .hub-spend-emails {
  margin-top: 4px;
  color: var(--hub-accent, #5c7a4f);
}
.hub-wordpad-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--hub-border-light);
  overflow-x: auto;
}
.hub-wordpad-tabs button {
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.hub-wordpad-tabs button.is-active {
  background: var(--hub-accent-bg);
  border-color: #b9d1c8;
  color: var(--hub-accent);
}
.hub-wordpad-tabs span {
  margin-left: auto;
  color: var(--hub-muted);
  font-size: 11px;
  white-space: nowrap;
}
.hub-wordpad {
  width: 100%;
  min-height: 340px;
  border: 0;
  outline: 0;
  resize: vertical;
  padding: 12px 14px;
  background: #fff;
  color: var(--hub-ink);
  font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.hub-markdown-preview {
  min-height: 260px;
  padding: 12px 14px;
  background: #fff;
}
.hub-markdown-preview h2,
.hub-markdown-preview h3,
.hub-markdown-preview h4 { margin: 10px 0 5px; font-weight: 700; }
.hub-markdown-preview h2 { font-size: 17px; }
.hub-markdown-preview h3 { font-size: 15px; }
.hub-markdown-preview h4 { font-size: 13px; }
.hub-markdown-preview p {
  margin: 0 0 5px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}

/* ── Food Inputs date bar ── */
.hub-foodinputs-datebar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  border-bottom: 1px solid var(--hub-border-light);
  padding-bottom: 6px;
}
.hub-foodinputs-tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  scrollbar-width: thin;
  padding-bottom: 4px;
}
.hub-foodinputs-tabs button {
  flex: 0 0 auto;
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.hub-foodinputs-tabs button:hover { background: var(--hub-row-hover); }
.hub-foodinputs-tabs button.is-active {
  background: var(--hub-accent-bg);
  color: var(--hub-accent);
  border-color: #b9d1c8;
  font-weight: 600;
}
.hub-foodinputs-datepick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  padding: 0 8px;
  height: 28px;
  font-size: 12px;
  color: var(--hub-muted);
}
.hub-foodinputs-datepick input {
  border: 0;
  outline: 0;
  background: transparent;
  font: 12px Inter, system-ui, sans-serif;
  color: var(--hub-ink);
}
.hub-foodinputs-status { padding: 6px 0 2px; }
.hub-foodinputs-status span { color: var(--hub-muted); font-size: 11px; }

/* ── Prep & Packaging rollup ── */
.hub-rollup-unresolved {
  margin: 8px 0;
  padding: 8px 10px;
  border: 1px solid #e6c89b;
  background: #fdf4e3;
  border-radius: 6px;
  font-size: 12px;
  color: #7a5a1e;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hub-rollup-packaging { list-style: none; margin: 8px 0 0; padding: 0; }
.hub-rollup-packaging li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--hub-border-light);
  font-size: 14px;
  text-transform: capitalize;
}
.hub-rollup-packaging li.is-unresolved { color: var(--hub-muted); }
.hub-rollup-qty {
  min-width: 26px;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--hub-accent);
}
.hub-rollup-ok { color: var(--hub-accent); flex: 0 0 auto; }
.hub-rollup-canon { color: var(--hub-muted); font-style: italic; }
.hub-dish-desc { display: block; color: var(--hub-muted); font-size: 11px; margin-top: 1px; }
.hub-pill-muted { background: var(--hub-bg); color: var(--hub-muted); }
.hub-viewas { border: 1px solid var(--hub-border); border-radius: 6px; padding: 2px; margin-right: 6px; }
.hub-viewas button { font-size: 11px; }
.hub-canon { padding: 4px 0; }
.hub-menu-meal { margin-top: 6px; }
.hub-menu-meal h5 {
  margin: 8px 0 2px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--hub-muted);
}
.hub-rollup-cook, .hub-rollup-bags { margin-top: 8px; display: flex; flex-direction: column; gap: 12px; }
.hub-rollup-chef, .hub-rollup-bag {
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  padding: 8px 10px;
  background: #fff;
}
.hub-rollup-chef h4, .hub-rollup-bag h4 { margin: 0 0 6px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
.hub-rollup-day { margin: 6px 0 0 8px; }
.hub-rollup-day h5 { margin: 0 0 4px; font-size: 12px; color: var(--hub-muted); }
.hub-rollup-station { display: flex; gap: 8px; align-items: flex-start; margin: 4px 0; }
.hub-rollup-station ul, .hub-rollup-bag ul { list-style: none; margin: 0; padding: 0; font-size: 13px; }
.hub-rollup-station li, .hub-rollup-bag li { padding: 2px 0; }
@media print {
  .hub-button-row, .hub-foodinputs-status, .hub-empty { display: none !important; }
}

/* ── Food Inputs spreadsheet ── */
.hub-sheet { padding: 4px 0 2px; }
.hub-sheet-scroll { overflow-x: auto; border: 1px solid var(--hub-border); border-radius: 6px; background: #fff; }
.hub-sheet-table { border-collapse: collapse; width: 100%; min-width: 480px; }
.hub-sheet-table th,
.hub-sheet-table td {
  border: 1px solid var(--hub-border-light);
  padding: 0;
  vertical-align: middle;
}
.hub-sheet-table th { background: var(--hub-bg); }
.hub-sheet-table input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 7px 9px;
  font: 13px/1.4 Inter, system-ui, sans-serif;
  color: var(--hub-ink);
}
.hub-sheet-table th input { font-weight: 600; }
.hub-sheet-table input:focus { background: var(--hub-accent-bg); }
.hub-sheet-rownum {
  width: 30px;
  min-width: 30px;
  text-align: center;
  background: var(--hub-bg);
}
.hub-sheet-rownum button {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--hub-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.hub-sheet-rownum button:hover { background: rgba(0,0,0,0.06); color: #7a2f2f; }

/* ── Misc ── */
.hub-copy-box { padding: 0 14px 12px; display: grid; gap: 6px; }
.hub-copy-box strong { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--hub-muted); }
.hub-localist-analytics {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
}
.hub-localist-window-card {
  display: grid;
  gap: 8px;
  border: 1px solid var(--hub-border-light);
  border-radius: 6px;
  padding: 10px;
  background: var(--hub-bg);
}
.hub-localist-window-card small {
  color: var(--hub-muted);
  font-size: 11px;
}
.hub-localist-window-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.hub-localist-window-head strong,
.hub-metric strong {
  display: block;
  color: var(--hub-ink);
  font-size: 13px;
}
.hub-localist-window-head span,
.hub-metric span {
  display: block;
  color: var(--hub-muted);
  font-size: 11px;
}
.hub-localist-order-detail,
.hub-localist-order-items {
  display: grid;
  gap: 4px;
  color: var(--hub-muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.hub-localist-order-items {
  color: var(--hub-ink);
  font-weight: 600;
}
.hub-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.hub-metric {
  min-width: 0;
  border: 1px solid var(--hub-border-light);
  border-radius: 5px;
  padding: 6px 7px;
  background: #fff;
}
.hub-localist-intro { padding: 12px 14px; border-bottom: 1px solid var(--hub-border-light); background: var(--hub-accent-bg); }
.hub-localist-intro small { display: block; color: var(--hub-accent); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.hub-localist-intro h3 { margin: 0; font-size: 16px; line-height: 1.25; font-weight: 700; color: var(--hub-ink); }
.hub-localist-intro p { margin: 6px 0 0; font-size: 13px; line-height: 1.45; color: var(--hub-ink); white-space: pre-wrap; }
.hub-localist-intro span { display: block; margin-top: 6px; color: var(--hub-muted); font-size: 11px; }
.hub-security-password-form { gap: 12px; }
.hub-security-password-prompt {
  margin: 0;
  color: var(--hub-ink);
  font-size: 14px;
  line-height: 1.5;
}
.hub-localist-share {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--hub-border-light);
}
.hub-localist-share button {
  height: 30px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  font-weight: 600;
  cursor: pointer;
}
.hub-localist-share span {
  min-width: 0;
  color: var(--hub-muted);
  font-size: 11px;
  text-align: right;
}
.hub-localist-form { gap: 12px; }
.hub-localist-list {
  display: grid;
  gap: 8px;
}
.hub-localist-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--hub-border-light);
  border-radius: 6px;
}
.hub-localist-item.is-sold-out {
  opacity: 0.68;
}
.hub-localist-item.is-sold-out .hub-localist-item-copy > strong,
.hub-localist-item.is-sold-out .hub-localist-item-copy > span:not(.hub-localist-inventory) {
  text-decoration: line-through;
}
.hub-localist-item-copy { min-width: 0; }
.hub-localist-item-copy strong {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 7px;
}
.hub-localist-price { color: var(--hub-accent); font-weight: 700; white-space: nowrap; }
.hub-localist-inventory {
  display: block;
  margin-top: 4px;
  color: var(--hub-muted);
  font-size: 11px;
  font-weight: 700;
}
.hub-localist-inventory.is-low {
  color: #b4611a;
}
.hub-localist-inventory.is-sold-out {
  color: #9b2f2f;
}
.hub-localist-flags,
.hub-localist-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.hub-localist-flags span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 1px solid var(--hub-border);
  border-radius: 999px;
  padding: 2px 8px;
  color: var(--hub-muted);
  background: #fff;
  font-size: 11px;
  font-weight: 600;
}
.hub-localist-option {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  border: 1px solid var(--hub-border-light);
  border-radius: 5px;
  padding: 3px 7px;
  background: #fff;
  color: var(--hub-ink);
  font-size: 11px;
  font-weight: 600;
}
.hub-localist-option input {
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: var(--hub-accent);
}
.hub-localist-quantity {
  width: 112px;
  height: 30px;
  display: grid;
  grid-template-columns: 30px 1fr 30px;
  align-items: stretch;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  overflow: hidden;
  background: var(--hub-panel);
}
.hub-localist-quantity button {
  border: 0;
  background: var(--hub-row-hover);
  color: var(--hub-ink);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.hub-localist-quantity button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.hub-localist-quantity input {
  min-width: 0;
  width: 100%;
  border: 0;
  border-left: 1px solid var(--hub-border);
  border-right: 1px solid var(--hub-border);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--hub-ink);
  background: #fff;
}
.hub-localist-checkout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--hub-border);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--hub-accent-bg);
}
.hub-localist-checkout span,
.hub-localist-checkout small {
  display: block;
  color: var(--hub-muted);
  font-size: 11px;
}
.hub-localist-checkout strong {
  display: block;
  color: var(--hub-ink);
  font-size: 18px;
  line-height: 1.2;
}
.hub-localist-chat-list {
  min-height: 240px;
  max-height: min(460px, 52svh);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.hub-localist-chat-list .hub-message {
  overflow-wrap: anywhere;
}
.hub-localist-chat-list .hub-message a {
  color: var(--hub-accent);
  font-weight: 600;
}
.hub-localist-chat-join {
  border-top: 1px solid var(--hub-border-light);
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
}
.hub-localist-chat-form {
  border-top: 1px solid var(--hub-border-light);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}
.hub-localist-chat-identity,
.hub-localist-chat-form .hub-field:nth-of-type(1),
.hub-localist-chat-upload,
.hub-localist-chat-form .hub-error {
  grid-column: 1 / -1;
}
.hub-localist-chat-identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  color: var(--hub-muted);
  font-size: 12px;
}
.hub-localist-chat-identity span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hub-ink);
  font-weight: 700;
}
.hub-localist-chat-identity button,
.hub-localist-chat-upload > button,
.hub-localist-upload-preview button {
  height: 28px;
  border: 1px solid var(--hub-border);
  border-radius: 5px;
  background: var(--hub-panel);
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.hub-localist-chat-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.hub-localist-chat-upload > input {
  display: none;
}
.hub-localist-upload-preview {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--hub-border-light);
  border-radius: 6px;
  padding: 5px;
  background: var(--hub-bg);
}
.hub-localist-upload-preview img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  background: #fff;
}
.hub-localist-upload-preview span {
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hub-muted);
  font-size: 11px;
  font-weight: 600;
}
.hub-localist-chat-form .hub-primary-button {
  justify-self: end;
  min-width: 140px;
}
.hub-message-attachment {
  display: block;
  margin-top: 8px;
  width: min(320px, 100%);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--hub-border-light);
  background: #fff;
}
.hub-message-attachment img {
  display: block;
  width: 100%;
  max-height: min(320px, 45svh);
  object-fit: contain;
  background: #fff;
}
.hub-message-attachment iframe {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: min(360px, 45svh);
  border: 0;
  background: #fff;
}
.hub-message-attachment-source {
  display: block;
  border-top: 1px solid var(--hub-border-light);
  padding: 7px 8px;
  background: var(--hub-bg);
  color: var(--hub-accent);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

/* ── Auth screens ── */
.hub-auth-screen { min-height: 100vh; display: grid; place-items: center; background: var(--hub-bg, #f5f3ee); padding: 18px; }
.hub-auth-card { width: min(440px, 100%); background: #fff; border: 1px solid var(--hub-border); border-radius: 8px; padding: 24px; }
.hub-auth-card .hub-form { padding: 0; }
.hub-brand { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.hub-brand h1, .hub-auth-card h1 { font-size: 20px; font-weight: 700; margin: 0; }
.hub-brand p, .hub-help { color: var(--hub-muted); font-size: 13px; line-height: 1.5; }
.hub-notice { background: #edf5f1; border: 1px solid #b9d1c8; padding: 10px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; font-weight: 600; }
.hub-error { color: #9b2f2f; font-weight: 600; font-size: 13px; margin: 0; }
.hub-text-button { border: 0; background: transparent; color: var(--hub-accent); font-weight: 600; font-size: 13px; margin-top: 10px; cursor: pointer; }

/* ── Mobile nav ── */
.hub-mobile-nav { display: none; }
@media (max-width: 900px) {
  .hub-app { display: block; }
  .hub-sidebar { display: none; }
  .hub-main { padding: 12px 12px 68px; }
  .hub-topbar { margin-bottom: 12px; }
  .hub-grid, .hub-chat-layout, .hub-doc-layout, .hub-calendar-shell { grid-template-columns: 1fr; }
  .hub-calendar-widget { margin: 0 14px 12px; }
  .hub-calendar-item { grid-template-columns: 1fr; }
  .hub-calendar-item small { grid-column: auto; }
  .hub-shift { flex-wrap: wrap; }
  .hub-compose { flex-direction: column; }
  .hub-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hub-localist-window-head { flex-direction: column; }
  .hub-localist-share { align-items: stretch; flex-direction: column; }
  .hub-localist-share button { justify-content: center; width: 100%; min-height: 44px; }
  .hub-localist-share span { text-align: center; }
  .hub-localist-item { grid-template-columns: 1fr; align-items: stretch; }
  .hub-localist-quantity { width: 100%; grid-template-columns: 38px 1fr 38px; }
  .hub-localist-checkout { align-items: stretch; flex-direction: column; }
  .hub-localist-checkout .hub-primary-button { width: 100%; }
  .hub-localist-chat-list {
    min-height: 240px;
    max-height: min(430px, 52svh);
    padding: 10px 12px;
  }
  .hub-localist-chat-list .hub-message {
    padding: 10px 12px;
  }
  .hub-localist-chat-list .hub-message p {
    font-size: 14px;
    line-height: 1.5;
  }
  .hub-localist-chat-join,
  .hub-localist-chat-form {
    grid-template-columns: 1fr;
    gap: 9px;
    padding: 10px 12px 12px;
  }
  .hub-localist-chat-join .hub-primary-button {
    width: 100%;
    min-height: 44px;
  }
  .hub-localist-chat-form .hub-field,
  .hub-localist-chat-form .hub-field:nth-of-type(1),
  .hub-localist-chat-upload,
  .hub-localist-chat-form .hub-error {
    grid-column: 1;
  }
  .hub-localist-chat-identity {
    align-items: stretch;
    flex-direction: column;
  }
  .hub-localist-chat-identity button {
    justify-content: center;
    min-height: 40px;
  }
  .hub-localist-chat-form .hub-field input,
  .hub-localist-chat-form .hub-field textarea {
    min-height: 44px;
    font-size: 16px;
  }
  .hub-localist-chat-form .hub-field textarea {
    padding-top: 10px;
    resize: vertical;
  }
  .hub-localist-chat-form .hub-primary-button {
    justify-self: stretch;
    width: 100%;
    min-height: 44px;
  }
  .hub-localist-chat-upload {
    align-items: stretch;
    flex-direction: column;
  }
  .hub-localist-chat-upload > button {
    justify-content: center;
    min-height: 44px;
  }
  .hub-localist-upload-preview {
    width: 100%;
  }
  .hub-localist-upload-preview span {
    max-width: none;
  }
  .hub-message-attachment {
    width: 100%;
  }
  .hub-message-attachment img {
    max-height: min(320px, 42svh);
  }
  .hub-message-attachment iframe {
    max-height: min(360px, 42svh);
  }
  .hub-mobile-nav {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
    background: #eee9df;
    border-top: 1px solid var(--hub-border);
    padding: 4px 4px 4px;
    padding-bottom: max(4px, env(safe-area-inset-bottom));
  }
  .hub-mobile-nav button {
    height: 48px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--hub-ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
  }
  .hub-mobile-nav button.is-active { color: var(--hub-accent); }
}

/* ── Menu paper: Localist & Security guest menus ──
   Matches the public site identity used by the weekly meals and small-events
   surfaces: brand-token linen/card palette, General Sans headings, rounded
   bordered cards with soft shadows. Brand vars come from brand-tokens.css
   (loaded globally); hex fallbacks mirror those tokens. */
.hub-menu-paper { display: grid; gap: 14px; }
.hub-menu-paper,
.hub-menu-paper .hub-panel {
  font-family: 'Source Sans 3', 'General Sans', system-ui, sans-serif;
  font-size: 14px;
}
.hub-app-guest { background: var(--color-bg-page, #F1E3D8); }
.hub-app-guest .hub-main { max-width: 680px; }
.hub-app-guest .hub-topbar {
  border-bottom: 1px solid var(--color-border-default, #C0BECF);
  padding: 22px 4px 12px;
}
.hub-app-guest .hub-topbar h1 {
  font-family: 'General Sans', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-app-guest .hub-topbar p {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted, rgba(58, 46, 63, 0.6));
}
.hub-menu-paper .hub-panel {
  background: #fdf8f1;
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 16px;
  box-shadow: 0 12px 28px rgba(58, 46, 63, 0.10);
}
.hub-menu-paper .hub-panel-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border-default, #C0BECF);
}
.hub-menu-paper .hub-panel-title svg { display: none; }
.hub-menu-paper .hub-panel-title h2 {
  font-family: 'General Sans', system-ui, sans-serif;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-intro {
  background: rgba(222, 192, 183, 0.30);
  border-bottom: 1px solid var(--color-border-default, #C0BECF);
  padding: 14px 18px;
}
.hub-menu-paper .hub-localist-intro small {
  color: var(--color-text-muted, rgba(58, 46, 63, 0.6));
  font-weight: 700;
  letter-spacing: 0.22em;
}
.hub-menu-paper .hub-localist-intro h3 {
  font-family: 'General Sans', system-ui, sans-serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-intro p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary, rgba(58, 46, 63, 0.78));
}
.hub-menu-paper .hub-localist-intro span {
  color: var(--color-text-muted, rgba(58, 46, 63, 0.6));
  font-size: 12px;
}
.hub-menu-paper .hub-localist-share {
  border-bottom: 1px solid var(--color-border-light, #ece8e0);
  padding: 10px 18px;
}
.hub-menu-paper .hub-localist-share button {
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 999px;
  background: #fff;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-form { padding: 14px 18px 18px; gap: 14px; }
.hub-menu-paper .hub-empty {
  padding: 14px 18px;
  font-size: 14px;
  color: var(--color-text-muted, rgba(58, 46, 63, 0.6));
}
.hub-menu-paper .hub-menu-thanks {
  font-family: 'General Sans', system-ui, sans-serif;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-list { gap: 10px; }
.hub-menu-paper .hub-localist-item {
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  gap: 12px;
}
.hub-menu-paper .hub-localist-item-copy strong {
  font-family: 'General Sans', system-ui, sans-serif;
  font-size: 15.5px;
  font-weight: 700;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-price {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-olive, #7A846E);
}
.hub-menu-paper .hub-localist-item-copy > span {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--color-text-secondary, rgba(58, 46, 63, 0.78));
  margin-top: 2px;
}
.hub-menu-paper .hub-localist-inventory {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, rgba(58, 46, 63, 0.6));
}
.hub-menu-paper .hub-localist-inventory.is-low { color: #b4611a; }
.hub-menu-paper .hub-localist-inventory.is-sold-out { color: #9b2f2f; }
.hub-menu-paper .hub-localist-flags span {
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 999px;
  background: var(--color-bg-page, #F1E3D8);
  color: var(--color-text-secondary, rgba(58, 46, 63, 0.78));
}
.hub-menu-paper .hub-localist-option {
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 999px;
  background: #fff;
  padding: 4px 10px;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-option input { accent-color: var(--brand-olive, #7A846E); }
.hub-menu-paper .hub-localist-quantity {
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 10px;
  background: #fff;
  height: 34px;
  grid-template-columns: 34px 1fr 34px;
}
.hub-menu-paper .hub-localist-quantity button {
  background: var(--color-bg-page, #F1E3D8);
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-quantity input {
  background: #fff;
  border-color: var(--color-border-default, #C0BECF);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-field span {
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-text-muted, rgba(58, 46, 63, 0.6));
}
.hub-menu-paper .hub-field input,
.hub-menu-paper .hub-field select,
.hub-menu-paper .hub-field textarea,
.hub-menu-paper .hub-compose input {
  background: #fff;
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 10px;
  height: 42px;
  font-size: 16px;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-field textarea { height: auto; }
.hub-menu-paper .hub-localist-checkout {
  background: rgba(122, 132, 110, 0.14);
  border: 1px solid var(--color-border-default, #C0BECF);
  border-radius: 12px;
  padding: 12px 14px;
}
.hub-menu-paper .hub-localist-checkout strong {
  font-family: 'General Sans', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary, #3A2E3F);
}
.hub-menu-paper .hub-localist-checkout span,
.hub-menu-paper .hub-localist-checkout small {
  font-weight: 600;
  color: var(--color-text-secondary, rgba(58, 46, 63, 0.78));
}
.hub-menu-paper .hub-primary-button,
.hub-menu-paper .hub-compose button {
  background: var(--color-action-primary-bg, #D28D93);
  color: var(--color-text-primary, #3A2E3F);
  border: 1px solid var(--brand-rose, #C66C78);
  border-radius: 999px;
  height: 42px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 700;
}
.hub-menu-paper .hub-primary-button:hover,
.hub-menu-paper .hub-compose button:hover {
  background: var(--color-action-primary-hover-bg, #D18A90);
}
.hub-menu-paper .hub-security-password-prompt {
  font-size: 15px;
  line-height: 1.55;
  color: var(--color-text-secondary, rgba(58, 46, 63, 0.78));
}
.hub-menu-paper .hub-localist-chat-join,
.hub-menu-paper .hub-localist-chat-form { border-top: 1px solid var(--color-border-default, #C0BECF); }
.hub-menu-paper .hub-message p {
  font-size: 14px;
  color: var(--color-text-secondary, rgba(58, 46, 63, 0.78));
}
@media (max-width: 760px) {
  .hub-app-guest .hub-topbar { padding-top: 16px; }
  .hub-app-guest .hub-topbar h1 { font-size: 24px; }
}
`;
