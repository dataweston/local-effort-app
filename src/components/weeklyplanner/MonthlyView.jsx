import React, { useMemo } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { DAYS } from './defaultSchedule';
import { dayTotals, weekTotals } from './financials';
import { WhatIfPanel } from './WhatIfPanel';

function SummaryCard({ label, value, type }) {
  const colorMap = {
    revenue: 'var(--color-state-success)',
    cost: 'var(--color-state-danger)',
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

export function MonthlyView({ planner }) {
  const dailyData = useMemo(
    () =>
      DAYS.map((day) => {
        const t = dayTotals(planner.cards, day);
        return {
          name: day.slice(0, 3),
          Revenue: t.revenue,
          Cost: t.cost,
          Net: t.net,
        };
      }),
    [planner.cards]
  );

  const week = useMemo(() => weekTotals(planner.cards), [planner.cards]);
  const monthly = {
    revenue: week.revenue * 4,
    cost: week.cost * 4,
    net: week.net * 4,
  };

  const brandSuccess = '#7A846E'; // --brand-olive
  const brandDanger = '#C66C78'; // --brand-rose
  const brandInk = '#3A2E3F'; // --brand-ink

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Monthly Revenue" value={monthly.revenue} type="revenue" />
        <SummaryCard label="Monthly Cost" value={monthly.cost} type="cost" />
        <SummaryCard label="Monthly Net" value={monthly.net} type="net" />
      </div>

      {/* Projected note */}
      <div className="flex items-center gap-2 text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
        <TrendingUp size={14} />
        Projected monthly totals based on this week's schedule (×4 weeks)
      </div>

      {/* Revenue vs Cost bar chart */}
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
          Daily Revenue vs Cost
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
            <Bar dataKey="Cost" fill={brandDanger} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net by day area chart */}
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
          Daily Net Income
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyData}>
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
            <Area
              type="monotone"
              dataKey="Net"
              stroke={brandSuccess}
              fill={`${brandSuccess}30`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly breakdown table */}
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
          Weekly Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                <th className="text-left py-2 font-medium text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Day
                </th>
                <th className="text-right py-2 font-medium text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Revenue
                </th>
                <th className="text-right py-2 font-medium text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Cost
                </th>
                <th className="text-right py-2 font-medium text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((row) => (
                <tr
                  key={row.name}
                  style={{ borderBottom: '1px solid var(--color-border-default)' }}
                >
                  <td className="py-2" style={{ color: 'var(--color-text-primary)' }}>
                    {row.name}
                  </td>
                  <td className="py-2 text-right" style={{ color: 'var(--color-state-success)' }}>
                    ${row.Revenue}
                  </td>
                  <td className="py-2 text-right" style={{ color: row.Cost > 0 ? 'var(--color-state-danger)' : 'var(--color-text-muted)' }}>
                    ${row.Cost}
                  </td>
                  <td
                    className="py-2 text-right font-semibold"
                    style={{ color: row.Net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}
                  >
                    ${row.Net}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Total
                </td>
                <td className="py-2 text-right font-semibold" style={{ color: 'var(--color-state-success)' }}>
                  ${week.revenue}
                </td>
                <td className="py-2 text-right font-semibold" style={{ color: week.cost > 0 ? 'var(--color-state-danger)' : 'var(--color-text-muted)' }}>
                  ${week.cost}
                </td>
                <td
                  className="py-2 text-right font-bold"
                  style={{ color: week.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}
                >
                  ${week.net}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* What-if panel */}
      <WhatIfPanel cards={planner.cards} onToggle={planner.handlers.handleToggle} />
    </div>
  );
}
