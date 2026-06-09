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
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const tabs = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'people', label: 'People', icon: UsersRound },
  { id: 'shifts', label: 'Shifts', icon: ClipboardList },
];

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
          Use email and password. Invite links control who can create staff or privileged profiles.
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

function TodayView({ calendar, docs, conversations, shifts, setTab }) {
  const todaysItems = calendar.filter((item) => String(item.startsAt || '').startsWith(todayIso()));
  const openShifts = shifts.filter((shift) => shift.open).slice(0, 4);
  const recentDocs = docs.slice(0, 4);
  const recentChats = conversations.slice(0, 4);

  return (
    <div className="hub-grid">
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
      <Panel title="Open Shifts" icon={ClipboardList} action={<button onClick={() => setTab('shifts')}>View shifts</button>}>
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

function CalendarView({ accessToken }) {
  const [anchor, setAnchor] = useState(todayIso());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const grouped = useMemo(() => {
    const result = new Map();
    items.forEach((item) => {
      const date = String(item.startsAt || item.metadata?.date || '').slice(0, 10) || anchor;
      result.set(date, [...(result.get(date) || []), item]);
    });
    return [...result.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items, anchor]);

  return (
    <Panel
      title="Calendar"
      icon={CalendarDays}
      action={(
        <div className="hub-button-row">
          <button onClick={() => setAnchor(addDays(anchor, -7))}>Previous</button>
          <button onClick={() => setAnchor(todayIso())}>Today</button>
          <button onClick={() => setAnchor(addDays(anchor, 7))}>Next</button>
          <button onClick={load}><RefreshCw size={13} /></button>
        </div>
      )}
    >
      {loading && <p className="hub-empty">Loading calendar...</p>}
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
    </Panel>
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

function ShiftsView({ accessToken, isPrivileged }) {
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

  const createShift = async (event) => {
    event.preventDefault();
    await api('/api/hub/shifts', accessToken, { method: 'POST', body: JSON.stringify(draft) });
    setDraft({ title: '', date: todayIso(), startTime: '09:00', endTime: '' });
    await load();
  };

  return (
    <div className="hub-grid">
      <Panel
        title="Staff Shifts"
        icon={ClipboardList}
        action={<button onClick={() => setFrom(addDays(from, 14))}>Next 2 weeks</button>}
      >
        <div className="hub-list">
          {shifts.map((shift) => (
            <div className="hub-shift" key={shift.id}>
              <div>
                <strong>{shift.title}</strong>
                <span>{formatDate(shift.date)} / {formatTime(shift.startTime)} {shift.endTime ? `to ${formatTime(shift.endTime)}` : ''}</span>
                <small>{shift.people.length ? `Assigned: ${shift.people.join(', ')}` : 'No one assigned yet'}</small>
              </div>
              {shift.open ? (
                <button className="hub-shift-action" onClick={() => claim(shift)}><CheckCircle2 size={14} /> Pick up</button>
              ) : (
                <span className="hub-pill">Covered</span>
              )}
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

  useEffect(() => {
    loadLocalistAnalytics().catch(() => {});
  }, [loadLocalistAnalytics]);

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

function LocalistView() {
  const [items, setItems] = useState(null);
  const [content, setContent] = useState(null);
  const [order, setOrder] = useState({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pickupWindow, setPickupWindow] = useState('');
  const [note, setNote] = useState('');
  const [customerOptions, setCustomerOptions] = useState({});
  const [shareStatus, setShareStatus] = useState('');
  const [checkoutStatus, setCheckoutStatus] = useState(() => (
    new URLSearchParams(window.location.search).get('checkout') === 'localist-success' ? 'success' : 'idle'
  ));
  const [checkoutError, setCheckoutError] = useState('');
  const successTrackedRef = useRef(false);

  useEffect(() => {
    api('/api/hub/localist-menu')
      .then((data) => {
        setContent(data.content || null);
        setItems(data.items || []);
        trackLocalistActivity('localist.menu.loaded', {
          metadata: { itemCount: data.items?.length || 0 },
        });
      })
      .catch(() => {
        setContent(null);
        setItems([]);
      });
  }, []);

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
  const canCheckout = totalQuantity > 0 && totalCents > 0 && name.trim() && pickupWindow && !checkoutBusy;
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
      trackLocalistActivity('localist.cart.updated', { cart: cartPayload });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [cartPayload, totalQuantity]);

  useEffect(() => {
    if (checkoutStatus !== 'success' || successTrackedRef.current) return;
    successTrackedRef.current = true;
    trackLocalistActivity('localist.checkout.success', {
      metadata: { returnedFromSquare: true },
    });
  }, [checkoutStatus]);

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
      trackLocalistActivity('localist.checkout.started', { cart: cartPayload });
      const data = await api('/api/hub/localist-checkout', null, {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: formatPhone(phone),
          pickupWindow,
          note,
          localistToken: params.get('localist') || '',
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
      <>
        <Panel title="Payment Received" icon={CheckCircle2}>
          <p className="hub-empty" style={{ color: 'var(--hub-accent)', fontSize: 20 }}>
            Thanks{name ? `, ${name}` : ''}! Square has processed your Localist checkout.
          </p>
          <button
            className="hub-primary-button"
            style={{ marginTop: 16 }}
            type="button"
            onClick={() => {
              setCheckoutStatus('idle');
              setOrder({});
              setName('');
              setPhone('');
              setPickupWindow('');
              setNote('');
              setCustomerOptions({});
            }}
          >
            Place another order
          </button>
        </Panel>
        <LocalistChat />
      </>
    );
  }

  return (
    <>
    <Panel title="Place an Order" icon={ShoppingCart}>
      {content && (
        <section className="hub-localist-intro">
          {content.eyebrow && <small>{content.eyebrow}</small>}
          {content.headline && <h3>{content.headline}</h3>}
          {content.body && <p>{content.body}</p>}
          {content.note && <span>{content.note}</span>}
        </section>
      )}
      {localistTrackingContext().localistToken && (
        <div className="hub-localist-share">
          <button type="button" onClick={shareLocalistLink}>
            <Send size={13} /> Share menu
          </button>
          {shareStatus && <span>{shareStatus}</span>}
        </div>
      )}
      {items === null && <p className="hub-empty">Loading menu...</p>}
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
                      <span className={`hub-localist-inventory${soldOut ? ' is-sold-out' : ''}`}>
                        {roundedInventoryCount} available{soldOut ? ' - sold out' : ''}
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
          <Field label="Phone (optional)">
            <input value={formatPhone(phone)} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" />
          </Field>
          <Field label="Pickup window">
            <select value={pickupWindow} onChange={(e) => setPickupWindow(e.target.value)} required>
              <option value="">Select pickup window</option>
              {LOCALIST_PICKUP_WINDOWS.map((windowLabel) => (
                <option key={windowLabel} value={windowLabel}>{windowLabel}</option>
              ))}
            </select>
          </Field>
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
    <LocalistChat />
    </>
  );
}

function LocalistChat() {
  const [messages, setMessages] = useState([]);
  const [senderName, setSenderName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('le:localistChatName') || '';
  });
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    const data = await api('/api/hub/localist-chat');
    setMessages(data.messages || []);
  }, []);

  useEffect(() => {
    loadMessages().catch(() => {});
    const timer = window.setInterval(() => loadMessages().catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  const submit = async (event) => {
    event.preventDefault();
    const name = senderName.trim();
    const text = body.trim();
    const media = imageUrl.trim();
    if (!name || (!text && !media)) return;

    setBusy(true);
    setError('');
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem('le:localistChatName', name);
      await api('/api/hub/localist-chat', null, {
        method: 'POST',
        body: JSON.stringify({ senderName: name, body: text, imageUrl: media }),
      });
      setBody('');
      setImageUrl('');
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
            {message.body && <p>{message.body}</p>}
            {message.attachments?.map((attachment) => (
              attachment.type === 'image' && attachment.url ? (
                <a className="hub-message-attachment" href={attachment.url} target="_blank" rel="noreferrer" key={attachment.url}>
                  <img src={attachment.url} alt="" loading="lazy" />
                </a>
              ) : null
            ))}
          </div>
        ))}
      </div>
      <form className="hub-form hub-localist-chat-form" onSubmit={submit}>
        <Field label="Name">
          <input value={senderName} onChange={(e) => setSenderName(e.target.value)} autoComplete="name" required />
        </Field>
        <Field label="Message">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ask a question or share an update..."
            rows={2}
          />
        </Field>
        <Field label="Image/GIF URL">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." inputMode="url" autoComplete="url" />
        </Field>
        <button className="hub-primary-button" type="submit" disabled={busy || !senderName.trim() || (!body.trim() && !imageUrl.trim())}>
          <Send size={13} /> {busy ? 'Sending...' : 'Send'}
        </button>
        {error && <p className="hub-error">{error}</p>}
      </form>
    </Panel>
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
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [localistAccess, setLocalistAccess] = useState({ loaded: !localistToken, window: null });
  const [tab, setTab] = useState('today');
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

  const isPrivileged = !!profile && (profile.accessLevel === 'privileged' || profile.isPrivileged || auth.isAdmin);
  const isLocalist = !!profile && profile.accessLevel === 'localist';
  const adminTab = { id: 'admin', label: 'Admin', icon: ShieldCheck };
  const localistTab = { id: 'localist', label: 'Localist', icon: ShoppingCart };
  const navTabs = isLocalist
    ? [localistTab]
    : isPrivileged
    ? [...tabs, adminTab, localistTab]
    : [...tabs, localistTab];
  const mobileNavTabs = isLocalist
    ? [localistTab]
    : isPrivileged
    ? [tabs[0], tabs[1], tabs[3], tabs[5], adminTab, localistTab]
    : [tabs[0], tabs[1], tabs[2], tabs[3], tabs[5], localistTab];
  const activeTab = isLocalist ? 'localist' : tab;

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
            <p>{isLocalist ? 'Localist view' : isPrivileged ? 'Privileged view' : 'Staff view'}</p>
          </div>
          <button onClick={loadShellData}><RefreshCw size={13} /> Refresh</button>
        </header>

        {activeTab === 'today' && <TodayView calendar={calendar} docs={docs} conversations={conversations} shifts={shifts} setTab={setTab} />}
        {activeTab === 'calendar' && <CalendarView accessToken={auth.accessToken} />}
        {activeTab === 'chat' && <ChatView accessToken={auth.accessToken} people={people} currentUserId={profile.userId} />}
        {activeTab === 'docs' && <DocsView accessToken={auth.accessToken} docs={docs} reloadDocs={reloadDocs} isPrivileged={isPrivileged} />}
        {activeTab === 'people' && <PeopleView people={people} onMessage={() => setTab('chat')} />}
        {activeTab === 'shifts' && <ShiftsView accessToken={auth.accessToken} isPrivileged={isPrivileged} />}
        {activeTab === 'admin' && isPrivileged && <PrivilegedTools accessToken={auth.accessToken} reloadDocs={reloadDocs} />}
        {activeTab === 'localist' && <LocalistView />}
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
.hub-app {
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
.hub-calendar-list { display: flex; flex-direction: column; gap: 16px; padding: 12px 14px; }
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
.hub-localist-chat-form {
  border-top: 1px solid var(--hub-border-light);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}
.hub-localist-chat-form .hub-field:nth-of-type(2),
.hub-localist-chat-form .hub-error {
  grid-column: 1 / -1;
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
  .hub-grid, .hub-chat-layout, .hub-doc-layout { grid-template-columns: 1fr; }
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
  .hub-localist-chat-form {
    grid-template-columns: 1fr;
    gap: 9px;
    padding: 10px 12px 12px;
  }
  .hub-localist-chat-form .hub-field,
  .hub-localist-chat-form .hub-field:nth-of-type(2),
  .hub-localist-chat-form .hub-error {
    grid-column: 1;
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
  .hub-message-attachment {
    width: 100%;
  }
  .hub-message-attachment img {
    max-height: min(320px, 42svh);
  }
  .hub-mobile-nav {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
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
`;
