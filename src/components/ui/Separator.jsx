import React from 'react';

export default function Separator({ className = '', orientation = 'horizontal', decorative = true, ...props }) {
  const isHorizontal = orientation !== 'vertical';
  const base = isHorizontal ? 'h-px w-full my-12' : 'w-px h-full mx-4';
  const classes = [base, 'bg-neutral-200', className].filter(Boolean).join(' ');
  return <div role={decorative ? 'none' : 'separator'} aria-orientation={orientation} className={classes} {...props} />;
}
