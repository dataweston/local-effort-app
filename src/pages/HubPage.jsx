import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  ChartNoAxesCombined,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Soup,
  UsersRound,
  Utensils,
} from 'lucide-react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import EconomicsModelView from '../components/hub/EconomicsModelView';
import { api, addDays, todayIso, HubAvatar } from '../components/hub/hubShared';
import { HubAccessRequired, HubAuthScreen, HubPasswordRecovery, ProfileSetup } from '../components/hub/HubAuthScreens';
import { CustomerHomeView, TodayView } from '../components/hub/HubTodayView';
import { CalendarView } from '../components/hub/HubCalendarView';
import { ChatView } from '../components/hub/HubChatView';
import { DocsView } from '../components/hub/HubDocsView';
import { PeopleView } from '../components/hub/HubPeopleView';
import { WeeklyMealPrepView } from '../components/hub/HubMealPrepView';
import { FoodInputsView } from '../components/hub/HubFoodInputsView';
import { PrivilegedTools } from '../components/hub/HubPrivilegedTools';
import { LocalistClosedScreen, LocalistGuestShell, LocalistView } from '../components/hub/HubLocalistView';
import { SecurityGuestShell, SecurityView } from '../components/hub/HubSecurityView';
import '../styles/hub.css';

const tabs = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'calendar', label: 'Calendar & Shifts', icon: CalendarDays },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'docs', label: 'Docs', icon: FileText },
  { id: 'people', label: 'People', icon: UsersRound },
];


const mealPrepTab = { id: 'weeklyMealPrep', label: 'Meal Prep', icon: Soup };

const foodInputsTab = { id: 'foodInputs', label: 'Ingredient Intake', icon: Utensils };

const economicsTab = { id: 'economics', label: 'Economics', icon: ChartNoAxesCombined };


export default function HubPage() {
  const auth = useSupabaseAuth();
  const hubParams = new URLSearchParams(window.location.search);
  const inviteToken = hubParams.get('invite') || '';
  const localistToken = hubParams.get('localist') || '';
  const sharedDocId = hubParams.get('doc') || '';
  const hubPath = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const isSecurityRoute = hubPath === '/hub/security';
  const isInputsRoute = hubPath === '/hub/inputs';
  const isEconomicsRoute = hubPath === '/hub/economics';
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [localistAccess, setLocalistAccess] = useState({ loaded: !localistToken, window: null });
  const [tab, setTab] = useState(isSecurityRoute ? 'security' : isInputsRoute ? 'foodInputs' : isEconomicsRoute ? 'economics' : sharedDocId ? 'docs' : 'today');
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
  // Customer-visible tabs are intentionally limited to their own household data.
  // Chat and People remain staff-only so customers cannot enumerate member names.
  const todayTab = tabs[0];
  const customerTabs = [todayTab, mealPrepTab, foodInputsTab];
  const navTabs = isInputsRoute
    ? [foodInputsTab]
    : isLocalist
    ? [localistTab]
    : isCustomer
    ? customerTabs
    : isPrivileged
    ? [...tabs, mealPrepTab, foodInputsTab, economicsTab, adminTab, localistTab, securityTab]
    : [...tabs, mealPrepTab, foodInputsTab, localistTab, securityTab];
  const mobileNavTabs = isInputsRoute
    ? [foodInputsTab]
    : isLocalist
    ? [localistTab]
    : isCustomer
    ? customerTabs
    : isPrivileged
    ? [tabs[0], tabs[1], mealPrepTab, foodInputsTab, economicsTab, adminTab, localistTab, securityTab]
    : [tabs[0], tabs[1], mealPrepTab, foodInputsTab, tabs[3], localistTab, securityTab];
  // Tabs a customer is allowed to land on; anything else falls back to Today.
  const customerTabIds = new Set(customerTabs.map((t) => t.id));
  const activeTab = isInputsRoute
    ? 'foodInputs'
    : isLocalist
    ? 'localist'
    : isCustomer
    ? (sharedDocId ? 'docs' : customerTabIds.has(tab) ? tab : 'today')
    : !isPrivileged && tab === 'economics'
    ? 'today'
    : tab;

  if (localistToken) {
    if (!localistAccess.loaded) {
      return (
        <>
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
        <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>
      </>
    );
  }
  if (auth.isPasswordRecovery) {
    return (
      <>
        <HubPasswordRecovery auth={auth} />
      </>
    );
  }
  if (!auth.user) {
    return (
      <>
        <HubAuthScreen auth={auth} inviteToken={inviteToken} />
      </>
    );
  }
  if (profileLoaded && !profile) {
    if (!inviteToken && !auth.isAdmin) {
      return (
        <>
          <HubAccessRequired auth={auth} />
        </>
      );
    }
    return (
      <>
        <ProfileSetup accessToken={auth.accessToken} inviteToken={inviteToken} onDone={loadProfile} user={auth.user} />
      </>
    );
  }
  if (!profileLoaded) {
    return (
      <>
        <main className="hub-auth-screen"><RefreshCw className="animate-spin" size={36} /></main>
      </>
    );
  }

  return (
    <div className="hub-app">
      <aside className="hub-sidebar">
        <div className="hub-logo">
          <HubAvatar name={profile.displayName} size={36} />
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
          {isPrivileged && (
            <a className="hub-nav-link" href="/planner">
              <LayoutGrid size={15} aria-hidden="true" />
              Planner
            </a>
          )}
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
        {activeTab === 'today' && !isCustomer && <TodayView calendar={calendar} docs={docs} conversations={conversations} shifts={shifts} setTab={setTab} accessToken={auth.accessToken} isCustomer={isCustomer} profile={profile} onRefresh={loadShellData} />}
        {/* Privileged "view as customer" hides the staff House Notepad via isCustomer above. */}
        {(activeTab === 'calendar' || activeTab === 'shifts') && <CalendarView accessToken={auth.accessToken} profile={profile} isPrivileged={isPrivileged} />}
        {activeTab === 'chat' && <ChatView accessToken={auth.accessToken} people={people} currentUserId={profile.userId} />}
        {activeTab === 'docs' && <DocsView accessToken={auth.accessToken} docs={docs} reloadDocs={reloadDocs} isPrivileged={isPrivileged} canEdit={!isCustomer} sharedDocId={sharedDocId} />}
        {activeTab === 'people' && <PeopleView people={people} onMessage={() => setTab('chat')} />}
        {activeTab === 'weeklyMealPrep' && <WeeklyMealPrepView accessToken={auth.accessToken} isPrivileged={isPrivileged} isCustomer={isCustomer} />}
        {activeTab === 'foodInputs' && <FoodInputsView accessToken={auth.accessToken} />}
        {activeTab === 'economics' && isPrivileged && <EconomicsModelView accessToken={auth.accessToken} />}
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

