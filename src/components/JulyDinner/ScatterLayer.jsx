import React, { useCallback, useEffect, useRef, useState } from 'react';

// Snapshots dropped on the drawing. Real kitchen photos (Cloudinary, tagged
// "julydinner"), scattered across the whole page, sitting one layer above the
// text on purpose. Hover enlarges; pointer-drag moves them anywhere, like the
// home page gallery. Positions are % of the page so they ride the full height.
// `wide: true` slots only render at >=1024px — the ones kept on mobile hug the
// edges so snapshots never bury the headline or the form. Sizes deliberately
// irregular. The dishes live on the LEFT shore now, so photos favor the right
// side and the far-left gutter, with room to breathe.
const SLOTS = [
  { top: '4%', left: '56%', w: 110, rot: -5, wide: true },
  { top: '10%', left: '2%', w: 125, rot: -7 },
  { top: '24%', left: '81%', w: 145, rot: 4, wide: true },
  { top: '38%', left: '2%', w: 100, rot: 6, wide: true },
  { top: '35%', left: '85%', w: 115, rot: -6 },
  { top: '48%', left: '58%', w: 105, rot: -7, wide: true },
  { top: '54%', left: '86%', w: 160, rot: 5 },
  { top: '68%', left: '55%', w: 100, rot: 3, wide: true },
  { top: '72%', left: '84%', w: 130, rot: -4 },
  { top: '76%', left: '3%', w: 110, rot: -8, wide: true },
  { top: '89%', left: '76%', w: 140, rot: 6 },
  { top: '91%', left: '16%', w: 115, rot: -5, wide: true },
];

const DRAG_THRESHOLD = 6;

const ScatterPhoto = ({ img, slot }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const drag = useRef(null);

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y, moved: false };
  }, [offset]);

  const onPointerMove = useCallback((e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (!drag.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      drag.current.moved = true;
      setDragging(true);
    }
    if (drag.current.moved) {
      setOffset({ x: drag.current.baseX + dx, y: drag.current.baseY + dy });
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (drag.current && !drag.current.moved) {
      setExpanded((v) => !v);
    }
    drag.current = null;
    setDragging(false);
  }, []);

  const alt = img.context?.alt || img.context?.caption || 'From the Local Effort kitchen';

  return (
    <button
      type="button"
      className={`jd-photo ${slot.wide ? 'jd-photo--wide' : ''} ${dragging ? 'is-dragging' : ''} ${expanded ? 'is-expanded' : ''}`}
      style={{
        top: slot.top,
        left: slot.left,
        '--jd-pw': `${slot.w}px`,
        '--jd-prot': `${slot.rot}deg`,
        '--jd-dx': `${offset.x}px`,
        '--jd-dy': `${offset.y}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      aria-label={expanded ? `Shrink photo: ${alt}` : `Enlarge photo: ${alt}`}
    >
      <img src={img.thumbnail_url} alt={alt} loading="lazy" decoding="async" draggable={false} />
    </button>
  );
};

const ScatterLayer = () => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/search-images?query=julydinner&per_page=24');
        const data = res.ok ? await res.json() : null;
        if (!cancelled && Array.isArray(data?.images)) {
          setImages(data.images.slice(0, SLOTS.length));
        }
      } catch {
        // decorative layer — the page works without it
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!images.length) return null;

  return (
    <div className="jd-photos" aria-hidden={false}>
      {images.map((img, i) => (
        <ScatterPhoto key={img.asset_id || img.public_id || i} img={img} slot={SLOTS[i]} />
      ))}
    </div>
  );
};

export default ScatterLayer;
