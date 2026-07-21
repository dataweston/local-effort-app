import React, { useEffect, useState } from 'react';
import { Brain, Calendar, LayoutGrid, BarChart3, LogIn, LogOut, Inbox, Layers, ListChecks, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { usePlannerState } from '../components/weeklyplanner/usePlannerState';
import { usePlannerNav } from '../components/weeklyplanner/usePlannerNav';
import { WeeklyView } from '../components/weeklyplanner/WeeklyView';
import { DailyView } from '../components/weeklyplanner/DailyView';
import { MonthlyView } from '../components/weeklyplanner/MonthlyView';
import { AgendaView } from '../components/weeklyplanner/AgendaView';
import { ProjectsView } from '../components/weeklyplanner/ProjectsView';
import { EditPanel } from '../components/weeklyplanner/EditPanel';
import { RecurringChangeDialog } from '../components/weeklyplanner/RecurringChangeDialog';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useBrainInbox } from '../hooks/useBrainInbox';
import { BrainInboxDrawer } from '../components/brain/BrainInboxDrawer';
import { BrainPulsePanel } from '../components/brain/BrainPulsePanel';
import { ForecastPanel } from '../components/weeklyplanner/ForecastPanel';
import { StaffScheduleView } from '../components/weeklyplanner/StaffScheduleView';
import '../styles/planner.css';

export default function WeeklyDemoPage() {
  // Prevent search engines from indexing this page
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

  const nav = usePlannerNav();
  const {
    view, setView,
    weekStart, weekDates,
    selectedDate,
    selectedYear, selectedMonthNum, selectedMonth,
    goNextDay, goPrevDay,
    goNextWeek, goPrevWeek,
    goNextMonth, goPrevMonth,
    selectWeekFromMonth,
    selectDayFromWeek,
  } = nav;

  const auth = useSupabaseAuth();

  const [inboxOpen, setInboxOpen] = useState(false);
  const inbox = useBrainInbox({ accessToken: auth.accessToken, enabled: !!auth.isAdmin });

  const [captureText, setCaptureText] = useState('');
  const [captureActive, setCaptureActive] = useState(false);
  const [brainOpen, setBrainOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('le:plannerBrainOpen') === '1';
  });
  const toggleBrain = () => {
    setBrainOpen(prev => {
      const next = !prev;
      try { window.localStorage.setItem('le:plannerBrainOpen', next ? '1' : '0'); } catch (_err) { /* preference only */ }
      return next;
    });
  };
  const fmtMoney = (n) => `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  const mode = auth.loading ? null : (auth.user ? 'persisted' : 'demo');
  const planner = usePlannerState({ mode, accessToken: auth.accessToken, weekStart, selectedMonth });

  const overheadTotal = planner.overheads.reduce((sum, o) => sum + (o.monthlyCost || 0), 0);
  const weeklyCogs = planner.weekCogs.reduce((sum, c) => sum + (c.amountCents != null ? c.amountCents / 100 : (c.amount || 0)), 0);

  // Use monthly totals when on monthly view, otherwise weekly
  const isMonthly = view === 'monthly';
  const displayTotals = isMonthly
    ? { revenue: planner.monthlyTotals.revenue, cost: planner.monthlyTotals.labor, cogs: planner.monthlyTotals.cogs, net: planner.monthlyTotals.net }
    : { ...planner.totals, cogs: weeklyCogs, net: planner.totals.revenue - planner.totals.cost - weeklyCogs };

  const handleDayClick = (date) => {
    selectDayFromWeek(date);
  };

  const handleSignIn = async () => {
    try {
      await auth.signInWithGoogle(`${window.location.origin}/planner`);
    } catch (err) {
      // Auth redirect will happen
    }
  };

  return (
    <div className="fullpage-demo-scope planner-page min-h-screen">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 safe-area-top planner-topbar">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          {/* Title row */}
          <div className="planner-topbar-row">
            <div className="planner-title min-w-0">
              <h1>Planner</h1>
              <p className="hidden sm:block">
                {mode === 'persisted' ? 'Saved automatically' : 'Sign in to save your plan'}
              </p>
            </div>

            {/* Scoreboard — Net is the one large figure */}
            <div className="planner-scoreboard" role="status" aria-label="Money summary">
              <dl className="planner-figures">
                <div><dt>Revenue</dt><dd>{fmtMoney(displayTotals.revenue)}</dd></div>
                <div><dt>Labor</dt><dd>{fmtMoney(displayTotals.cost)}</dd></div>
                {displayTotals.cogs > 0 && <div><dt>COGS</dt><dd>{fmtMoney(displayTotals.cogs)}</dd></div>}
                {isMonthly && overheadTotal > 0 && <div><dt>Overhead</dt><dd>{fmtMoney(overheadTotal)}</dd></div>}
              </dl>
              <div className={`planner-net ${displayTotals.net < 0 ? 'is-negative' : 'is-positive'}`}>
                <span>Net · {isMonthly ? 'month' : 'week'}</span>
                <strong>{displayTotals.net < 0 ? '−' : ''}{fmtMoney(Math.abs(displayTotals.net))}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="planner-actions">
              {auth.isAdmin && (
                <button
                  className={`planner-button ${brainOpen ? 'is-active' : ''}`}
                  onClick={toggleBrain}
                  title="Brain pulse & forecast"
                >
                  <Brain size={15} />
                  <span className="hidden sm:inline">Brain</span>
                </button>
              )}
              {auth.isAdmin && (
                <button
                  onClick={() => setInboxOpen(v => !v)}
                  className="planner-button touch-target-ios"
                  title="Brain inbox"
                >
                  <Inbox size={16} />
                  {inbox.total > 0 && (
                    <span className="planner-badge">{inbox.total > 99 ? '99+' : inbox.total}</span>
                  )}
                </button>
              )}
              {auth.user ? (
                <button onClick={auth.signOut} className="planner-button touch-target-ios">
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              ) : (
                <button onClick={handleSignIn} className="planner-button planner-button-primary touch-target-ios">
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Sign in to save</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Quick-capture bar — admin only */}
        {auth.isAdmin && (
          <form
            onSubmit={async e => {
              e.preventDefault();
              const text = captureText.trim();
              if (!text) return;
              setCaptureActive(true);
              try {
                const id = await inbox.capture({ rawContent: text, source: 'admin_ux' });
                if (id) setCaptureText('');
              } finally {
                setCaptureActive(false);
              }
            }}
            className="planner-capture mx-4 mb-2 mt-1"
          >
            <input
              type="text"
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              placeholder="Capture a note, task, or vendor to brain inbox…"
              className="text-[16px] sm:text-sm"
              disabled={captureActive}
            />
            <button type="submit" disabled={!captureText.trim() || captureActive}>
              {captureActive ? '…' : 'Add'}
            </button>
          </form>
        )}
      </div>

      {/* Brain pulse + forecast — summoned from the topbar Brain toggle */}
      {auth.isAdmin && brainOpen && (
        <div className="max-w-[1800px] mx-auto pt-3 planner-brain-stack">
          <BrainPulsePanel
            accessToken={auth.accessToken}
            enabled={!!auth.isAdmin}
            onOpenInbox={() => setInboxOpen(true)}
          />
          <ForecastPanel accessToken={auth.accessToken} enabled={!!auth.isAdmin} />
        </div>
      )}

      {/* View tabs + content */}
      <div className="max-w-[1800px] mx-auto px-4 py-4">
        <Tabs value={view} onValueChange={setView}>
          <TabsList
            className="inline-flex h-10 items-center justify-center rounded-lg p-1 mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 80%, var(--color-border-default))' }}
          >
            <TabsTrigger
              value="agenda"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:shadow-sm"
            >
              <ListChecks size={14} />
              <span>Agenda</span>
            </TabsTrigger>
            <TabsTrigger
              value="daily"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:shadow-sm"
              style={{ '--tw-shadow-color': 'var(--color-border-default)' }}
            >
              <Calendar size={14} />
              <span className="hidden sm:inline">Daily</span>
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:shadow-sm"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Weekly</span>
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:shadow-sm"
            >
              <BarChart3 size={14} />
              <span className="hidden sm:inline">Monthly</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:shadow-sm">
              <Users size={14} /><span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            {auth.user && (
              <TabsTrigger
                value="projects"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all data-[state=active]:shadow-sm"
              >
                <Layers size={14} />
                <span className="hidden sm:inline">Projects</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="agenda">
            <AgendaView
              planner={planner}
              weekDates={weekDates}
              onNextWeek={goNextWeek}
              onPrevWeek={goPrevWeek}
            />
          </TabsContent>

          <TabsContent value="daily">
            <DailyView
              selectedDate={selectedDate}
              weekDates={weekDates}
              planner={planner}
              onNextDay={goNextDay}
              onPrevDay={goPrevDay}
              onDaySelect={selectDayFromWeek}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyView
              planner={planner}
              weekDates={weekDates}
              weekStart={weekStart}
              onDayClick={handleDayClick}
              onNextWeek={goNextWeek}
              onPrevWeek={goPrevWeek}
            />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyView
              planner={planner}
              year={selectedYear}
              month={selectedMonthNum}
              onNextMonth={goNextMonth}
              onPrevMonth={goPrevMonth}
              onSelectWeek={selectWeekFromMonth}
            />
          </TabsContent>

          <TabsContent value="staff">
            <StaffScheduleView planner={planner} weekDates={weekDates} onNextWeek={goNextWeek} onPrevWeek={goPrevWeek} />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsView
              cards={planner.cards}
              onCardClick={planner.handlers.setEditingCard}
              onAddCard={(project) => {
                const today = new Date().toISOString().slice(0, 10);
                planner.handlers.setEditingCard({
                  id: `new-${Date.now()}`,
                  title: '',
                  date: today,
                  dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
                  zone: 'untimed',
                  objectType: 'prep_task',
                  people: [],
                  revenue: 0,
                  cost: 0,
                  optional: false,
                  enabled: true,
                  status: 'todo',
                  projectId: project.id,
                  priority: 0,
                  _isNew: true,
                });
              }}
              accessToken={auth.accessToken}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit side panel (shared across all views) */}
      {planner.editingCard && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'var(--color-overlay)' }}
            onClick={() => planner.handlers.setEditingCard(null)}
          />
          <EditPanel
            card={planner.editingCard}
            onSave={planner.handlers.handleSave}
            onDelete={planner.handlers.handleDelete}
            onClose={() => planner.handlers.setEditingCard(null)}
            accessToken={auth.accessToken}
          />
        </>
      )}

      {/* Recurring change dialog */}
      <RecurringChangeDialog
        pendingChange={planner.pendingChange}
        onConfirm={planner.handlers.confirmChange}
        onCancel={planner.handlers.cancelChange}
      />

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
