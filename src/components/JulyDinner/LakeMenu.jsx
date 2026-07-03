import React, { useEffect, useMemo, useRef, useState } from 'react';

// The chalk lake. A single line, walked by a child from the bottom center up
// to the top left and back — the closed shape is the lake, and the menu
// floats along its shoreline. Coordinate space: viewBox 1000 × 1200.
const LAKE_PATH = [
  'M 500 1120',
  'C 380 1064, 252 952, 212 802',
  'C 172 652, 148 424, 226 252',
  'C 270 154, 348 108, 452 128',
  'C 596 156, 716 292, 762 448',
  'C 806 598, 786 782, 694 902',
  'C 626 992, 562 1062, 500 1120',
  'Z',
].join(' ');

// Dish label rotation: deterministic small tilt, never the same twice in a row.
const rotationFor = (i) => ((i * 137) % 13) - 6;

const LakeMenu = ({ dishes }) => {
  const containerRef = useRef(null);
  const [drawn, setDrawn] = useState(false);
  const [points, setPoints] = useState([]);

  // Points along the shoreline, computed from the real path geometry, then
  // assigned to dishes top-to-bottom (the brief: dishes read down the page).
  useEffect(() => {
    if (!dishes.length) return;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', LAKE_PATH);
    const total = path.getTotalLength();
    const n = dishes.length;
    const sampled = [];
    for (let i = 0; i < n; i += 1) {
      // skip the stretch right at the child's feet (start and end of the walk)
      const t = 0.045 + (i * 0.9) / Math.max(1, n - 1);
      const pt = path.getPointAtLength(total * Math.min(0.945, t));
      sampled.push({ x: pt.x, y: pt.y });
    }
    sampled.sort((a, b) => a.y - b.y || a.x - b.x);
    setPoints(sampled);
  }, [dishes.length]);

  // Draw the line the first time the lake comes into view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setDrawn(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const placed = useMemo(
    () =>
      dishes.map((name, i) => ({
        name,
        x: points[i]?.x ?? 500,
        y: points[i]?.y ?? 600,
        rot: rotationFor(i),
        delay: 1200 + i * 90,
      })),
    [dishes, points]
  );

  return (
    <div ref={containerRef} className={`jd-lake ${drawn ? 'is-drawn' : ''}`}>
      <svg viewBox="0 0 1000 1200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
        <defs>
          <filter id="jd-rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="jdNoise" />
            <feDisplacementMap in="SourceGraphic" in2="jdNoise" scale="9" />
          </filter>
          <radialGradient id="jd-shimmer-grad" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="jd-lake-clip">
            <path d={LAKE_PATH} />
          </clipPath>
        </defs>

        {/* the water */}
        <path className="jd-lake-fill" d={LAKE_PATH} />
        <g clipPath="url(#jd-lake-clip)">
          <ellipse className="jd-shimmer" cx="470" cy="540" rx="380" ry="290" fill="url(#jd-shimmer-grad)" />
        </g>

        {/* the chalk line: dust pass underneath, drawn line on top */}
        <g filter="url(#jd-rough)">
          <path className="jd-lake-dust" d={LAKE_PATH} />
          <path className="jd-lake-path" d={LAKE_PATH} pathLength="1" />
        </g>

        {/* the child, mid-stride at the bottom, chalk to the ground */}
        <g className="jd-child" filter="url(#jd-rough)">
          <circle cx="549" cy="1032" r="16" />
          <path d="M541 1021 C545 1013 557 1012 561 1019" />
          <path d="M548 1048 C546 1070 544 1086 543 1100" />
          <path d="M543 1100 C536 1116 527 1127 516 1136" />
          <path d="M543 1100 C549 1119 553 1131 557 1142" />
          <path d="M546 1060 C534 1077 520 1094 508 1116" />
          <path d="M548 1062 C558 1072 564 1080 568 1090" />
        </g>
        <circle cx="504" cy="1119" r="3.5" fill="var(--jd-water)" className="jd-child" />
      </svg>

      <ul className="jd-dishes" aria-label="The menu so far">
        {placed.map((dish, i) => (
          <li
            key={`${dish.name}-${i}`}
            className="jd-dish"
            tabIndex={0}
            style={{
              left: `${dish.x / 10}%`,
              top: `${dish.y / 12}%`,
              '--jd-rot': `${dish.rot}deg`,
              '--jd-delay': `${dish.delay}ms`,
            }}
          >
            <span className="jd-ripple" aria-hidden="true" />
            <span className="jd-ripple jd-ripple--late" aria-hidden="true" />
            <span className="jd-dish-text">{dish.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LakeMenu;
