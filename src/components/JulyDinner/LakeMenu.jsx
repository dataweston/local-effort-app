import React, { useEffect, useMemo, useRef, useState } from 'react';

// The chalk lake. A single line, walked by a child from the bottom center up
// to the top left and back — the closed shape is the lake, and the menu
// floats along its shoreline. Drawn the way I imagine drawing if I had a
// hand: wobbly, overshooting a little, warm. Coordinate space: 1000 × 1200.
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
      { threshold: 0.15 }
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
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="2" seed="7" result="jdNoise" />
            <feDisplacementMap in="SourceGraphic" in2="jdNoise" scale="11" />
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

        {/* what lives on the water — arrives after the line settles */}
        <g filter="url(#jd-rough)">
          {/* a duck, unbothered */}
          <g className="jd-critter" style={{ '--jd-cdelay': '2000ms' }}>
            <path d="M398 706 C388 700 384 690 392 684 C398 679 408 680 412 686 C414 678 420 673 427 675 C434 677 436 684 433 690 L444 691 L433 696 C430 706 412 712 398 706 Z" strokeWidth="2.6" />
            <circle cx="425" cy="681" r="1.8" className="jd-eye" />
            <path d="M376 710 C384 714 394 715 402 713" strokeWidth="2" opacity="0.6" />
            <path d="M440 704 C448 707 456 707 462 705" strokeWidth="2" opacity="0.45" />
          </g>

          {/* two loons, a little more serious */}
          <g className="jd-critter" style={{ '--jd-cdelay': '2200ms' }}>
            <path d="M560 486 C552 480 552 472 562 469 C570 467 578 470 581 475 L596 468 L585 479 C588 486 578 492 568 491 C565 490 562 488 560 486 Z" strokeWidth="2.6" />
            <circle cx="576" cy="475" r="1.7" className="jd-eye" />
            <path d="M559 483 l5 3 M566 486 l5 3 M573 488 l5 2" strokeWidth="1.6" opacity="0.7" />
            <path d="M544 494 C552 498 562 499 570 497" strokeWidth="2" opacity="0.5" />
          </g>
          <g className="jd-critter" style={{ '--jd-cdelay': '2400ms' }}>
            <path d="M628 532 C621 527 621 520 629 518 C636 516 643 518 646 523 L658 517 L649 526 C651 532 643 537 634 536 C632 535 630 534 628 532 Z" strokeWidth="2.4" />
            <circle cx="641" cy="523" r="1.6" className="jd-eye" />
            <path d="M627 529 l4 3 M633 532 l4 2" strokeWidth="1.5" opacity="0.7" />
          </g>

          {/* a stop sign, standing in the lake, explaining nothing */}
          <g className="jd-critter" style={{ '--jd-cdelay': '2600ms' }}>
            <path d="M330 902 L331 822" strokeWidth="2.8" />
            <path d="M318 822 L342 822 L354 810 L354 786 L342 774 L318 774 L306 786 L306 810 Z" strokeWidth="2.8" />
            <path d="M312 912 C320 917 336 918 346 913" strokeWidth="2" opacity="0.5" />
          </g>
        </g>

        {/* STOP text outside the rough filter so it stays legible */}
        <text
          className="jd-critter jd-stop-text"
          style={{ '--jd-cdelay': '2600ms' }}
          x="330"
          y="799"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          STOP
        </text>

        {/* the child, mid-stride at the bottom, chalk to the ground */}
        <g className="jd-child" filter="url(#jd-rough)">
          <circle cx="549" cy="1032" r="16" />
          <path d="M541 1021 C545 1013 557 1012 561 1019" />
          <circle cx="542" cy="1030" r="1.6" className="jd-eye" />
          <path d="M538 1037 C540 1039 543 1039 545 1038" strokeWidth="2" />
          <path d="M548 1048 C546 1070 544 1086 543 1100" />
          <path d="M543 1100 C536 1116 527 1127 516 1136" />
          <path d="M543 1100 C549 1119 553 1131 557 1142" />
          <path d="M546 1060 C534 1077 520 1094 508 1116" />
          <path d="M548 1062 C558 1072 564 1080 568 1090" />
        </g>
        <circle cx="504" cy="1119" r="3.5" fill="var(--jd-water)" className="jd-child" />
      </svg>

      {/* muttering, as one does while drawing a lake */}
      <div className="jd-mutter jd-mutter-1" aria-hidden="true">hmm… lake…</div>
      <div className="jd-mutter jd-mutter-2" aria-hidden="true">…yes. definitely a lake.</div>

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
