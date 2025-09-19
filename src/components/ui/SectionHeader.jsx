import React from 'react';

export default function SectionHeader({ overline, title, className = '' }) {
  return (
    <div className={["space-y-1", className].filter(Boolean).join(' ')}>
      {overline ? (
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{overline}</div>
      ) : null}
      {title ? (
        <h2 className="text-heading">{title}</h2>
      ) : null}
    </div>
  );
}
