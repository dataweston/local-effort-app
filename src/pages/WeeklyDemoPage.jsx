import React, { useEffect } from 'react';
import { DollarSign, RotateCcw, Calendar, LayoutGrid, BarChart3, LogIn, LogOut } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { usePlannerState } from '../components/weeklyplanner/usePlannerState';
import { usePlannerNav } from '../components/weeklyplanner/usePlannerNav';
import { WeeklyView } from '../components/weeklyplanner/WeeklyView';
import { DailyView } from '../components/weeklyplanner/DailyView';
import { MonthlyView } from '../components/weeklyplanner/MonthlyView';
import { EditPanel } from '../components/weeklyplanner/EditPanel';
import { RecurringChangeDialog } from '../components/weeklyplanner/RecurringChangeDialog';
import { GoogleCalendarSync } from '../components/weeklyplanner/GoogleCalendarSync';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

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
  const mode = auth.loading ? null : (auth.user ? 'persisted' : 'demo');
  const planner = usePlannerState({ mode, accessToken: auth.accessToken, weekStart, selectedMonth });

  const overheadTotal = planner.overheads.reduce((sum, o) => sum + (o.monthlyCost || 0), 0);
  const weeklyCogs = planner.weekCogs.reduce((sum, c) => sum + (c.amount || 0), 0);

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
      await auth.signInWithGoogle(`${window.location.origin}/weeklydemo`);
    } catch (err) {
      // Auth redirect will happen
    }
  };

  return (
    <div className="fullpage-demo-scope min-h-screen" style={{ backgroundColor: 'var(--color-bg-page)' }}>
      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-30 shadow-sm safe-area-top"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border-default)',
        }}
      >
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="text-lg font-bold font-display truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Weekly Planner
              </h1>
              <p className="text-xs hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                {mode === 'persisted' ? 'Changes saved automatically' : 'Sign in to save your plan'}
              </p>
            </div>

            {/* Week totals - hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-3">
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-1.5 border"
                style={{
                  backgroundColor: 'var(--color-bg-page)',
                  borderColor: 'var(--color-border-default)',
                }}
              >
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Rev
                  </div>
                  <div className="text-sm font-bold flex items-center gap-0.5" style={{ color: 'var(--color-state-success)' }}>
                    <DollarSign size={11} />{displayTotals.revenue}
                  </div>
                </div>
                <div className="w-px h-7" style={{ backgroundColor: 'var(--color-border-default)' }} />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Labor
                  </div>
                  <div className="text-sm font-bold flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
                    <DollarSign size={11} />{displayTotals.cost}
                  </div>
                </div>
                {displayTotals.cogs > 0 && (
                  <>
                    <div className="w-px h-7" style={{ backgroundColor: 'var(--color-border-default)' }} />
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        COGS
                      </div>
                      <div className="text-sm font-bold flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
                        <DollarSign size={11} />{displayTotals.cogs}
                      </div>
                    </div>
                  </>
                )}
                {view === 'monthly' && overheadTotal > 0 && (
                  <>
                    <div className="w-px h-7" style={{ backgroundColor: 'var(--color-border-default)' }} />
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        Overhead
                      </div>
                      <div className="text-sm font-bold flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
                        <DollarSign size={11} />{overheadTotal}
                      </div>
                    </div>
                  </>
                )}
                <div className="w-px h-7" style={{ backgroundColor: 'var(--color-border-default)' }} />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Net
                  </div>
                  <div
                    className="text-sm font-bold flex items-center gap-0.5"
                    style={{ color: displayTotals.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}
                  >
                    <DollarSign size={11} />{displayTotals.net}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {auth.user && (
                <GoogleCalendarSync
                  accessToken={auth.accessToken}
                  weekStart={weekStart}
                />
              )}
              <button
                onClick={planner.handlers.handleReset}
                className="p-2 rounded-lg transition-colors touch-target-ios"
                style={{ color: 'var(--color-text-secondary)' }}
                title="Reset to defaults"
              >
                <RotateCcw size={16} />
              </button>
              {auth.user ? (
                <button
                  onClick={auth.signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors touch-target-ios"
                  style={{
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-default)',
                  }}
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-target-ios"
                  style={{
                    backgroundColor: 'var(--color-action-primary-bg)',
                    color: 'var(--color-action-primary-text)',
                  }}
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline">Sign in to save</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile totals bar */}
          <div
            className="sm:hidden flex items-center justify-around mt-2 rounded-lg px-2 py-1.5 border"
            style={{
              backgroundColor: 'var(--color-bg-page)',
              borderColor: 'var(--color-border-default)',
            }}
          >
            <span className="text-xs font-bold" style={{ color: 'var(--color-state-success)' }}>
              +${displayTotals.revenue}
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--color-state-danger)' }}>
              −${displayTotals.cost} labor
            </span>
            {displayTotals.cogs > 0 && (
              <span className="text-xs font-bold" style={{ color: 'var(--color-state-danger)' }}>
                −${displayTotals.cogs} cogs
              </span>
            )}
            {view === 'monthly' && overheadTotal > 0 && (
              <span className="text-xs font-bold" style={{ color: 'var(--color-state-danger)' }}>
                −${overheadTotal} overhead
              </span>
            )}
            <span
              className="text-xs font-bold"
              style={{ color: displayTotals.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}
            >
              Net ${displayTotals.net}
            </span>
          </div>
        </div>
      </div>

      {/* View tabs + content */}
      <div className="max-w-[1800px] mx-auto px-4 py-4">
        <Tabs value={view} onValueChange={setView}>
          <TabsList
            className="inline-flex h-10 items-center justify-center rounded-lg p-1 mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-card) 80%, var(--color-border-default))' }}
          >
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
          </TabsList>

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
          />
        </>
      )}

      {/* Recurring change dialog */}
      <RecurringChangeDialog
        pendingChange={planner.pendingChange}
        onConfirm={planner.handlers.confirmChange}
        onCancel={planner.handlers.cancelChange}
      />
    </div>
  );
}
