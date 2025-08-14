import React, { useMemo } from 'react';

export const PizzaSVG = ({ size, goal, filled }) => {
  const center = size / 2;
  const radius = size * 0.4;
  const crustWidth = size * 0.08;
  const innerRadius = radius - crustWidth;
  const numSlices = Math.min(goal, 1000); // Cap slices for performance
  
  const pepperonis = useMemo(() => {
    const peps = [];
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.sqrt(Math.random()) * (innerRadius - 10);
        peps.push({
            cx: center + dist * Math.cos(angle),
            cy: center + dist * Math.sin(angle),
            r: size * 0.025 * (Math.random() * 0.4 + 0.8) // Vary size
        });
    }
    return peps;
  }, [size, center, innerRadius]);

  const Slice = ({ index }) => {
    const isFilled = index < filled;
    const anglePerSlice = 360 / numSlices;
    const startAngle = -90 + index * anglePerSlice;
    const endAngle = startAngle + anglePerSlice;

    const start = {
      x: center + innerRadius * Math.cos(startAngle * Math.PI / 180),
      y: center + innerRadius * Math.sin(startAngle * Math.PI / 180)
    };
    const end = {
      x: center + innerRadius * Math.cos(endAngle * Math.PI / 180),
      y: center + innerRadius * Math.sin(endAngle * Math.PI / 180)
    };

    const largeArcFlag = anglePerSlice <= 180 ? "0" : "1";
    const d = `M ${center},${center} L ${start.x},${start.y} A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`;

    return (
      <path
        d={d}
        fill={isFilled ? "#df4a21" : "transparent"}
        stroke={isFilled ? "#c13e1c" : "#e1b44d"}
        strokeWidth={isFilled ? 1 : 0.5}
        style={{ transition: 'fill 300ms ease-out' }}
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="drop-shadow-lg">
      <defs>
        <filter id="crust-texture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="3" result="noise"/>
          <feDiffuseLighting in="noise" lightingColor="#d4a751" surfaceScale="2" result="light">
            <feDistantLight azimuth="45" elevation="60" />
          </feDiffuseLighting>
          <feComposite in="light" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      
      <circle cx={center} cy={center} r={innerRadius} fill="#f4cf5d" />
      <g>
        {Array.from({ length: numSlices }).map((_, i) => <Slice key={i} index={i} />)}
      </g>
      
      <g clipPath={`url(#filled-mask-${filled})`}>
         {pepperonis.map((pep, i) => (
            <circle key={i} cx={pep.cx} cy={pep.cy} r={pep.r} fill="#c13e1c" stroke="#a12a0f" strokeWidth="1"/>
         ))}
      </g>
      <clipPath id={`filled-mask-${filled}`}>
        <rect x="0" y="0" width={size} height={size} fill="white" />
        {Array.from({ length: numSlices }).map((_, i) => (
          i >= filled ? <Slice key={i} index={i} /> : null
        ))}
      </clipPath>

      <circle cx={center} cy={center} r={radius} fill="#e1b44d" filter="url(#crust-texture)" />
      <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="#d4a751" strokeWidth="2" />
      
       <g filter="url(#subtle-glow)">
        <circle cx={center} cy={center} r={size * 0.18} fill="#fff" stroke="#eee" strokeWidth="2" />
        <text x={center} y={center - 6} textAnchor="middle" fontSize={size * 0.1} fontWeight="700" fill="#333">{filled}</text>
        <text x={center} y={center + 18} textAnchor="middle" fontSize={size * 0.04} fill="#666" opacity="0.8">PIZZAS</text>
      </g>
    </svg>
  );
}