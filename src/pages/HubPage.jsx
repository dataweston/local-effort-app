import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
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

function Panel({ title, icon: Icon, action, children }) {
  return (
    <section className="hub-panel">
      <div className="hub-panel-head">
        <div className="hub-panel-title">
          {Icon && <Icon size={22} aria-hidden="true" />}
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
          <button onClick={load}><RefreshCw size={18} /></button>
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
          <button type="submit"><Send size={21} aria-hidden="true" /> Send</button>
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
            <button className="hub-primary-button" type="submit"><Plus size={20} /> Publish</button>
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
            <button onClick={() => onMessage(person)}><MessageSquare size={18} /> Message</button>
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
                <button onClick={() => claim(shift)}><CheckCircle2 size={19} /> Pick up</button>
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
            <button className="hub-primary-button" type="submit"><Plus size={20} /> Add shift</button>
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
          <button className="hub-primary-button" type="submit"><UserPlus size={20} /> Create invite</button>
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
          <button className="hub-primary-button" type="submit"><FileText size={20} /> Publish as doc</button>
        </form>
      </Panel>
    </div>
  );
}

export default function HubPage() {
  const auth = useSupabaseAuth();
  const inviteToken = new URLSearchParams(window.location.search).get('invite') || '';
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
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
  const navTabs = isPrivileged ? [...tabs, { id: 'admin', label: 'Admin', icon: ShieldCheck }] : tabs;

  if (auth.loading) {
    return <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>;
  }
  if (!auth.user) {
    return <HubAuthScreen auth={auth} inviteToken={inviteToken} />;
  }
  if (profileLoaded && !profile) {
    return <ProfileSetup accessToken={auth.accessToken} inviteToken={inviteToken} onDone={loadProfile} />;
  }
  if (!profileLoaded) {
    return <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>;
  }

  return (
    <div className="hub-app">
      <style>{hubCss}</style>
      <aside className="hub-sidebar">
        <div className="hub-logo">
          <ShieldCheck size={30} />
          <div>
            <strong>Hub</strong>
            <span>{profile.displayName}</span>
          </div>
        </div>
        <nav>
          {navTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
              <Icon size={23} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <button className="hub-signout" onClick={auth.signOut}><LogOut size={20} /> Sign out</button>
      </aside>

      <main className="hub-main">
        <header className="hub-topbar">
          <div>
            <h1>{navTabs.find((item) => item.id === tab)?.label || 'Hub'}</h1>
            <p>{isPrivileged ? 'Privileged view' : 'Staff view'}</p>
          </div>
          <button onClick={loadShellData}><RefreshCw size={21} /> Refresh</button>
        </header>

        {tab === 'today' && <TodayView calendar={calendar} docs={docs} conversations={conversations} shifts={shifts} setTab={setTab} />}
        {tab === 'calendar' && <CalendarView accessToken={auth.accessToken} />}
        {tab === 'chat' && <ChatView accessToken={auth.accessToken} people={people} currentUserId={profile.userId} />}
        {tab === 'docs' && <DocsView accessToken={auth.accessToken} docs={docs} reloadDocs={reloadDocs} isPrivileged={isPrivileged} />}
        {tab === 'people' && <PeopleView people={people} onMessage={() => setTab('chat')} />}
        {tab === 'shifts' && <ShiftsView accessToken={auth.accessToken} isPrivileged={isPrivileged} />}
        {tab === 'admin' && isPrivileged && <PrivilegedTools accessToken={auth.accessToken} reloadDocs={reloadDocs} />}
      </main>

      <nav className="hub-mobile-nav">
        {navTabs.slice(0, 6).map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const hubCss = `
.hub-app {
  --hub-bg: #f7f5ef;
  --hub-panel: #fffdf8;
  --hub-ink: #1f2520;
  --hub-muted: #687064;
  --hub-border: #d8d2c4;
  --hub-accent: #345c51;
  --hub-accent-text: #ffffff;
  min-height: 100vh;
  display: flex;
  background: var(--hub-bg);
  color: var(--hub-ink);
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.hub-sidebar {
  width: 260px;
  background: #ebe6d9;
  border-right: 1px solid var(--hub-border);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hub-logo { display: flex; align-items: center; gap: 12px; padding: 8px; }
.hub-logo strong { display: block; font-size: 28px; line-height: 1; }
.hub-logo span { display: block; font-size: 15px; color: var(--hub-muted); margin-top: 4px; }
.hub-sidebar nav { display: grid; gap: 8px; }
.hub-sidebar nav button, .hub-signout, .hub-topbar button, .hub-panel-head button, .hub-button-row button, .hub-person button, .hub-shift button {
  min-height: 52px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--hub-ink);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  font-size: 18px;
  font-weight: 700;
}
.hub-sidebar nav button.is-active, .hub-mobile-nav button.is-active {
  background: var(--hub-accent);
  color: var(--hub-accent-text);
}
.hub-signout { margin-top: auto; color: #7a2f2f; }
.hub-main { flex: 1; min-width: 0; padding: 22px; padding-bottom: 88px; overflow: auto; }
.hub-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.hub-topbar h1 { margin: 0; font-size: 34px; line-height: 1.05; }
.hub-topbar p { margin: 6px 0 0; font-size: 17px; color: var(--hub-muted); }
.hub-topbar button, .hub-panel-head button, .hub-button-row button, .hub-person button, .hub-shift button { background: var(--hub-panel); border-color: var(--hub-border); }
.hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.hub-panel {
  background: var(--hub-panel);
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.hub-panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.hub-panel-title { display: flex; align-items: center; gap: 10px; }
.hub-panel h2 { margin: 0; font-size: 26px; }
.hub-subhead { font-size: 18px; margin: 20px 0 10px; }
.hub-list { display: grid; gap: 9px; }
.hub-row, .hub-shift {
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
  text-align: left;
}
.hub-row strong, .hub-shift strong { display: block; font-size: 20px; line-height: 1.25; }
.hub-row span, .hub-shift span, .hub-shift small { display: block; color: var(--hub-muted); font-size: 16px; margin-top: 4px; }
.hub-row-button { width: 100%; cursor: pointer; }
.hub-row-button.is-active { outline: 3px solid rgba(52, 92, 81, 0.25); border-color: var(--hub-accent); }
.hub-empty { color: var(--hub-muted); font-size: 18px; margin: 0; }
.hub-calendar-list { display: grid; gap: 14px; }
.hub-day h3 { font-size: 21px; margin: 0 0 8px; }
.hub-calendar-item {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 6px 14px;
  padding: 13px;
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  background: #fff;
  margin-bottom: 8px;
}
.hub-calendar-item span { font-size: 17px; font-weight: 800; color: var(--hub-accent); }
.hub-calendar-item strong { font-size: 19px; }
.hub-calendar-item small { grid-column: 2; color: var(--hub-muted); font-size: 15px; }
.hub-chat-layout { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 18px; }
.hub-doc-layout { display: grid; grid-template-columns: minmax(260px, 360px) 1fr minmax(260px, 360px); gap: 18px; }
.hub-message-list { min-height: 48vh; max-height: 58vh; overflow: auto; display: grid; align-content: start; gap: 10px; }
.hub-message { border: 1px solid var(--hub-border); background: #fff; border-radius: 8px; padding: 12px; }
.hub-message strong { color: var(--hub-muted); font-size: 14px; }
.hub-message p { margin: 6px 0 0; font-size: 18px; line-height: 1.45; }
.hub-compose { display: flex; gap: 10px; margin-top: 14px; }
.hub-compose input, .hub-field input, .hub-field select, .hub-field textarea, .hub-copy-box input {
  width: 100%;
  border: 1px solid var(--hub-border);
  border-radius: 8px;
  padding: 13px 14px;
  font-size: 18px;
  background: #fff;
  color: var(--hub-ink);
}
.hub-compose button, .hub-primary-button {
  min-height: 52px;
  border: 0;
  border-radius: 8px;
  background: var(--hub-accent);
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 18px;
}
.hub-doc-body pre {
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 18px;
  line-height: 1.55;
}
.hub-doc-summary { color: var(--hub-muted); font-size: 18px; }
.hub-people-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.hub-person { border: 1px solid var(--hub-border); border-radius: 8px; background: #fff; padding: 15px; display: grid; gap: 6px; }
.hub-person strong { font-size: 21px; }
.hub-person span, .hub-person small { color: var(--hub-muted); font-size: 15px; overflow-wrap: anywhere; }
.hub-shift { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.hub-pill { border: 1px solid var(--hub-border); border-radius: 999px; padding: 8px 12px; font-weight: 800; color: var(--hub-accent); }
.hub-form { display: grid; gap: 13px; }
.hub-field span { display: block; margin-bottom: 6px; font-size: 15px; font-weight: 800; color: var(--hub-muted); }
.hub-copy-box { margin-top: 14px; display: grid; gap: 8px; }
.hub-auth-screen { min-height: 100vh; display: grid; place-items: center; background: var(--hub-bg, #f7f5ef); padding: 18px; }
.hub-auth-card { width: min(520px, 100%); background: #fffdf8; border: 1px solid #d8d2c4; border-radius: 8px; padding: 24px; }
.hub-brand { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; }
.hub-brand h1, .hub-auth-card h1 { font-size: 32px; margin: 0; }
.hub-brand p, .hub-help { color: #687064; font-size: 17px; line-height: 1.45; }
.hub-notice { background: #edf5f1; border: 1px solid #b9d1c8; padding: 12px; border-radius: 8px; margin-bottom: 14px; font-weight: 800; }
.hub-error { color: #9b2f2f; font-weight: 800; margin: 0; }
.hub-text-button { border: 0; background: transparent; color: #345c51; font-weight: 800; font-size: 17px; margin-top: 14px; }
.hub-mobile-nav { display: none; }
@media (max-width: 900px) {
  .hub-app { display: block; }
  .hub-sidebar { display: none; }
  .hub-main { padding: 14px; padding-bottom: 88px; }
  .hub-topbar h1 { font-size: 28px; }
  .hub-grid, .hub-chat-layout, .hub-doc-layout { grid-template-columns: 1fr; }
  .hub-panel { padding: 14px; }
  .hub-panel h2 { font-size: 23px; }
  .hub-calendar-item { grid-template-columns: 1fr; }
  .hub-calendar-item small { grid-column: auto; }
  .hub-shift { align-items: stretch; flex-direction: column; }
  .hub-compose { flex-direction: column; }
  .hub-mobile-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    background: #ebe6d9;
    border-top: 1px solid var(--hub-border);
    padding: 6px;
  }
  .hub-mobile-nav button {
    min-height: 58px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--hub-ink);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 800;
  }
}
`;
