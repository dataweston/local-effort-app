/**
 * Summary stat display component
 */
import React from 'react';

interface SummaryStatProps {
  label: string;
  value: string;
  tone: string;
}

export const SummaryStat = ({ label, value, tone }: SummaryStatProps) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-[#7F9FA8] font-semibold">
      {label}
    </p>
    <p className={`text-lg font-bold ${tone}`}>{value}</p>
  </div>
);
