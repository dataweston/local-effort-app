import React from 'react';

const accentLinkClass = 'text-[var(--color-accent)] underline underline-offset-4 decoration-[var(--color-accent)] hover:opacity-80 transition-colors';

function DefaultLink({ children, value }) {
  const href = typeof value?.href === 'string' && value.href.trim() ? value.href : '#';
  const explicitTarget = value?.target || value?.blank;
  const isExternal = /^https?:/i.test(href);
  const shouldOpenNewTab = explicitTarget === '_blank' || explicitTarget === true || (explicitTarget === undefined && isExternal);
  const target = shouldOpenNewTab ? '_blank' : undefined;
  const rel = shouldOpenNewTab ? 'noopener noreferrer' : undefined;

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
      link: DefaultLink,
      ...providedMarks,
    },
  };
}

export const portableTextComponents = createPortableTextComponents();
