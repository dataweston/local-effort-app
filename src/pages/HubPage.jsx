import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Hash, Home, Send, X, AlignLeft, Inbox, RefreshCw,
  MessageSquare, ChevronRight, LogIn, LogOut, CheckCircle2,
  Clock, AlertCircle, Layers,
} from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useBrainInbox } from '../hooks/useBrainInbox';
import { BrainInboxDrawer } from '../components/brain/BrainInboxDrawer';

// ── Data hooks ────────────────────────────────────────────────────────────────

function useHubSpaces(accessToken) {
  const [spaces, setSpaces] = useState([]);
  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/hub/spaces', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.spaces) setSpaces(data.spaces);
    } catch {}
  }, [accessToken]);
  useEffect(() => { load(); }, [load]);
  return { spaces, reload: load };
}

function useHubToday(accessToken) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/hub/today', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      if (d.ok) setData(d);
    } catch {} finally { setLoading(false); }
  }, [accessToken]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

function useHubThreads(accessToken, visibility) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!accessToken || !visibility) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hub/threads`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      if (d.threads) {
        const allowed = visibilityForSpace(visibility);
        setThreads(d.threads.filter((t) => allowed.includes(t.visibility)));
      }
    } catch {} finally { setLoading(false); }
  }, [accessToken, visibility]);
  useEffect(() => { load(); }, [load]);
  return { threads, loading, reload: load };
}

function useThreadMessages(accessToken, threadId) {
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!accessToken || !threadId || threadId.startsWith('legacy-')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hub/thread-messages?id=${encodeURIComponent(threadId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const d = await res.json();
      if (d.ok) { setThread(d.thread); setMessages(d.messages); }
    } catch {} finally { setLoading(false); }
  }, [accessToken, threadId]);
  useEffect(() => { setThread(null); setMessages([]); load(); }, [load]);
  return { thread, messages, loading, reload: load };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function visibilityForSpace(spaceVisibility) {
  if (spaceVisibility === 'admin') return ['admin'];
  if (spaceVisibility === 'staff') return ['staff', 'admin'];
  if (spaceVisibility === 'customer') return ['customer', 'household'];
  return ['customer', 'household', 'staff', 'admin', 'guest'];
}

function formatAge(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const ACTION_STATUS_ICON = {
  open:           <Clock size={13} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />,
  done:           <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: 'var(--color-state-success)' }} />,
  pending_review: <AlertCircle size={13} className="flex-shrink-0" style={{ color: 'var(--brand-olive, #6b7c3f)' }} />,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Sidebar({ spaces, selected, onSelect, sidebarOpen, onClose }) {
  const navItems = [
    { id: '__today__', label: 'Today', icon: <Home size={15} />, special: true },
    ...spaces.map((s) => ({
      id: s.id,
      label: s.title,
      icon: <Hash size={15} />,
      unread: s.unreadCount || 0,
    })),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          lg:relative lg:z-auto lg:translate-x-0
          transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          width: 220,
          backgroundColor: 'var(--color-bg-card)',
          borderRight: '1px solid var(--color-border-default)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 safe-area-top"
          style={{ borderBottom: '1px solid var(--color-border-default)' }}
        >
          <span
            className="text-sm font-bold font-display"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Hub
          </span>
          <button className="lg:hidden p-1" onClick={onClose} style={{ color: 'var(--color-text-secondary)' }}>
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors rounded-lg mx-1"
              style={{
                width: 'calc(100% - 8px)',
                backgroundColor: selected === item.id
                  ? 'color-mix(in srgb, var(--color-action-primary-bg) 15%, transparent)'
                  : 'transparent',
                color: selected === item.id
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)',
                fontWeight: item.special ? 600 : 400,
              }}
            >
              {item.icon}
              <span className="flex-1 truncate text-left">{item.label}</span>
              {item.unread > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--brand-rose, #e07070)', color: '#fff' }}
                >
                  {item.unread}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

function TodayView({ data, loading, onThreadSelect, onReload }) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--color-text-muted)' }}>
        <RefreshCw size={20} className="animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { summary, actions = [], objects = [], threads = [] } = data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Summary chips */}
      {summary && (
        <div className="flex items-center gap-3 flex-wrap">
          {summary.dueActionCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--brand-rose, #e07070) 10%, transparent)',
                borderColor: 'var(--brand-rose, #e07070)',
                color: 'var(--color-text-primary)',
              }}
            >
              <AlertCircle size={13} />
              {summary.dueActionCount} open action{summary.dueActionCount !== 1 ? 's' : ''}
            </div>
          )}
          {summary.inboxCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border-default)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Inbox size={13} />
              {summary.inboxCount} in inbox
            </div>
          )}
          {summary.dueActionCount === 0 && !summary.inboxCount && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-state-success) 10%, transparent)',
                borderColor: 'var(--color-state-success)',
                color: 'var(--color-text-primary)',
              }}
            >
              <CheckCircle2 size={13} />
              All clear
            </div>
          )}
          <button
            onClick={onReload}
            className="p-1.5 rounded"
            style={{ color: 'var(--color-text-muted)' }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Actions
          </h2>
          <div className="space-y-1.5">
            {actions.slice(0, 10).map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border-default)',
                }}
              >
                {ACTION_STATUS_ICON[action.status] || ACTION_STATUS_ICON.open}
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                    {action.title}
                  </p>
                  {action.dueAt && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      due {formatAge(action.dueAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today's objects */}
      {objects.filter((o) => o.horizon === 'today').length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Today
          </h2>
          <div className="space-y-1.5">
            {objects.filter((o) => o.horizon === 'today').map((obj) => (
              <div
                key={obj.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border-default)',
                }}
              >
                <Layers size={13} className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {obj.title}
                  </p>
                  {obj.subtitle && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{obj.subtitle}</p>
                  )}
                </div>
                {obj.startsAt && (
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {formatTime(obj.startsAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Threads */}
      {threads.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Threads
          </h2>
          <div className="space-y-1.5">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onThreadSelect(thread)}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border-default)',
                }}
              >
                <MessageSquare size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {thread.title || thread.objectType}
                  </p>
                  {thread.preview && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {thread.preview}
                    </p>
                  )}
                </div>
                {thread.lastMessageAt && (
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {formatAge(thread.lastMessageAt)}
                  </span>
                )}
                <ChevronRight size={13} className="flex-shrink-0 self-center" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            ))}
          </div>
        </section>
      )}

      {actions.length === 0 && objects.length === 0 && threads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
          <Home size={32} className="mb-3 opacity-40" />
          <p className="text-sm">Nothing scheduled for today.</p>
        </div>
      )}
    </div>
  );
}

function SpaceView({ space, accessToken, onThreadSelect }) {
  const { threads, loading } = useHubThreads(accessToken, space.visibility);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Hash size={16} style={{ color: 'var(--color-text-muted)' }} />
        <h2 className="text-base font-semibold font-display" style={{ color: 'var(--color-text-primary)' }}>
          {space.title}
        </h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-text-muted)' }}>
          <RefreshCw size={18} className="animate-spin" />
        </div>
      )}

      {!loading && threads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
          <MessageSquare size={32} className="mb-3 opacity-40" />
          <p className="text-sm">No threads in this space yet.</p>
        </div>
      )}

      {threads.length > 0 && (
        <div className="space-y-1.5">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => !thread.id.startsWith('legacy-') && onThreadSelect(thread)}
              disabled={thread.id.startsWith('legacy-')}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border-default)',
                cursor: thread.id.startsWith('legacy-') ? 'default' : 'pointer',
              }}
            >
              <MessageSquare size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {thread.title || thread.objectType}
                </p>
                {thread.preview && (
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {thread.preview}
                  </p>
                )}
              </div>
              {thread.lastMessageAt && (
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  {formatAge(thread.lastMessageAt)}
                </span>
              )}
              {!thread.id.startsWith('legacy-') && (
                <ChevronRight size={13} className="flex-shrink-0 self-center" style={{ color: 'var(--color-text-muted)' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreadView({ threadId, accessToken, onBack }) {
  const { thread, messages, loading, reload } = useThreadMessages(accessToken, threadId);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await fetch(`/api/hub/thread-messages?id=${encodeURIComponent(threadId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ body: text }),
      });
      setBody('');
      reload();
    } catch {} finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}
      >
        <button
          onClick={onBack}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <AlignLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {thread?.title || 'Thread'}
          </p>
          {thread?.objectType && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {thread.objectType}
            </p>
          )}
        </div>
        <button
          onClick={reload}
          className="p-1.5 rounded"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-32" style={{ color: 'var(--color-text-muted)' }}>
            <RefreshCw size={18} className="animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <MessageSquare size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No messages yet. Start the conversation.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                {msg.senderRole || 'user'}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {formatAge(msg.createdAt)}
              </span>
            </div>
            <p
              className="text-sm leading-relaxed px-3 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
            >
              {msg.body}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 px-4 py-3 border-t safe-area-bottom flex-shrink-0"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 text-[16px] sm:text-sm rounded-lg px-3 py-2 border outline-none"
          style={{
            backgroundColor: 'var(--color-bg-page)',
            borderColor: 'var(--color-border-default)',
            color: 'var(--color-text-primary)',
          }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-action-primary-bg)',
            color: 'var(--color-action-primary-text)',
            opacity: !body.trim() || sending ? 0.5 : 1,
          }}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HubPage() {
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

  const auth = useSupabaseAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState('__today__');
  const [selectedThread, setSelectedThread] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  const inbox = useBrainInbox({ accessToken: auth.accessToken, enabled: !!auth.isAdmin });
  const { spaces } = useHubSpaces(auth.accessToken);
  const { data: todayData, loading: todayLoading, reload: reloadToday } = useHubToday(auth.accessToken);

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) || null;
  const isToday = selectedSpaceId === '__today__';

  const handleSpaceSelect = (spaceId) => {
    setSelectedSpaceId(spaceId);
    setSelectedThread(null);
  };

  const handleSignIn = async () => {
    try {
      await auth.signInWithGoogle(`${window.location.origin}/hub`);
    } catch {}
  };

  if (!auth.loading && !auth.user) {
    return (
      <div
        className="fullpage-demo-scope min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <div className="text-center px-4">
          <MessageSquare size={40} className="mx-auto mb-4 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
          <h1 className="text-xl font-bold font-display mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Hub
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Sign in to access your team spaces, today's tasks, and conversations.
          </p>
          <button
            onClick={handleSignIn}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg mx-auto transition-colors"
            style={{
              backgroundColor: 'var(--color-action-primary-bg)',
              color: 'var(--color-action-primary-text)',
            }}
          >
            <LogIn size={15} />
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fullpage-demo-scope flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      {/* Sidebar */}
      <Sidebar
        spaces={spaces}
        selected={selectedSpaceId}
        onSelect={handleSpaceSelect}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-3 safe-area-top flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderBottom: '1px solid var(--color-border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded transition-colors"
              onClick={() => setSidebarOpen(true)}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <AlignLeft size={18} />
            </button>
            <span className="text-sm font-semibold font-display" style={{ color: 'var(--color-text-primary)' }}>
              {selectedThread
                ? (selectedThread.title || 'Thread')
                : isToday
                  ? 'Today'
                  : selectedSpace?.title || 'Hub'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedThread && (
              <button
                onClick={() => setSelectedThread(null)}
                className="p-2 rounded transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={16} />
              </button>
            )}
            {auth.isAdmin && (
              <button
                onClick={() => setInboxOpen(true)}
                className="relative p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                title="Brain inbox"
              >
                <Inbox size={16} />
                {inbox.total > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 text-xs font-bold leading-none flex items-center justify-center rounded-full"
                    style={{
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 3px',
                      backgroundColor: 'var(--brand-rose, #e07070)',
                      color: '#fff',
                      fontSize: '10px',
                    }}
                  >
                    {inbox.total > 99 ? '99+' : inbox.total}
                  </span>
                )}
              </button>
            )}
            {auth.user && (
              <button
                onClick={auth.signOut}
                className="p-2 rounded transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedThread ? (
            <ThreadView
              threadId={selectedThread.id}
              accessToken={auth.accessToken}
              onBack={() => setSelectedThread(null)}
            />
          ) : isToday ? (
            <TodayView
              data={todayData}
              loading={todayLoading}
              onThreadSelect={setSelectedThread}
              onReload={reloadToday}
            />
          ) : selectedSpace ? (
            <SpaceView
              space={selectedSpace}
              accessToken={auth.accessToken}
              onThreadSelect={setSelectedThread}
            />
          ) : null}
        </div>
      </div>

      {/* Brain inbox drawer */}
      <BrainInboxDrawer
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        items={inbox.items}
        triage={inbox.triage}
        loading={inbox.loading}
        accessToken={auth.accessToken}
      />
    </div>
  );
}
