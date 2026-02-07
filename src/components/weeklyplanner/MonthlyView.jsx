import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getMonthWeeks, getWeekDates, getDayOfWeek } from './dateUtils';
import { dayTotals, weekTotals, monthTotals } from './financials';
import { MonthCalendarGrid } from './MonthCalendarGrid';
import { OverheadSection } from './OverheadSection';
import { WhatIfPanel } from './WhatIfPanel';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function SummaryCard({ label, value, type }) {
  const colorMap = {
    revenue: 'var(--color-state-success)',
    labor: 'var(--color-state-danger)',
    cogs: 'var(--color-state-danger)',
    overhead: 'var(--color-state-danger)',
    net: value >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)',
  };

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-medium"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
      <div
        className="text-2xl font-bold font-display mt-1 flex items-center gap-1"
        style={{ color: colorMap[type] }}
      >
        <DollarSign size={18} />
        {Math.abs(value).toLocaleString()}
      </div>
    </div>
  );
}

export function MonthlyView({
  planner,
  year,
  month,
  onNextMonth,
  onPrevMonth,
  onSelectWeek,
}) {
  const weekStarts = useMemo(() => getMonthWeeks(year, month), [year, month]);

  // Collect all cards for weeks that overlap this month
  const monthCards = useMemo(() => {
    const allDates = new Set();
    for (const ws of weekStarts) {
      for (const d of getWeekDates(ws)) {
        allDates.add(d);
      }
    }
    return planner.cards.filter((c) => allDates.has(c.date));
  }, [planner.cards, weekStarts]);

  // Daily data for bar chart (aggregate by day of week across the month)
  const dailyData = useMemo(() => {
    const dayMap = {};
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const dow of daysOfWeek) {
      dayMap[dow] = { Revenue: 0, Labor: 0, count: 0 };
    }
    for (const ws of weekStarts) {
      const dates = getWeekDates(ws);
      for (const date of dates) {
        const dow = getDayOfWeek(date);
        const t = dayTotals(planner.cards, date);
        dayMap[dow].Revenue += t.revenue;
        dayMap[dow].Labor += t.cost;
        dayMap[dow].count += 1;
      }
    }
    return Object.entries(dayMap).map(([dow, data]) => ({
      name: dow.slice(0, 3),
      Revenue: data.count > 0 ? Math.round(data.Revenue / data.count) : 0,
      Labor: data.count > 0 ? Math.round(data.Labor / data.count) : 0,
    }));
  }, [planner.cards, weekStarts]);

  // Monthly totals
  const weekCards = useMemo(() => {
    // Cards for weeks in this month
    return monthCards;
  }, [monthCards]);

  const totals = useMemo(
    () => monthTotals(weekCards, planner.overheads, planner.monthCogs || planner.cogs, weekStarts.length),
    [weekCards, planner.overheads, planner.monthCogs, planner.cogs, weekStarts.length]
  );

  const brandSuccess = '#7A846E';
  const brandDanger = '#C66C78';
  const brandInk = '#3A2E3F';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-lg transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2
          className="text-lg font-bold font-display"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-lg transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Month calendar grid */}
      <MonthCalendarGrid
        year={year}
        month={month}
        cards={planner.cards}
        onSelectWeek={onSelectWeek}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Monthly Revenue" value={totals.revenue} type="revenue" />
        <SummaryCard label="Monthly Labor" value={totals.labor} type="labor" />
        <SummaryCard label="Monthly COGS" value={totals.cogs} type="cogs" />
        <SummaryCard label="Monthly Overhead" value={totals.overhead} type="overhead" />
        <SummaryCard label="Monthly Net" value={totals.net} type="net" />
      </div>

      {/* Projected note */}
      <div className="flex items-center gap-2 text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
        <TrendingUp size={14} />
        Based on {weekStarts.length} weeks in {MONTH_NAMES[month - 1]}. Avg daily Revenue vs Labor shown below.
      </div>

      {/* Revenue vs Labor bar chart */}
      <div
        className="rounded-xl p-4 border"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border-default)',
        }}
      >
        <h3
          className="text-sm font-semibold font-display mb-4"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Avg Daily Revenue vs Labor
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
            <XAxis
              dataKey="name"
              tick={{ fill: brandInk, fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border-default)' }}
            />
            <YAxis
              tick={{ fill: brandInk, fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border-default)' }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#F1E3D8',
                borderColor: '#C0BECF',
                borderRadius: 8,
                color: brandInk,
              }}
              formatter={(value) => [`$${value}`, undefined]}
            />
            <Legend />
            <Bar dataKey="Revenue" fill={brandSuccess} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Labor" fill={brandDanger} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Overhead section */}
      <OverheadSection
        items={planner.overheads}
        onAdd={planner.handlers.handleAddOverhead}
        onDelete={planner.handlers.handleDeleteOverhead}
      />

      {/* COGS monthly summary */}
      {(planner.monthCogs || planner.cogs).length > 0 && (
        <div
          className="rounded-xl p-4 border"
          style={{
            backgroundColor: 'var(--color-bg-card)',
            borderColor: 'var(--color-border-default)',
          }}
        >
          <h3
            className="text-sm font-semibold font-display mb-3"
            style={{ color: 'var(--color-text-primary)' }}
          >
            COGS Summary
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Total cost of goods across all weeks this month.
          </p>
          <div className="text-lg font-bold flex items-center gap-1" style={{ color: 'var(--color-state-danger)' }}>
            <DollarSign size={16} />
            {(planner.monthCogs || planner.cogs).reduce((s, c) => s + (c.amount || 0), 0)}
          </div>
        </div>
      )}

      {/* What-if panel */}
      <WhatIfPanel
        cards={monthCards}
        onToggle={planner.handlers.handleToggle}
        onAdd={planner.handlers.handleAddWhatIf}
        onRemove={planner.handlers.handleRemoveWhatIf}
        onApply={planner.handlers.handleApplyWhatIf}
      />
    </div>
  );
}
