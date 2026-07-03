import React, { useCallback, useEffect, useRef, useState } from 'react';

// Snapshots dropped on the drawing. Real kitchen photos (Cloudinary, tagged
// "julydinner"), scattered across the whole page, sitting one layer above the
// text on purpose. Hover enlarges; pointer-drag moves them anywhere, like the
// home page gallery. Positions are % of the page so they ride the full height.
// `wide: true` slots only render at >=1024px — the ones kept on mobile hug the
// edges below the title block so snapshots never bury the headline or the form.
const SLOTS = [
  { top: '2.5%', left: '6%', w: 120, rot: -7, wide: true },
  { top: '4%', left: '84%', w: 105, rot: 5, wide: true },
  { top: '11%', left: '5%', w: 95, rot: 3 },
  { top: '15%', left: '78%', w: 130, rot: -4, wide: true },
  { top: '24%', left: '4%', w: 110, rot: 6 },
  { top: '30%', left: '88%', w: 100, rot: -6 },
  { top: '41%', left: '9%', w: 125, rot: -3 },
  { top: '47%', left: '82%', w: 110, rot: 7 },
  { top: '56%', left: '5%', w: 100, rot: 4, wide: true },
  { top: '61%', left: '87%', w: 120, rot: -5 },
  { top: '72%', left: '7%', w: 105, rot: -8, wide: true },
  { top: '76%', left: '85%', w: 115, rot: 4, wide: true },
  { top: '90%', left: '10%', w: 110, rot: 6 },
  { top: '93%', left: '80%', w: 100, rot: -4 },
  { top: '34%', left: '46%', w: 90, rot: 2, wide: true },
  { top: '85%', left: '48%', w: 95, rot: -3, wide: true },
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
