import React from 'react';

export default function AspectRatio({ ratio = 4 / 3, children, className = '', style = {}, ...props }) {
  const paddingTop = `${100 / ratio}%`;
  return (
    <div className={['relative w-full overflow-hidden', className].filter(Boolean).join(' ')} style={style} {...props}>
      <div style={{ paddingTop }} />
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}
