import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { supabase } from '../lib/supabaseClient';
import { getCurrentWeeklyOrderUser } from '../weeklyOrder/supabaseClient';
import '../styles/fullpage-demo-theme.css';
import '../styles/weekly-order-admin.css';

const TABS = [
  { id: 'menu-ingest', label: '📷 Menu Ingest' },
  { id: 'prep-list', label: '📋 Prep List' },
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
  const [editingDish, setEditingDish] = useState(null);
  const [dishEditForm, setDishEditForm] = useState({});
  const [populateIngestId, setPopulateIngestId] = useState('');
  const [populateSectionId, setPopulateSectionId] = useState('');
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

  const fmtDollars = (cents) => {
    if (cents == null || cents === '') return '';
    return `$${(Number(cents) / 100).toFixed(2)}`;
  };

  const parseDollars = (value) => {
    const cleaned = value.replace(/[$,]/g, '').trim();
    if (!cleaned) return 0;
    return Math.round(parseFloat(cleaned) * 100) || 0;
  };

  const startEditDish = (dish) => {
    setEditingDish(dish.id);
    setDishEditForm({
      title: dish.title || '',
      description: dish.description || '',
      categories: (dish.categories || []).join(', '),
      tags: (dish.tags || []).join(', '),
      allergens: (dish.allergens || []).join(', '),
      status: dish.status || 'approved',
    });
  };

  const saveDishEdit = async (dishId) => {
    setStatus('Saving dish...');
    await fetchJson('/api/weekly-order/admin/dishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        id: dishId,
        title: dishEditForm.title,
        description: dishEditForm.description || null,
        categories: dishEditForm.categories.split(',').map((s) => s.trim()).filter(Boolean),
        tags: dishEditForm.tags.split(',').map((s) => s.trim()).filter(Boolean),
        allergens: dishEditForm.allergens.split(',').map((s) => s.trim()).filter(Boolean),
        status: dishEditForm.status,
      }),
    });
    setEditingDish(null);
    await loadDishes();
    setStatus('Dish saved');
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

        {activeTab === 'menu-ingest' && (
          <MenuIngestTab authHeaders={authHeaders} customers={customers} onPublished={loadMenuWeeks} />
        )}

        {activeTab === 'prep-list' && (
          <PrepListTab authHeaders={authHeaders} menuWeeks={menuWeeks} />
        )}

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
                  {editingDish === dish.id ? (
                    <>
                      <CardHeader>
                        <input
                          type="text"
                          value={dishEditForm.title}
                          onChange={(e) => setDishEditForm((prev) => ({ ...prev, title: e.target.value }))}
                          className="weekly-order-admin-edit-input"
                          placeholder="Title"
                        />
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <textarea
                          rows={2}
                          value={dishEditForm.description}
                          onChange={(e) => setDishEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          className="weekly-order-admin-edit-input"
                          placeholder="Description"
                        />
                        <input
                          type="text"
                          value={dishEditForm.categories}
                          onChange={(e) => setDishEditForm((prev) => ({ ...prev, categories: e.target.value }))}
                          className="weekly-order-admin-edit-input"
                          placeholder="Categories (comma-separated)"
                        />
                        <input
                          type="text"
                          value={dishEditForm.tags}
                          onChange={(e) => setDishEditForm((prev) => ({ ...prev, tags: e.target.value }))}
                          className="weekly-order-admin-edit-input"
                          placeholder="Tags (comma-separated)"
                        />
                        <input
                          type="text"
                          value={dishEditForm.allergens}
                          onChange={(e) => setDishEditForm((prev) => ({ ...prev, allergens: e.target.value }))}
                          className="weekly-order-admin-edit-input"
                          placeholder="Allergens (comma-separated)"
                        />
                        <select
                          value={dishEditForm.status}
                          onChange={(e) => setDishEditForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                          <option value="draft">Draft</option>
                          <option value="approved">Approved</option>
                          <option value="archived">Archived</option>
                        </select>
                        <div className="weekly-order-admin-actions">
                          <Button size="sm" onClick={() => saveDishEdit(dish.id)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingDish(null)}>Cancel</Button>
                        </div>
                      </CardContent>
                    </>
                  ) : (
                    <>
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
                        {(dish.tags || []).length > 0 && (
                          <div className="weekly-order-admin-chip-row">
                            {dish.tags.map((tag) => (
                              <span key={tag} className="weekly-order-admin-chip is-muted">{tag}</span>
                            ))}
                          </div>
                        )}
                        {(dish.allergens || []).length > 0 && (
                          <div className="text-xs text-slate-500">Allergens: {dish.allergens.join(', ')}</div>
                        )}
                        <div className="text-xs text-slate-500">Status: {dish.status}</div>
                        <Button size="sm" variant="outline" onClick={() => startEditDish(dish)} className="mt-2">
                          Edit
                        </Button>
                      </CardContent>
                    </>
                  )}
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
            <div className="weekly-order-admin-form">
              <select
                value={populateIngestId}
                onChange={(e) => setPopulateIngestId(e.target.value)}
              >
                <option value="">Populate from ingest...</option>
                {ingests.map((ingest) => (
                  <option key={ingest.id} value={ingest.id}>
                    {ingest.source} — {new Date(ingest.receivedAt).toLocaleDateString()} ({ingest._count?.drafts || '?'} drafts)
                  </option>
                ))}
              </select>
              <select
                value={populateSectionId}
                onChange={(e) => setPopulateSectionId(e.target.value)}
              >
                <option value="">No section (unassigned)</option>
                {(selectedWeekRecord?.sections || []).map((section) => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={async () => {
                  if (!selectedWeek || !populateIngestId) return;
                  setStatus('Populating menu from ingest...');
                  try {
                    const result = await fetchJson('/api/weekly-order/admin/menu-weeks', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...authHeaders },
                      body: JSON.stringify({
                        action: 'populate-from-ingest',
                        id: selectedWeek,
                        ingestId: populateIngestId,
                        sectionId: populateSectionId || null,
                      }),
                    });
                    await loadMenuWeeks();
                    await loadPricing(selectedWeek);
                    setStatus(`Added ${result.added} dish${result.added === 1 ? '' : 'es'} from ingest`);
                  } catch (err) {
                    setStatus(`Populate failed: ${err.message}`);
                  }
                }}
              >
                Populate from ingest
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
                        type="text"
                        defaultValue={row.prices?.subscriber != null ? (row.prices.subscriber / 100).toFixed(2) : ''}
                        placeholder="0.00"
                        onBlur={async (e) => {
                          const priceCents = parseDollars(e.target.value);
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
                        type="text"
                        defaultValue={row.prices?.member != null ? (row.prices.member / 100).toFixed(2) : ''}
                        placeholder="0.00"
                        onBlur={async (e) => {
                          const priceCents = parseDollars(e.target.value);
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
                type="text"
                placeholder="Base price ($)"
                value={planForm.basePriceCents}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, basePriceCents: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Delivery fee ($)"
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
                      basePriceCents: parseDollars(planForm.basePriceCents),
                      deliveryFeeCents: parseDollars(planForm.deliveryFeeCents),
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
                        type="text"
                        defaultValue={row.basePriceCents != null ? (row.basePriceCents / 100).toFixed(2) : ''}
                        placeholder="0.00"
                        onBlur={async (e) => {
                          const basePriceCents = parseDollars(e.target.value);
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
                        type="text"
                        defaultValue={row.deliveryFeeCents != null ? (row.deliveryFeeCents / 100).toFixed(2) : ''}
                        placeholder="0.00"
                        onBlur={async (e) => {
                          const deliveryFeeCents = parseDollars(e.target.value);
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
                type="text"
                placeholder="Price ($)"
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
                      priceCents: parseDollars(overrideForm.priceCents),
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
                    type="text"
                    defaultValue={row.priceCents != null ? (row.priceCents / 100).toFixed(2) : ''}
                    placeholder="0.00"
                    onBlur={async (e) => {
                      const priceCents = parseDollars(e.target.value);
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
                type="text"
                placeholder="Price ($)"
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
                      priceCents: parseDollars(userOverrideForm.priceCents),
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
                    type="text"
                    defaultValue={row.priceCents != null ? (row.priceCents / 100).toFixed(2) : ''}
                    placeholder="0.00"
                    onBlur={async (e) => {
                      const priceCents = parseDollars(e.target.value);
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

// ─── Menu Ingest Tab ──────────────────────────────────────────────────────────

const ALL_CLIENT_SLUGS_PLACEHOLDER = '__all__';

async function loadImageAsOptimizedDataUrl(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  const sourceDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result || '');
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = sourceDataUrl;
  });

  const { width, height } = image;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not prepare image');
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(outputMime, outputMime === 'image/jpeg' ? quality : undefined);
}

const MenuIngestTab = ({ authHeaders, customers, onPublished }) => {
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'image'
  const [textInput, setTextInput] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [imageMime, setImageMime] = useState('image/jpeg');
  const [imagePreview, setImagePreview] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [dishes, setDishes] = useState(null); // null = not yet parsed
  const [weekStart, setWeekStart] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError] = useState('');
  const [blogPosting, setBlogPosting] = useState(false);
  const [blogResult, setBlogResult] = useState(null);

  // Default weekStart to next Monday
  React.useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    setWeekStart(nextMonday.toISOString().slice(0, 10));
  }, []);

  const handleImageFile = (file) => {
    if (!file) return;
    setParseError('');
    loadImageAsOptimizedDataUrl(file)
      .then((dataUrl) => {
        const mimeMatch = /^data:([^;]+);base64,/.exec(dataUrl);
        setImageMime(mimeMatch?.[1] || file.type || 'image/jpeg');
        setImagePreview(dataUrl);
        setImageBase64(dataUrl.split(',')[1] || '');
      })
      .catch((err) => {
        setImagePreview('');
        setImageBase64('');
        setParseError(err.message || 'Could not prepare image');
      });
  };

  const handleParse = async () => {
    setParsing(true);
    setParseError('');
    setDishes(null);
    setPublishResult(null);
    try {
      const body = inputMode === 'image'
        ? { imageBase64, mimeType: imageMime }
        : { text: textInput };
      const res = await fetch('/api/weekly-order/admin/menu-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      setDishes(data.dishes.map(d => ({ ...d, _clientSlugs: d.clientSlugs || [] })));
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const updateDish = (i, patch) => {
    setDishes(prev => prev.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  };

  const removeDish = (i) => {
    setDishes(prev => prev.filter((_, idx) => idx !== i));
  };

  const handlePublish = async () => {
    if (!weekStart || !dishes?.length) return;
    setPublishing(true);
    setPublishError('');
    setPublishResult(null);
    try {
      const payload = {
        weekStart,
        dishes: dishes.map(d => ({
          title: d.title,
          description: d.description,
          tags: d.tags,
          allergens: d.allergens,
          notes: d.notes,
          matchedDishId: d.matchedDishId || null,
          clientSlugs: d._clientSlugs || [],
        })),
      };
      const res = await fetch('/api/weekly-order/admin/menu-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      setPublishResult(data);
      onPublished?.();
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleBlogPost = async () => {
    if (!publishResult?.menuWeekId) return;
    setBlogPosting(true);
    setBlogResult(null);
    try {
      const res = await fetch('/api/weekly-order/admin/menu-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ menuWeekId: publishResult.menuWeekId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Blog post failed');
      setBlogResult(data);
    } catch (err) {
      setBlogResult({ error: err.message });
    } finally {
      setBlogPosting(false);
    }
  };

  const customerOptions = customers.map(c => ({ id: c.id, slug: c.slug, name: c.name || c.slug }));

  return (
    <section className="weekly-order-admin-section">
      <div className="weekly-order-admin-section-header">
        <h2>Menu Ingest</h2>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Photo or text → parse → review → publish to week
        </span>
      </div>

      {/* Step 1: Input */}
      <Card style={{ marginBottom: '1rem' }}>
        <CardHeader><CardTitle>Step 1 — Upload menu</CardTitle></CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Button size="sm" variant={inputMode === 'text' ? 'default' : 'outline'} onClick={() => setInputMode('text')}>
              Text / Typed
            </Button>
            <Button size="sm" variant={inputMode === 'image' ? 'default' : 'outline'} onClick={() => setInputMode('image')}>
              Photo / Image
            </Button>
          </div>

          {inputMode === 'text' && (
            <textarea
              rows={10}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={'Paste or type your menu here.\n\nExamples:\nChicken Tikka Masala - basmati rice, naan, cilantro\nCaesar Salad - romaine, parmesan, croutons\n\nOr use section headers:\nDinner:\n- Pork Belly\nKids:\n- Mac and Cheese'}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical' }}
            />
          )}

          {inputMode === 'image' && (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={e => handleImageFile(e.target.files?.[0])}
                style={{ marginBottom: '0.5rem' }}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Menu preview" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: '0.375rem', marginTop: '0.5rem', border: '1px solid #e2e8f0' }} />
              )}
            </div>
          )}

          {parseError && <p style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.85rem' }}>{parseError}</p>}

          <Button
            style={{ marginTop: '0.75rem' }}
            onClick={handleParse}
            disabled={parsing || (inputMode === 'text' ? !textInput.trim() : !imageBase64)}
          >
            {parsing ? 'Parsing with Claude…' : 'Parse Menu'}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Review */}
      {dishes && (
        <Card style={{ marginBottom: '1rem' }}>
          <CardHeader>
            <CardTitle>Step 2 — Review dishes ({dishes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {dishes.map((dish, i) => (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: '#fafafa' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Dish name</label>
                      <input
                        value={dish.title}
                        onChange={e => updateDish(i, { title: e.target.value })}
                        style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.9rem', fontWeight: 600 }}
                      />
                    </div>
                    <Button size="sm" variant="outline" style={{ color: '#ef4444', marginTop: '1.1rem', flexShrink: 0 }} onClick={() => removeDish(i)}>
                      Remove
                    </Button>
                  </div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Ingredients</label>
                  <input
                    value={dish.description}
                    onChange={e => updateDish(i, { description: e.target.value })}
                    placeholder="comma-separated ingredients"
                    style={{ width: '100%', padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.85rem', marginBottom: '0.4rem' }}
                  />
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Tags</label>
                      <input
                        value={(dish.tags || []).join(', ')}
                        onChange={e => updateDish(i, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                        placeholder="dinner, kids…"
                        style={{ display: 'block', padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', width: 180 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Allergens</label>
                      <input
                        value={(dish.allergens || []).join(', ')}
                        onChange={e => updateDish(i, { allergens: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                        placeholder="dairy, wheat…"
                        style={{ display: 'block', padding: '0.3rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.8rem', width: 180 }}
                      />
                    </div>
                  </div>
                  {customerOptions.length > 0 && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Clients</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                        {customerOptions.map(c => (
                          <label key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={(dish._clientSlugs || []).includes(c.slug)}
                              onChange={e => {
                                const prev = dish._clientSlugs || [];
                                const next = e.target.checked ? [...prev, c.slug] : prev.filter(s => s !== c.slug);
                                updateDish(i, { _clientSlugs: next });
                              }}
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {dish.matchedDishTitle && (
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.4rem' }}>
                      ↳ Matched existing dish: <strong>{dish.matchedDishTitle}</strong> ({Math.round((dish.matchScore || 0) * 100)}% confidence)
                      {' · '}
                      <button
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                        onClick={() => updateDish(i, { matchedDishId: null, matchedDishTitle: null, matchScore: 0 })}
                      >
                        Create new instead
                      </button>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Publish */}
      {dishes && dishes.length > 0 && (
        <Card style={{ marginBottom: '1rem' }}>
          <CardHeader><CardTitle>Step 3 — Publish to week</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Week of</label>
              <input
                type="date"
                value={weekStart}
                onChange={e => setWeekStart(e.target.value)}
                style={{ padding: '0.35rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
              />
            </div>
            {publishError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{publishError}</p>}
            <Button onClick={handlePublish} disabled={publishing || !weekStart}>
              {publishing ? 'Publishing…' : `Publish ${dishes.length} dish${dishes.length !== 1 ? 'es' : ''} to week`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {publishResult && (
        <Card>
          <CardHeader><CardTitle>Published ✓</CardTitle></CardHeader>
          <CardContent>
            <p style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.75rem' }}>
              {publishResult.dishes?.filter(d => !d.skipped).length} dishes added to week of{' '}
              {new Date(publishResult.weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </p>

            {/* Sticker input */}
            <details style={{ marginBottom: '0.75rem' }}>
              <summary style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
                Sticker input.txt (copy → paste into make_stickers.py)
              </summary>
              <textarea
                readOnly
                value={publishResult.stickerInput || ''}
                rows={Math.min(20, (publishResult.stickerInput || '').split('\n').length + 2)}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', marginTop: '0.5rem', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', resize: 'vertical' }}
                onClick={e => e.target.select()}
              />
            </details>

            {/* Blog post button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Button variant="outline" size="sm" onClick={handleBlogPost} disabled={blogPosting}>
                {blogPosting ? 'Creating blog post…' : 'Create blog post in Sanity'}
              </Button>
              {blogResult?.studioUrl && (
                <a href={blogResult.studioUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#2563eb' }}>
                  Open in Sanity Studio →
                </a>
              )}
              {blogResult?.error && (
                <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>{blogResult.error}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

// ─── Prep List Tab ───────────────────────────────────────────────────────────

const MEAL_TYPE_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  kids: 'Kids',
  other: 'Other',
};

const PrepListTab = ({ authHeaders, menuWeeks }) => {
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prepList, setPrepList] = useState(null);
  const [printMode, setPrintMode] = useState(false);

  // Default to the first (most recent) week
  React.useEffect(() => {
    if (!selectedWeekId && menuWeeks?.length) {
      setSelectedWeekId(menuWeeks[0].id);
    }
  }, [menuWeeks]);

  const loadPrepList = async () => {
    if (!selectedWeekId) return;
    setLoading(true);
    setError('');
    setPrepList(null);
    try {
      const res = await fetch(`/api/weekly-order/admin/menu-preplist?menuWeekId=${selectedWeekId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load prep list');
      setPrepList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (selectedWeekId) loadPrepList();
  }, [selectedWeekId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="weekly-order-admin-section">
      <div className="weekly-order-admin-section-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>Prep List</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedWeekId}
            onChange={e => setSelectedWeekId(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.85rem' }}
          >
            <option value="">— select a week —</option>
            {menuWeeks.map(w => (
              <option key={w.id} value={w.id}>
                {new Date(w.weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' '}({w.status})
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={loadPrepList} disabled={loading || !selectedWeekId}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          {prepList && (
            <Button size="sm" variant="outline" onClick={handlePrint}>
              Print / Save PDF
            </Button>
          )}
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.5rem 0' }}>{error}</p>}

      {prepList && (
        <div className="prep-list-doc">
          {/* Header */}
          <div className="prep-list-header">
            <div>
              <h1 className="prep-list-title">Kitchen Prep List</h1>
              <p className="prep-list-subtitle">Week of {prepList.weekLabel}</p>
            </div>
            <div className="prep-list-summary-badges">
              <span className="prep-list-badge">{prepList.summary.totalDishes} dishes</span>
              <span className="prep-list-badge">{prepList.summary.totalClients} clients</span>
              {Object.entries(prepList.summary.byMealType).map(([meal, count]) => (
                <span key={meal} className="prep-list-badge prep-list-badge--meal">
                  {MEAL_TYPE_LABELS[meal] || meal}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Dish groups by meal type */}
          {prepList.groups.map(group => (
            <div key={group.mealType} className="prep-list-group">
              <h2 className="prep-list-group-heading">{MEAL_TYPE_LABELS[group.mealType] || group.mealType}</h2>
              {group.dishes.map((dish, i) => (
                <div key={i} className="prep-list-dish">
                  <div className="prep-list-dish-header">
                    <div className="prep-list-dish-title-row">
                      <span className="prep-list-dish-name">{dish.title}</span>
                      {dish.allergens?.length > 0 && (
                        <span className="prep-list-allergens">
                          ⚠ {dish.allergens.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="prep-list-client-count">
                      ×{dish.clientCount}
                      {dish.clientNames?.length > 0 && (
                        <span className="prep-list-client-names"> ({dish.clientNames.join(', ')})</span>
                      )}
                    </div>
                  </div>
                  {dish.ingredients?.length > 0 && (
                    <div className="prep-list-ingredients">
                      {dish.ingredients.map((ing, j) => (
                        <span key={j} className="prep-list-ingredient">
                          <span className="prep-list-checkbox" />
                          {ing}
                        </span>
                      ))}
                    </div>
                  )}
                  {dish.description && dish.ingredients?.length === 0 && (
                    <p className="prep-list-description">{dish.description}</p>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Shopping / ingredient master list */}
          {prepList.allIngredients?.length > 0 && (
            <div className="prep-list-group prep-list-shopping">
              <h2 className="prep-list-group-heading">Shopping List (all ingredients)</h2>
              <div className="prep-list-shopping-grid">
                {prepList.allIngredients.map((ing, i) => (
                  <div key={i} className="prep-list-shopping-item">
                    <span className="prep-list-checkbox" />
                    {ing}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="prep-list-footer">
            Generated {new Date(prepList.generatedAt).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      )}
    </section>
  );
};

export default AdminWeeklyOrderPage;
