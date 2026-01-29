import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/supabaseClient';
import { getCurrentWeeklyOrderUser } from '../weeklyOrder/supabaseClient';
import '../styles/fullpage-demo-theme.css';
import '../styles/weekly-order-admin.css';

const TABS = [
  { id: 'ingest', label: 'Ingest Inbox' },
  { id: 'drafts', label: 'Dish Drafts' },
  { id: 'dishes', label: 'Dish Catalog' },
  { id: 'weeks', label: 'Menu Weeks' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'plans', label: 'Plans' },
  { id: 'overrides', label: 'Overrides' },
  { id: 'logs', label: 'Logs' },
];

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
};

const AdminWeeklyOrderPage = () => {
  const { accessToken, user, loading: authLoading, signOut } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('ingest');
  const [ingests, setIngests] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [menuWeeks, setMenuWeeks] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [plans, setPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [userOverrides, setUserOverrides] = useState([]);
  const [status, setStatus] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [newWeek, setNewWeek] = useState({ weekStart: '', cutoffAt: '' });
  const [dishSearch, setDishSearch] = useState('');
  const [menuItemForm, setMenuItemForm] = useState({});
  const [overrideForm, setOverrideForm] = useState({ dishId: '', priceCents: '' });
  const [userOverrideForm, setUserOverrideForm] = useState({ dishId: '', priceCents: '' });
  const [planForm, setPlanForm] = useState({ basePriceCents: '', deliveryFeeCents: '', notes: '' });
  const [sectionForm, setSectionForm] = useState({ title: '', slug: '', sortOrder: '' });
  const [planRulesText, setPlanRulesText] = useState('');
  const [mergeTargets, setMergeTargets] = useState({});
  const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const selectedWeekRecord = useMemo(
    () => menuWeeks.find((week) => week.id === selectedWeek),
    [menuWeeks, selectedWeek]
  );

  const selectedCustomerRecord = useMemo(
    () => customers.find((cust) => cust.id === selectedCustomer),
    [customers, selectedCustomer]
  );

  const customerUsers = selectedCustomerRecord?.users || [];

  const authHeaders = useMemo(
    () =>
      accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    [accessToken]
  );

  const loadIngests = async () => {
    const data = await fetchJson('/api/weekly-order/admin/ingests', { headers: authHeaders });
    setIngests(data.items || []);
  };

  const loadDrafts = async () => {
    const data = await fetchJson('/api/weekly-order/admin/drafts?status=pending', { headers: authHeaders });
    setDrafts(data.items || []);
  };

  const loadDishes = async () => {
    const q = dishSearch ? `?q=${encodeURIComponent(dishSearch)}` : '';
    const data = await fetchJson(`/api/weekly-order/admin/dishes${q}`, { headers: authHeaders });
    setDishes(data.items || []);
  };

  const loadMenuWeeks = async () => {
    const data = await fetchJson('/api/weekly-order/admin/menu-weeks', { headers: authHeaders });
    setMenuWeeks(data.items || []);
    if (!selectedWeek && data.items?.length) {
      setSelectedWeek(data.items[0].id);
    }
  };

  const loadPricing = async (menuWeekId) => {
    if (!menuWeekId) return;
    const data = await fetchJson(`/api/weekly-order/admin/pricing?menuWeekId=${menuWeekId}`, { headers: authHeaders });
    setPricing(data.items || []);
  };

  const loadPlans = async (menuWeekId, customerId) => {
    if (!menuWeekId) return;
    const params = new URLSearchParams({ menuWeekId });
    if (customerId) params.set('customerId', customerId);
    const data = await fetchJson(`/api/weekly-order/admin/plans?${params.toString()}`, { headers: authHeaders });
    setPlans(data.items || []);
  };

  const loadCustomers = async () => {
    const data = await fetchJson('/api/weekly-order/admin/customers', { headers: authHeaders });
    setCustomers(data.items || []);
    if (!selectedCustomer && data.items?.length) {
      setSelectedCustomer(data.items[0].id);
    }
    if (!selectedUser && data.items?.length && data.items[0].users?.length) {
      setSelectedUser(data.items[0].users[0].id);
    }
  };

  const loadOverrides = async (menuWeekId, customerId) => {
    if (!menuWeekId || !customerId) return;
    const params = new URLSearchParams({ menuWeekId, customerId }).toString();
    const data = await fetchJson(`/api/weekly-order/admin/overrides?${params}`, { headers: authHeaders });
    setOverrides(data.items || []);
  };

  const loadUserOverrides = async (menuWeekId, userId) => {
    if (!menuWeekId || !userId) return;
    const params = new URLSearchParams({ menuWeekId, userId }).toString();
    const data = await fetchJson(`/api/weekly-order/admin/user-overrides?${params}`, { headers: authHeaders });
    setUserOverrides(data.items || []);
  };

  const isAdmin = adminUser?.role === 'admin';

  const signInWithEmail = async (event) => {
    event.preventDefault();
    if (!supabase || !email || !password) return;

    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthMessage(`Login failed: ${error.message}`);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthMessage('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setSigningIn(true);
    try {
      const origin = window.location.origin;
      const redirectUrl = `${origin}/admin/weekly-order`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        setAuthMessage('Failed to sign in with Google.');
        setSigningIn(false);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setAuthMessage('Failed to sign in. Please try again.');
      setSigningIn(false);
    }
  };

  const loadAdminUser = async () => {
    if (!user?.email) return;
    setAdminLoading(true);
    try {
      const adminData = await getCurrentWeeklyOrderUser(user.email);
      if (!adminData) {
        setAuthMessage('This account is not authorized for weekly order admin.');
        await signOut();
        setAdminUser(null);
        return;
      }
      setAdminUser(adminData);
    } catch (err) {
      console.error('Weekly order admin load error:', err);
      setAuthMessage('Unable to verify admin access.');
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadAdminUser();
    } else {
      setAdminUser(null);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!customerUsers.length) return;
    if (!selectedUser || !customerUsers.some((entry) => entry.id === selectedUser)) {
      setSelectedUser(customerUsers[0].id);
    }
  }, [customerUsers, selectedUser]);

  useEffect(() => {
    if (!selectedCustomerRecord) return;
    if (selectedCustomerRecord.planRulesJson) {
      setPlanRulesText(JSON.stringify(selectedCustomerRecord.planRulesJson, null, 2));
    } else {
      setPlanRulesText('');
    }
  }, [selectedCustomerRecord?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    loadIngests().catch(() => {});
    loadDrafts().catch(() => {});
    loadDishes().catch(() => {});
    loadMenuWeeks().catch(() => {});
    loadCustomers().catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedWeek) return;
    loadPricing(selectedWeek).catch(() => {});
    if (selectedCustomer) {
      loadOverrides(selectedWeek, selectedCustomer).catch(() => {});
      loadPlans(selectedWeek, selectedCustomer).catch(() => {});
    }
    if (selectedUser) {
      loadUserOverrides(selectedWeek, selectedUser).catch(() => {});
    }
  }, [selectedWeek, selectedCustomer, selectedUser]);

  if (authLoading || adminLoading) {
    return (
      <div className="weekly-order-admin fullpage-demo-scope">
        <div className="weekly-order-admin-shell container-page">
          <Card>
            <CardHeader>
              <CardTitle>Loading admin access...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">Checking credentials.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="weekly-order-admin fullpage-demo-scope">
        <div className="weekly-order-admin-shell container-page">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Order Admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={signInWithGoogle} disabled={signingIn}>
                Sign in with Google
              </Button>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">or sign in with email</div>
              <form onSubmit={signInWithEmail} className="space-y-3">
                <input
                  type="email"
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={signingIn}
                />
                <input
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={signingIn}
                />
                <Button type="submit" disabled={signingIn || !email || !password}>
                  {signingIn ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
              {authMessage && <p className="text-sm text-red-600">{authMessage}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="weekly-order-admin fullpage-demo-scope">
        <div className="weekly-order-admin-shell container-page">
          <Card>
            <CardHeader>
              <CardTitle>Admin access required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {authMessage || 'Your account does not have admin permissions.'}
              </p>
              <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-order-admin fullpage-demo-scope">
      <div className="weekly-order-admin-shell container-page">
        <header className="weekly-order-admin-hero">
          <div>
            <span className="weekly-order-admin-eyebrow">Weekly Order Admin</span>
            <h1>Menu approval and pricing control</h1>
            <p className="weekly-order-admin-subtitle">
              Manage Drafts ingest, catalog approvals, menu weeks, and pricing tiers.
            </p>
          </div>
          <div className="weekly-order-admin-status">{status}</div>
        </header>

        <div className="weekly-order-admin-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'is-active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'ingest' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Ingest inbox</h2>
              <Button size="sm" variant="outline" onClick={loadIngests}>
                Refresh
              </Button>
            </div>
            <div className="weekly-order-admin-grid">
              {ingests.map((ingest) => (
                <Card key={ingest.id}>
                  <CardHeader>
                    <CardTitle>{ingest.source}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600">Drafts: {ingest._count?.drafts || 0}</div>
                    <div className="text-xs text-slate-500">{new Date(ingest.receivedAt).toLocaleString()}</div>
                    {ingest.externalKey && (
                      <div className="text-xs text-slate-500">Key: {ingest.externalKey}</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'drafts' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Pending dish drafts</h2>
              <Button size="sm" variant="outline" onClick={loadDrafts}>
                Refresh
              </Button>
            </div>
            <div className="weekly-order-admin-grid">
              {drafts.map((draft) => (
                <Card key={draft.id} className="weekly-order-admin-draft-card">
                  <CardHeader>
                    <CardTitle>{draft.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-slate-600">{draft.description || 'No description'}</div>
                    <div className="weekly-order-admin-chip-row">
                      {(draft.categories || []).map((cat) => (
                        <span key={cat} className="weekly-order-admin-chip">{cat}</span>
                      ))}
                    </div>
                    <div className="weekly-order-admin-chip-row">
                      {(draft.tags || []).map((tag) => (
                        <span key={tag} className="weekly-order-admin-chip is-muted">{tag}</span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500">
                      Confidence: {draft.confidence ? draft.confidence.toFixed(2) : 'n/a'}
                    </div>
                    <div className="weekly-order-admin-merge-row">
                      <select
                        value={mergeTargets[draft.id] || ''}
                        onChange={(e) => setMergeTargets((prev) => ({ ...prev, [draft.id]: e.target.value }))}
                      >
                        <option value="">Merge into existing dish</option>
                        {dishes.map((dish) => (
                          <option key={dish.id} value={dish.id}>{dish.title}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setStatus('Merging...');
                          await fetchJson('/api/weekly-order/admin/drafts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ action: 'merge', draftId: draft.id, targetDishId: mergeTargets[draft.id] }),
                          });
                          await loadDrafts();
                          await loadDishes();
                          setStatus('Merge complete');
                        }}
                      >
                        Merge
                      </Button>
                    </div>
                    <div className="weekly-order-admin-actions">
                      <Button
                        size="sm"
                        onClick={async () => {
                          setStatus('Approving...');
                          await fetchJson('/api/weekly-order/admin/drafts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ action: 'approve', draftId: draft.id }),
                          });
                          await loadDrafts();
                          await loadDishes();
                          setStatus('Approved');
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          setStatus('Rejecting...');
                          await fetchJson('/api/weekly-order/admin/drafts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ action: 'reject', draftId: draft.id }),
                          });
                          await loadDrafts();
                          setStatus('Rejected');
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'dishes' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Dish catalog</h2>
              <div className="weekly-order-admin-search">
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={loadDishes}>Search</Button>
              </div>
            </div>
            <div className="weekly-order-admin-grid">
              {dishes.map((dish) => (
                <Card key={dish.id}>
                  <CardHeader>
                    <CardTitle>{dish.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600">{dish.description || 'No description'}</div>
                    <div className="weekly-order-admin-chip-row">
                      {(dish.categories || []).map((cat) => (
                        <span key={cat} className="weekly-order-admin-chip">{cat}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'weeks' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Menu weeks</h2>
              <Button size="sm" variant="outline" onClick={loadMenuWeeks}>Refresh</Button>
            </div>
            <div className="weekly-order-admin-form">
              <input
                type="date"
                value={newWeek.weekStart}
                onChange={(e) => setNewWeek((prev) => ({ ...prev, weekStart: e.target.value }))}
              />
              <input
                type="datetime-local"
                value={newWeek.cutoffAt}
                onChange={(e) => setNewWeek((prev) => ({ ...prev, cutoffAt: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={async () => {
                  setStatus('Creating menu week...');
                  await fetchJson('/api/weekly-order/admin/menu-weeks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({ action: 'create', ...newWeek, status: 'draft' }),
                  });
                  setNewWeek({ weekStart: '', cutoffAt: '' });
                  await loadMenuWeeks();
                  setStatus('Menu week created');
                }}
              >
                Create week
              </Button>
            </div>
            <div className="weekly-order-admin-form">
              <input
                type="text"
                placeholder="Section title"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Slug (optional)"
                value={sectionForm.slug}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Sort order"
                value={sectionForm.sortOrder}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!selectedWeek || !sectionForm.title) return;
                  setStatus('Creating section...');
                  await fetchJson('/api/weekly-order/admin/menu-weeks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({
                      action: 'add-section',
                      id: selectedWeek,
                      title: sectionForm.title,
                      slug: sectionForm.slug || undefined,
                      sectionOrder: sectionForm.sortOrder,
                    }),
                  });
                  setSectionForm({ title: '', slug: '', sortOrder: '' });
                  await loadMenuWeeks();
                  setStatus('Section created');
                }}
              >
                Add section
              </Button>
            </div>
            <div className="weekly-order-admin-form">
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                {menuWeeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {new Date(week.weekStart).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <select
                value={menuItemForm.menuDishId || ''}
                onChange={(e) => setMenuItemForm((prev) => ({ ...prev, menuDishId: e.target.value }))}
              >
                <option value="">Add dish to week</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>{dish.title}</option>
                ))}
              </select>
              <select
                value={menuItemForm.menuSectionId || ''}
                onChange={(e) => setMenuItemForm((prev) => ({ ...prev, menuSectionId: e.target.value }))}
              >
                <option value="">Assign section</option>
                {(selectedWeekRecord?.sections || []).map((section) => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </select>
              <label className="weekly-order-admin-toggle">
                <input
                  type="checkbox"
                  checked={menuItemForm.menuIsAddon || false}
                  onChange={(e) => setMenuItemForm((prev) => ({ ...prev, menuIsAddon: e.target.checked }))}
                />
                Add-on
              </label>
              <label className="weekly-order-admin-toggle">
                <input
                  type="checkbox"
                  checked={menuItemForm.menuIncludedInPlan || false}
                  onChange={(e) => setMenuItemForm((prev) => ({ ...prev, menuIncludedInPlan: e.target.checked }))}
                />
                Included
              </label>
              <Button
                size="sm"
                onClick={async () => {
                  if (!selectedWeek || !menuItemForm.menuDishId) return;
                  await fetchJson('/api/weekly-order/admin/menu-weeks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({
                      action: 'add-item',
                      id: selectedWeek,
                      dishId: menuItemForm.menuDishId,
                      isAddon: menuItemForm.menuIsAddon || false,
                      includedInPlan: menuItemForm.menuIncludedInPlan || false,
                      sectionId: menuItemForm.menuSectionId || null,
                    }),
                  });
                  await loadMenuWeeks();
                  await loadPricing(selectedWeek);
                }}
              >
                Add dish
              </Button>
            </div>
            {selectedWeekRecord?.sections?.length ? (
              <div className="weekly-order-admin-section-list">
                {selectedWeekRecord.sections.map((section) => (
                  <div key={section.id} className="weekly-order-admin-section-row">
                    <div>
                      <div className="weekly-order-admin-section-title">{section.title}</div>
                      <div className="weekly-order-admin-section-meta">{section.slug}</div>
                    </div>
                    <div className="weekly-order-admin-section-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await fetchJson('/api/weekly-order/admin/menu-weeks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ action: 'remove-section', sectionIdTarget: section.id }),
                          });
                          await loadMenuWeeks();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {selectedWeekRecord && (
              <div className="weekly-order-admin-menu-items">
                {(selectedWeekRecord.items || []).map((item) => (
                  <div key={item.id} className="weekly-order-admin-menu-item-row">
                    <span>{item.dish?.title}</span>
                    <select
                      value={item.sectionId || ''}
                      onChange={async (e) => {
                        await fetchJson('/api/weekly-order/admin/menu-weeks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...authHeaders },
                          body: JSON.stringify({
                            action: 'update-item',
                            id: selectedWeekRecord.id,
                            dishId: item.dishId,
                            sectionId: e.target.value || null,
                          }),
                        });
                        await loadMenuWeeks();
                      }}
                    >
                      <option value="">No section</option>
                      {(selectedWeekRecord.sections || []).map((section) => (
                        <option key={section.id} value={section.id}>{section.title}</option>
                      ))}
                    </select>
                    <label className="weekly-order-admin-toggle">
                      <input
                        type="checkbox"
                        checked={item.isVisible}
                        onChange={async (e) => {
                          await fetchJson('/api/weekly-order/admin/menu-weeks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({
                              action: 'update-item',
                              id: selectedWeekRecord.id,
                              dishId: item.dishId,
                              isVisible: e.target.checked,
                            }),
                          });
                          await loadMenuWeeks();
                        }}
                      />
                      Visible
                    </label>
                    <label className="weekly-order-admin-toggle">
                      <input
                        type="checkbox"
                        checked={item.isAddon}
                        onChange={async (e) => {
                          await fetchJson('/api/weekly-order/admin/menu-weeks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({
                              action: 'update-item',
                              id: selectedWeekRecord.id,
                              dishId: item.dishId,
                              isAddon: e.target.checked,
                            }),
                          });
                          await loadMenuWeeks();
                        }}
                      />
                      Add-on
                    </label>
                    <label className="weekly-order-admin-toggle">
                      <input
                        type="checkbox"
                        checked={item.includedInPlan || false}
                        onChange={async (e) => {
                          await fetchJson('/api/weekly-order/admin/menu-weeks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({
                              action: 'update-item',
                              id: selectedWeekRecord.id,
                              dishId: item.dishId,
                              includedInPlan: e.target.checked,
                            }),
                          });
                          await loadMenuWeeks();
                        }}
                      />
                      Included
                    </label>
                    <input
                      type="number"
                      placeholder="Capacity"
                      defaultValue={item.capacityLimit ?? ''}
                      onBlur={async (e) => {
                        const capacityLimit = e.target.value ? Number(e.target.value) : null;
                        await fetchJson('/api/weekly-order/admin/menu-weeks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...authHeaders },
                          body: JSON.stringify({
                            action: 'update-item',
                            id: selectedWeekRecord.id,
                            dishId: item.dishId,
                            capacityLimit,
                          }),
                        });
                        await loadMenuWeeks();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await fetchJson('/api/weekly-order/admin/menu-weeks', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...authHeaders },
                          body: JSON.stringify({
                            action: 'remove-item',
                            id: selectedWeekRecord.id,
                            dishId: item.dishId,
                          }),
                        });
                        await loadMenuWeeks();
                        await loadPricing(selectedWeek);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="weekly-order-admin-grid">
              {menuWeeks.map((week) => (
                <Card key={week.id}>
                  <CardHeader>
                    <CardTitle>{new Date(week.weekStart).toLocaleDateString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-600">Cutoff: {new Date(week.cutoffAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Status: {week.status}</div>
                    <div className="weekly-order-admin-chip-row">
                      {(week.items || []).map((item) => (
                        <span key={item.id} className="weekly-order-admin-chip">{item.dish?.title}</span>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setSelectedWeek(week.id)}>
                      Set as active
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'pricing' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Pricing matrix</h2>
              <div className="weekly-order-admin-form">
                <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                  {menuWeeks.map((week) => (
                    <option key={week.id} value={week.id}>
                      {new Date(week.weekStart).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => loadPricing(selectedWeek)}>
                  Refresh
                </Button>
              </div>
            </div>
            <div className="weekly-order-admin-pricing">
              {pricing.map((row) => (
                <div key={row.id} className="weekly-order-admin-pricing-row is-override">
                  <span>{row.dish?.title}</span>
                  <div className="weekly-order-admin-tier-inputs">
                    <label>
                      <span>Subscriber</span>
                      <input
                        type="number"
                        defaultValue={row.prices?.subscriber ?? ''}
                        onBlur={async (e) => {
                          const priceCents = Number(e.target.value || 0);
                          await fetchJson('/api/weekly-order/admin/pricing', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ menuWeekId: row.menuWeekId, dishId: row.dishId, tier: 'subscriber', priceCents }),
                          });
                          setStatus('Pricing updated');
                        }}
                      />
                    </label>
                    <label>
                      <span>Member</span>
                      <input
                        type="number"
                        defaultValue={row.prices?.member ?? ''}
                        onBlur={async (e) => {
                          const priceCents = Number(e.target.value || 0);
                          await fetchJson('/api/weekly-order/admin/pricing', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ menuWeekId: row.menuWeekId, dishId: row.dishId, tier: 'member', priceCents }),
                          });
                          setStatus('Pricing updated');
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'plans' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Plans & delivery pricing</h2>
              <Button size="sm" variant="outline" onClick={() => loadPlans(selectedWeek, selectedCustomer)}>
                Refresh
              </Button>
            </div>
            <div className="weekly-order-admin-form">
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                {menuWeeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {new Date(week.weekStart).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>{cust.slug}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Base price (cents)"
                value={planForm.basePriceCents}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, basePriceCents: e.target.value }))}
              />
              <input
                type="number"
                placeholder="Delivery fee (cents)"
                value={planForm.deliveryFeeCents}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, deliveryFeeCents: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={planForm.notes}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!selectedWeek || !selectedCustomer) return;
                  await fetchJson('/api/weekly-order/admin/plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({
                      menuWeekId: selectedWeek,
                      customerId: selectedCustomer,
                      basePriceCents: Number(planForm.basePriceCents || 0),
                      deliveryFeeCents: Number(planForm.deliveryFeeCents || 0),
                      notes: planForm.notes || null,
                    }),
                  });
                  setPlanForm({ basePriceCents: '', deliveryFeeCents: '', notes: '' });
                  await loadPlans(selectedWeek, selectedCustomer);
                  setStatus('Plan updated');
                }}
              >
                Save plan
              </Button>
            </div>
            <div className="weekly-order-admin-form weekly-order-admin-form--stack">
              <textarea
                rows={6}
                placeholder="Plan rules JSON"
                value={planRulesText}
                onChange={(e) => setPlanRulesText(e.target.value)}
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!selectedCustomer) return;
                  let payload = null;
                  try {
                    payload = planRulesText ? JSON.parse(planRulesText) : null;
                  } catch (_err) {
                    setStatus('Invalid JSON in plan rules');
                    return;
                  }
                  await fetchJson('/api/weekly-order/admin/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({
                      id: selectedCustomer,
                      planRulesJson: payload,
                    }),
                  });
                  await loadCustomers();
                  setStatus('Plan rules saved');
                }}
              >
                Save plan rules
              </Button>
            </div>
            <div className="weekly-order-admin-pricing">
              {plans.map((row) => (
                <div key={row.id} className="weekly-order-admin-pricing-row">
                  <span>{row.customer?.slug || row.customerId}</span>
                  <div className="weekly-order-admin-tier-inputs">
                    <label>
                      <span>Base</span>
                      <input
                        type="number"
                        defaultValue={row.basePriceCents}
                        onBlur={async (e) => {
                          const basePriceCents = Number(e.target.value || 0);
                          await fetchJson('/api/weekly-order/admin/plans', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({
                              menuWeekId: row.menuWeekId,
                              customerId: row.customerId,
                              basePriceCents,
                              deliveryFeeCents: row.deliveryFeeCents || 0,
                              notes: row.notes || null,
                            }),
                          });
                          setStatus('Plan updated');
                        }}
                      />
                    </label>
                    <label>
                      <span>Delivery</span>
                      <input
                        type="number"
                        defaultValue={row.deliveryFeeCents}
                        onBlur={async (e) => {
                          const deliveryFeeCents = Number(e.target.value || 0);
                          await fetchJson('/api/weekly-order/admin/plans', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({
                              menuWeekId: row.menuWeekId,
                              customerId: row.customerId,
                              basePriceCents: row.basePriceCents || 0,
                              deliveryFeeCents,
                              notes: row.notes || null,
                            }),
                          });
                          setStatus('Plan updated');
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'overrides' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Customer overrides</h2>
              <div className="weekly-order-admin-form">
                <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                  {menuWeeks.map((week) => (
                    <option key={week.id} value={week.id}>
                      {new Date(week.weekStart).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>{cust.slug}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => loadOverrides(selectedWeek, selectedCustomer)}>
                  Refresh
                </Button>
              </div>
            </div>
            <div className="weekly-order-admin-form">
              <select
                value={overrideForm.dishId}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, dishId: e.target.value }))}
              >
                <option value="">Select dish</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>{dish.title}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Price (cents)"
                value={overrideForm.priceCents}
                onChange={(e) => setOverrideForm((prev) => ({ ...prev, priceCents: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!overrideForm.dishId || !selectedWeek || !selectedCustomer) return;
                  await fetchJson('/api/weekly-order/admin/overrides', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({
                      customerId: selectedCustomer,
                      menuWeekId: selectedWeek,
                      dishId: overrideForm.dishId,
                      priceCents: Number(overrideForm.priceCents || 0),
                    }),
                  });
                  setOverrideForm({ dishId: '', priceCents: '' });
                  await loadOverrides(selectedWeek, selectedCustomer);
                  setStatus('Override created');
                }}
              >
                Add override
              </Button>
            </div>
            <div className="weekly-order-admin-pricing">
              {overrides.map((row) => (
                <div key={row.id} className="weekly-order-admin-pricing-row">
                  <span>{row.dish?.title}</span>
                  <input
                    type="number"
                    defaultValue={row.priceCents}
                    onBlur={async (e) => {
                      const priceCents = Number(e.target.value || 0);
                      await fetchJson('/api/weekly-order/admin/overrides', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        body: JSON.stringify({ customerId: row.customerId, menuWeekId: row.menuWeekId, dishId: row.dishId, priceCents }),
                      });
                      setStatus('Override updated');
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await fetchJson('/api/weekly-order/admin/overrides', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        body: JSON.stringify({ id: row.id }),
                      });
                      await loadOverrides(selectedWeek, selectedCustomer);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="weekly-order-admin-section-header">
              <h2>User overrides</h2>
            </div>
            <div className="weekly-order-admin-form">
              <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                {menuWeeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    {new Date(week.weekStart).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>{cust.slug}</option>
                ))}
              </select>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                {customerUsers.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.email}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={() => loadUserOverrides(selectedWeek, selectedUser)}>
                Refresh
              </Button>
            </div>
            <div className="weekly-order-admin-form">
              <select
                value={userOverrideForm.dishId}
                onChange={(e) => setUserOverrideForm((prev) => ({ ...prev, dishId: e.target.value }))}
              >
                <option value="">Select dish</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>{dish.title}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Price (cents)"
                value={userOverrideForm.priceCents}
                onChange={(e) => setUserOverrideForm((prev) => ({ ...prev, priceCents: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!userOverrideForm.dishId || !selectedWeek || !selectedUser) return;
                  await fetchJson('/api/weekly-order/admin/user-overrides', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({
                      userId: selectedUser,
                      menuWeekId: selectedWeek,
                      dishId: userOverrideForm.dishId,
                      priceCents: Number(userOverrideForm.priceCents || 0),
                    }),
                  });
                  setUserOverrideForm({ dishId: '', priceCents: '' });
                  await loadUserOverrides(selectedWeek, selectedUser);
                  setStatus('User override created');
                }}
              >
                Add user override
              </Button>
            </div>
            <div className="weekly-order-admin-pricing">
              {userOverrides.map((row) => (
                <div key={row.id} className="weekly-order-admin-pricing-row">
                  <span>{row.user?.email || row.userId} · {row.dish?.title}</span>
                  <input
                    type="number"
                    defaultValue={row.priceCents}
                    onBlur={async (e) => {
                      const priceCents = Number(e.target.value || 0);
                      await fetchJson('/api/weekly-order/admin/user-overrides', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        body: JSON.stringify({ userId: row.userId, menuWeekId: row.menuWeekId, dishId: row.dishId, priceCents }),
                      });
                      setStatus('User override updated');
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await fetchJson('/api/weekly-order/admin/user-overrides', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        body: JSON.stringify({ id: row.id }),
                      });
                      await loadUserOverrides(selectedWeek, selectedUser);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'logs' && (
          <section className="weekly-order-admin-section">
            <div className="weekly-order-admin-section-header">
              <h2>Ingest logs</h2>
              <Button size="sm" variant="outline" onClick={loadIngests}>Refresh</Button>
            </div>
            <div className="weekly-order-admin-grid">
              {ingests.map((ingest) => (
                <Card key={ingest.id}>
                  <CardHeader>
                    <CardTitle>{ingest.source}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-slate-500">Received: {new Date(ingest.receivedAt).toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Drafts: {ingest._count?.drafts || 0}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminWeeklyOrderPage;
