import React from 'react';

export default function SectionHeader({ overline, title, className = '' }) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(' ')}>
      {overline ? (
        <span className="heading-overline">{overline}</span>
      ) : null}
      {title ? (
        <h2 className="heading-xl heading-balance">{title}</h2>
      ) : null}
    </div>
  );
}
