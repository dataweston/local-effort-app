import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  fulfillment: '#0088FE',
  debt: '#00C49F',
  equipment: '#FFBB28',
  marketing: '#FF8042',
};

export default function PrioritiesChart({ pieData, tooltipFormatter }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie dataKey="value" data={pieData} nameKey="name" outerRadius={120} label>
          {pieData.map((entry) => (
            <Cell key={entry.key} fill={COLORS[entry.key]} />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}