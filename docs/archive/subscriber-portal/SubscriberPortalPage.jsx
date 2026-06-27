import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import '../styles/weekly-order.css';

/* ─── helpers ─── */
const formatWeek = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

/* ─── Auth gate (supports Google + email/password) ─── */
const AuthGate = ({ children }) => {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useSupabaseAuth();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="weekly-order fullpage-demo-scope"><div className="weekly-order-shell"><div className="weekly-order-loading">Loading…</div></div></div>;
  if (user) return children;

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="weekly-order fullpage-demo-scope">
      <div className="weekly-order-shell" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Card style={{ maxWidth: 400, width: '100%' }}>
          <CardHeader>
            <CardTitle>Welcome to your portal</CardTitle>
            <CardDescription>Sign in to view your menus, leave feedback, and manage your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => signInWithGoogle(window.location.href)}>Sign in with Google</Button>
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', margin: '8px 0' }}>or</div>
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', width: '100%', textAlign: 'center' }}
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* ─── Dashboard tab ─── */
const DashboardTab = ({ profile, history, customerName }) => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Welcome back, {customerName || 'friend'}!</CardTitle>
        <CardDescription>Your weekly meal prep portal</CardDescription>
      </CardHeader>
      <CardContent>
        {profile?.householdSize && <p><strong>Household:</strong> {profile.householdSize}</p>}
        {profile?.address && <p><strong>Address:</strong> {profile.address}</p>}
        {profile?.deliveryNotes && <p><strong>Delivery notes:</strong> {profile.deliveryNotes}</p>}
      </CardContent>
    </Card>
    {history.length > 0 && (
      <Card>
        <CardHeader><CardTitle>Recent Deliveries</CardTitle></CardHeader>
        <CardContent>
          {history.slice(0, 3).map((week) => (
            <div key={week.orderId} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
              <strong>{formatWeek(week.weekStart)}</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {week.items.map((item, i) => (
                  <span key={i} className="weekly-order-tag">{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.title}</span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )}
  </div>
);

/* ─── This Week tab ─── */
const ThisWeekTab = ({ accessToken, customerSlug }) => {
  const [menuWeek, setMenuWeek] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const slugParam = customerSlug ? `?customerSlug=${encodeURIComponent(customerSlug)}` : '';
    setError('');
    fetch(`/api/weekly-order/upcoming${slugParam}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data?.error || 'Unable to load upcoming menu');
        }
        return r.json();
      })
      .then(data => {
        if (data) { setMenuWeek(data.menuWeek); setItems(data.items || []); }
      })
      .catch((err) => {
        setError(err?.message || 'Unable to load upcoming menu');
      })
      .finally(() => setLoading(false));
  }, [accessToken, customerSlug]);

  if (loading) return <div className="weekly-order-loading">Loading…</div>;
  if (error) return <p style={{ padding: 16, color: '#ef4444' }}>{error}</p>;
  if (!menuWeek) return <p style={{ padding: 16, color: '#64748b' }}>No upcoming menu yet — check back soon!</p>;

  const weekLabel = formatWeek(menuWeek.weekStart);
  const isPast = new Date(menuWeek.weekStart) < new Date();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{isPast ? 'Current Week' : 'Upcoming Week'}: {weekLabel}</CardTitle>
          {menuWeek.status === 'draft' && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Menu is being finalized — dishes may change.</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <DishFeedbackRow
                key={item.dishId}
                item={{ ...item, quantity: 1 }}
                menuWeekId={menuWeek.id}
                accessToken={accessToken}
                onSaved={() => {}}
              />
            ))}
            {items.length === 0 && (
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No dishes assigned for this week yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Past Menus tab with feedback ─── */
const PastMenusTab = ({ history, accessToken, onFeedbackSaved }) => {
  if (!history.length) return <p style={{ padding: 16, color: '#64748b' }}>No past orders yet.</p>;

  return (
    <div className="space-y-6">
      {history.map((week) => (
        <Card key={week.orderId}>
          <CardHeader>
            <CardTitle>Week of {formatWeek(week.weekStart)}</CardTitle>
            <CardDescription>{week.items.length} items · {week.status}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {week.items.map((item, idx) => (
                <DishFeedbackRow
                  key={`${week.orderId}-${idx}`}
                  item={item}
                  menuWeekId={week.menuWeekId}
                  accessToken={accessToken}
                  onSaved={onFeedbackSaved}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const DishFeedbackRow = ({ item, menuWeekId, accessToken, onSaved }) => {
  const [thumbsUp, setThumbsUp] = useState(item.feedback?.thumbsUp ?? null);
  const [notes, setNotes] = useState(item.feedback?.notes || '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Optimistic aggregate: start from server totals, adjust for current user's vote
  const agg = item.allFeedback || { up: 0, down: 0, notes: [] };
  // allFeedback already includes this user's vote, so display as-is after save
  const [aggUp, setAggUp] = useState(agg.up);
  const [aggDown, setAggDown] = useState(agg.down);
  const [aggNotes] = useState(agg.notes || []);

  const save = async (newThumbsUp, newNotes) => {
    setSaving(true);
    // Optimistically update aggregate
    const prev = item.feedback?.thumbsUp ?? null;
    setAggUp((n) => n + (newThumbsUp ? 1 : 0) - (prev === true ? 1 : 0));
    setAggDown((n) => n + (!newThumbsUp ? 1 : 0) - (prev === false ? 1 : 0));
    try {
      const resp = await fetch('/api/weekly-order/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ dishId: item.dishId, menuWeekId, thumbsUp: newThumbsUp, notes: newNotes || '' }),
      });
      if (resp.ok) {
        setDirty(false);
        onSaved?.();
      }
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  };

  const handleThumb = (val) => {
    setThumbsUp(val);
    save(val, notes);
  };

  const totalVotes = aggUp + aggDown;
  const othersNotes = aggNotes.filter((n) => n && n !== notes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div>
          <strong>{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.title}</strong>
          {item.description && <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{item.description}</p>}
          {item.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
              {item.tags.map((t) => <span key={t} className="weekly-order-tag">{t}</span>)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => handleThumb(true)}
            style={{
              fontSize: '1.4rem', background: thumbsUp === true ? '#dcfce7' : '#f1f5f9',
              border: thumbsUp === true ? '2px solid #22c55e' : '1px solid #e2e8f0',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }}
            title="Thumbs up"
          >👍</button>
          <button
            type="button"
            onClick={() => handleThumb(false)}
            style={{
              fontSize: '1.4rem', background: thumbsUp === false ? '#fee2e2' : '#f1f5f9',
              border: thumbsUp === false ? '2px solid #ef4444' : '1px solid #e2e8f0',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }}
            title="Thumbs down"
          >👎</button>
        </div>
      </div>

      {/* Aggregate tally across all subscribers */}
      {totalVotes > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#64748b' }}>
          <span>Everyone: {aggUp > 0 && <span style={{ color: '#16a34a' }}>👍 {aggUp}</span>}{aggUp > 0 && aggDown > 0 && ' · '}{aggDown > 0 && <span style={{ color: '#dc2626' }}>👎 {aggDown}</span>}</span>
        </div>
      )}

      {/* Notes from other subscribers */}
      {othersNotes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {othersNotes.map((n, i) => (
            <p key={i} style={{ margin: 0, fontSize: '0.8rem', color: '#475569', paddingLeft: 8, borderLeft: '2px solid #e2e8f0' }}>
              {n}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <Input
          placeholder="Leave a note about this dish…"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          style={{ flex: 1 }}
        />
        {dirty && (
          <Button size="sm" onClick={() => { save(thumbsUp ?? true, notes); }} disabled={saving}>
            {saving ? '…' : 'Save'}
          </Button>
        )}
      </div>
    </div>
  );
};

/* ─── Profile tab ─── */
const ProfileTab = ({ profile, customer, users, accessToken, onSaved }) => {
  const [form, setForm] = useState({
    name: customer?.name || '',
    householdSize: profile?.householdSize || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    deliveryNotes: profile?.deliveryNotes || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const resp = await fetch('/api/weekly-order/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (resp.ok) { setSaved(true); onSaved?.(); }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const survey = profile?.intakeSurvey;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Your Info</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="prof-name" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Name</label>
              <Input id="prof-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-household" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Household Size</label>
              <Input id="prof-household" value={form.householdSize} onChange={(e) => setForm({ ...form, householdSize: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-phone" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Phone</label>
              <Input id="prof-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-address" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Address</label>
              <Input id="prof-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="prof-delivery" style={{ fontSize: '0.85rem', fontWeight: 500 }}>Delivery Notes</label>
              <Textarea id="prof-delivery" value={form.deliveryNotes} onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</Button>
              {saved && <span style={{ color: '#22c55e', fontSize: '0.85rem' }}>Saved!</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      {users?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Linked Accounts</CardTitle></CardHeader>
          <CardContent>
            {users.map((u) => (
              <div key={u.id} style={{ padding: '4px 0', fontSize: '0.9rem' }}>
                {u.email} <span className="weekly-order-tag">{u.role}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {survey && (
        <Card>
          <CardHeader><CardTitle>Intake Survey Details</CardTitle></CardHeader>
          <CardContent>
            <IntakeSurveyView survey={survey} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ─── Intake survey read-only view (Kara & Alex data) ─── */
const IntakeSurveyView = ({ survey }) => {
  if (!survey || typeof survey !== 'object') return null;

  const fieldLabels = {
    dueDate: 'Due Date',
    firstDelivery: 'First Delivery',
    karaProteinsSelected: 'Kara — Proteins Selected',
    karaProteinsEveryday: 'Kara — Everyday Proteins',
    karaAllergies: 'Kara — Allergies',
    karaDislikes: 'Kara — Dislikes',
    karaFavorites: 'Kara — Favorites',
    dadProteinsSelected: 'Dad — Proteins Selected',
    dadProteinsEveryday: 'Dad — Everyday Proteins',
    dadAllergies: 'Dad — Allergies',
    breastfeeding: 'Breastfeeding',
    postpartumPriorities: 'Postpartum Priorities',
    lunchesTogether: 'Lunches Together?',
    dinnersTogether: 'Dinners Together?',
    lunchSettings: 'Lunch Settings',
    dinnerSettings: 'Dinner Settings',
    cuisinePreferences: 'Cuisine Preferences',
    spiceLevel: 'Spice Level',
    breakfastInterest: 'Breakfast Interest',
    snacksInterest: 'Snacks Interest',
    snackRequests: 'Snack Requests',
    mondayDelivery: 'Monday Delivery',
    billingPreference: 'Billing Preference',
    anythingElse: 'Anything Else',
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(survey).map(([key, val]) => {
        const label = fieldLabels[key] || key;
        const display = Array.isArray(val) ? val.join(', ') : String(val);
        return (
          <div key={key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 8, fontSize: '0.88rem' }}>
            <span style={{ fontWeight: 500, color: '#475569' }}>{label}</span>
            <span style={{ color: '#1e293b' }}>{display}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Note to Chef tab — live thread ─── */
const ChefNoteTab = ({ accessToken, customer }) => {
  const [messages, setMessages] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const customerId = customer?.id;
  const authHeader = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const loadThread = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const title = encodeURIComponent(`${customer?.name || customerId} — Chef Notes`);
      const resp = await fetch(
        `/api/hub/thread-messages?objectType=customer&objectId=${encodeURIComponent(customerId)}&visibility=customer&title=${title}`,
        { headers: authHeader },
      );
      if (resp.ok) {
        const data = await resp.json();
        setThreadId(data.thread?.id || null);
        setMessages(data.messages || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [customerId, accessToken]);

  useEffect(() => { loadThread(); }, [loadThread]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !threadId) return;
    setSending(true);
    setError('');
    try {
      const resp = await fetch(`/api/hub/thread-messages?id=${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ body: message.trim() }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send');
      }
      const data = await resp.json();
      setMessages((prev) => [...prev, data.message]);
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) return <Card><CardContent style={{ padding: '24px', color: '#64748b' }}>Loading…</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Note to the Chef</CardTitle>
        <CardDescription>Have a request, allergy update, or just want to say something? Drop a note here and it'll go straight to the kitchen.</CardDescription>
      </CardHeader>
      <CardContent>
        {messages.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 16 }}>No messages yet — send a note to get started.</p>
        )}
        {messages.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
            {messages.map((msg) => {
              const isCustomer = msg.senderRole === 'customer';
              const isAdmin = msg.senderRole === 'admin';
              return (
                <div key={msg.id} style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: isAdmin ? '#f0fdf4' : isCustomer ? '#eff6ff' : '#f1f5f9',
                  alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{msg.body}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                    {isAdmin ? 'Chef' : isCustomer ? 'You' : 'Kitchen'} · {fmtTime(msg.createdAt)}
                  </p>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Textarea
            rows={2}
            placeholder="Hey chef, next week could we try…"
            value={message}
            style={{ flex: 1, resize: 'none' }}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
          />
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? '…' : 'Send'}
          </Button>
        </form>
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>}
      </CardContent>
    </Card>
  );
};

/* ─── Main Portal Page ─── */
const SubscriberPortalPage = () => {
  const { customerSlug: urlSlug } = useParams();
  const navigate = useNavigate();
  const { user, accessToken, signOut } = useSupabaseAuth();
  const [profile, setProfile] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [historyError, setHistoryError] = useState('');

  // Use the slug from URL, or fall back to whatever the API resolves
  const customerSlug = urlSlug || customer?.slug || '';
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const slugParam = customerSlug ? `?customerSlug=${encodeURIComponent(customerSlug)}` : '';

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError('');
    try {
      const resp = await fetch(`/api/weekly-order/profile${slugParam}`, { headers });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to load profile');
      }
      const data = await resp.json();
      setProfile(data.profile);
      setCustomer(data.customer);
      setUsers(data.users);
      // If we're on the generic /weekly-order/portal URL, redirect to the slug-specific one
      if (!urlSlug && data.customer?.slug) {
        navigate(`/weekly-order/${data.customer.slug}/portal`, { replace: true });
      }
    } catch (err) {
      setProfileError(err?.message || 'Unable to load profile');
    }
    finally { setLoadingProfile(false); }
  }, [accessToken, slugParam, urlSlug, navigate]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const resp = await fetch(`/api/weekly-order/history${slugParam}`, { headers });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Unable to load order history');
      }
      const data = await resp.json();
      setHistory(data.weeks || []);
    } catch (err) {
      setHistoryError(err?.message || 'Unable to load order history');
    }
    finally { setLoadingHistory(false); }
  }, [accessToken, slugParam]);

  useEffect(() => {
    if (user && accessToken) {
      loadProfile();
      loadHistory();
    }
  }, [user, accessToken]);

  const customerName = customer?.name || customerSlug || '';

  return (
    <AuthGate>
      <div className="weekly-order fullpage-demo-scope">
        <div className="weekly-order-shell container-page">
          <header className="weekly-order-hero">
            <div>
              <span className="weekly-order-eyebrow">Subscriber portal</span>
              <h1 className="weekly-order-title">{customerName}</h1>
            </div>
            <div className="weekly-order-meta">
              <div className="weekly-order-meta-row">
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{user?.email}</span>
                <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
              </div>
              <div className="weekly-order-meta-row" style={{ gap: 8 }}>
                <Link to={`/weekly-order/${customerSlug || ''}`}>
                  <Button variant="outline" size="sm">Current Menu →</Button>
                </Link>
              </div>
            </div>
          </header>

          <Tabs defaultValue="this-week" style={{ marginTop: 24 }}>
            <TabsList>
              <TabsTrigger value="this-week">This Week</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="past-menus">Past Menus</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="chef-note">Note to Chef</TabsTrigger>
            </TabsList>

            <TabsContent value="this-week">
              <ThisWeekTab accessToken={accessToken} customerSlug={customerSlug} />
            </TabsContent>

            <TabsContent value="dashboard">
              {loadingProfile ? (
                <div className="weekly-order-loading">Loading…</div>
              ) : profileError ? (
                <p style={{ color: '#ef4444', padding: 16 }}>{profileError}</p>
              ) : (
                <DashboardTab profile={profile} history={history} customerName={customerName} />
              )}
            </TabsContent>

            <TabsContent value="past-menus">
              {loadingHistory ? (
                <div className="weekly-order-loading">Loading…</div>
              ) : historyError ? (
                <p style={{ color: '#ef4444', padding: 16 }}>{historyError}</p>
              ) : (
                <PastMenusTab history={history} accessToken={accessToken} onFeedbackSaved={loadHistory} />
              )}
            </TabsContent>

            <TabsContent value="profile">
              {loadingProfile ? (
                <div className="weekly-order-loading">Loading…</div>
              ) : profileError ? (
                <p style={{ color: '#ef4444', padding: 16 }}>{profileError}</p>
              ) : (
                <ProfileTab
                  profile={profile}
                  customer={customer}
                  users={users}
                  accessToken={accessToken}
                  onSaved={loadProfile}
                />
              )}
            </TabsContent>

            <TabsContent value="chef-note">
              <ChefNoteTab accessToken={accessToken} customer={customer} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGate>
  );
};

export default SubscriberPortalPage;
