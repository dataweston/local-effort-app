import React, { useCallback, useEffect, useState } from 'react';
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

  const save = async (newThumbsUp, newNotes) => {
    setSaving(true);
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

/* ─── Note to Chef tab ─── */
const ChefNoteTab = ({ accessToken, customerSlug }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    setSent(false);
    try {
      const resp = await fetch('/api/weekly-order/chef-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ customerSlug: customerSlug || undefined, message: message.trim() }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send');
      }
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Note to the Chef</CardTitle>
        <CardDescription>Have a request, allergy update, or just want to say something? Drop a note here and it'll go straight to the kitchen.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-3">
          <Textarea
            rows={4}
            placeholder="Hey chef, next week could we try…"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setSent(false); }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
          {sent && <p style={{ color: '#22c55e', fontSize: '0.85rem' }}>Message sent! We'll get back to you soon.</p>}
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? 'Sending…' : 'Send Note'}
          </Button>
        </form>
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

  // Use the slug from URL, or fall back to whatever the API resolves
  const customerSlug = urlSlug || customer?.slug || '';
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  const slugParam = customerSlug ? `?customerSlug=${encodeURIComponent(customerSlug)}` : '';

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const resp = await fetch(`/api/weekly-order/profile${slugParam}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setProfile(data.profile);
        setCustomer(data.customer);
        setUsers(data.users);
        // If we're on the generic /weekly-order/portal URL, redirect to the slug-specific one
        if (!urlSlug && data.customer?.slug) {
          navigate(`/weekly-order/${data.customer.slug}/portal`, { replace: true });
        }
      }
    } catch { /* ignore */ }
    finally { setLoadingProfile(false); }
  }, [accessToken, slugParam, urlSlug, navigate]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const resp = await fetch(`/api/weekly-order/history${slugParam}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setHistory(data.weeks || []);
      }
    } catch { /* ignore */ }
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

          <Tabs defaultValue="dashboard" style={{ marginTop: 24 }}>
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="past-menus">Past Menus</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="chef-note">Note to Chef</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              {loadingProfile ? (
                <div className="weekly-order-loading">Loading…</div>
              ) : (
                <DashboardTab profile={profile} history={history} customerName={customerName} />
              )}
            </TabsContent>

            <TabsContent value="past-menus">
              {loadingHistory ? (
                <div className="weekly-order-loading">Loading…</div>
              ) : (
                <PastMenusTab history={history} accessToken={accessToken} onFeedbackSaved={loadHistory} />
              )}
            </TabsContent>

            <TabsContent value="profile">
              {loadingProfile ? (
                <div className="weekly-order-loading">Loading…</div>
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
              <ChefNoteTab accessToken={accessToken} customerSlug={customerSlug} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGate>
  );
};

export default SubscriberPortalPage;
