import React from 'react';

// Reusable Portable Text components that enforce brand link styling.
// Usage: createPortableTextComponents(optionalOverrides)
// Optional overrides can define additional marks/types; marks.link can be overridden if needed.

const accentLinkClass = 'text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)] hover:opacity-80 transition-colors';

function defaultLinkComponent({ children, value }) {
  const href = (value && typeof value.href === 'string' && value.href.trim()) ? value.href : '#';
  const explicitTarget = value?.target || value?.blank;
  const openInNewTab = explicitTarget === '_blank' || explicitTarget === true;
  const isExternal = /^https?:/i.test(href);
  const target = openInNewTab || (explicitTarget === undefined && isExternal) ? '_blank' : undefined;
  const rel = target === '_blank' ? 'noopener noreferrer' : undefined;

  return (
    <a href={href} target={target} rel={rel} className={accentLinkClass}>
      {children}
    </a>
  );
}

export function createPortableTextComponents(overrides = {}) {
  const providedMarks = overrides.marks || {};
  return {
    ...overrides,
    marks: {
      link: defaultLinkComponent,
      ...providedMarks,
    },
  };
}

export const portableTextComponents = createPortableTextComponents();
