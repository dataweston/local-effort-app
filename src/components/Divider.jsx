import React from 'react';

export default function Divider({ className = '', size = 'thin', ...props }) {
  const thickness = size === 'thick' ? 'border-t-2' : size === 'none' ? 'border-t-0' : 'border-t';
  const classes = [thickness, 'border-neutral-200', 'my-12', className].filter(Boolean).join(' ');
  return <hr className={classes} {...props} />;
}
