import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export function getCategoryInfo(card) {
  if (!card) return { color: '#C1B8CD', category: 'Free' };
  const t = (card.title || '').toLowerCase();
  if (t.includes('co-op')) return { color: '#bf501b', category: 'Co-op' };
  if (t.includes('pizza')) return { color: '#b5442e', category: 'Pizza' };
  if (t.includes('cook')) return { color: '#8b6d2e', category: 'Cook' };
  if (t.includes('babysitter')) return { color: '#c47a2a', category: 'Sitter' };
  if (t.includes('off with teddy')) return { color: '#7A846E', category: 'Teddy' };
  if (t.includes('teddy with weston') || t.includes('with weston')) return { color: '#6b7d5e', category: 'With Weston' };
  if (t.includes('admin')) return { color: '#9e6b3a', category: 'Admin' };
  return { color: '#C66C78', category: 'Other' };
}

// Each blob gets a unique organic shape and animation personality
function blobShape(index) {
  const shapes = [
    { br: '60% 40% 55% 45% / 45% 55% 45% 55%', br2: '45% 55% 40% 60% / 55% 45% 55% 45%', br3: '55% 45% 60% 40% / 40% 60% 50% 50%' },
    { br: '50% 50% 45% 55% / 55% 45% 50% 50%', br2: '55% 45% 55% 45% / 45% 55% 45% 55%', br3: '40% 60% 50% 50% / 50% 50% 55% 45%' },
    { br: '45% 55% 50% 50% / 50% 50% 55% 45%', br2: '60% 40% 45% 55% / 45% 55% 40% 60%', br3: '50% 50% 55% 45% / 55% 45% 50% 50%' },
    { br: '55% 45% 40% 60% / 50% 50% 45% 55%', br2: '40% 60% 55% 45% / 55% 45% 55% 45%', br3: '60% 40% 50% 50% / 45% 55% 50% 50%' },
    { br: '48% 52% 58% 42% / 42% 58% 48% 52%', br2: '58% 42% 42% 58% / 52% 48% 52% 48%', br3: '42% 58% 52% 48% / 48% 52% 58% 42%' },
  ];
  return shapes[index % shapes.length];
}

function hexToRgb(hex) {
  const clean = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(198,108,120,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function ColorBlob({ card, heightPx, index = 0, total = 1, daily = false }) {
  const [tapped, setTapped] = useState(false);
  const { color, category } = getCategoryInfo(card);
  const isUnscheduled = !card;
  const title = card?.title || '';
  const timeLabel = card?.startTime && card?.endTime ? `${card.startTime} \u2013 ${card.endTime}` : '';

  const shape = useMemo(() => blobShape(index), [index]);
  const duration = 6 + (index % 4) * 1.5;
  const delay = (index % 5) * 0.7;

  // Unscheduled gaps: nearly invisible, just a faint hint
  if (isUnscheduled) {
    return (
      <div
        style={{
          height: heightPx,
          minHeight: 16,
        }}
      />
    );
  }

  // Scheduled blobs: organic, hazy, semi-opaque, floating
  return (
    <motion.div
      className="relative cursor-default select-none"
      style={{
        height: heightPx,
        width: daily ? '94%' : '88%',
        maxWidth: daily ? '680px' : 'none',
        minHeight: 28,
        marginTop: index > 0 ? -8 : 0,
        marginLeft: daily ? '3%' : '6%',
        marginRight: daily ? '3%' : '6%',
        zIndex: 1,
        willChange: 'transform',
        backgroundColor: rgba(color, daily ? 0.36 : 0.3),
        border: `1px solid ${rgba(color, 0.55)}`,
      }}
      initial={false}
      animate={{
        y: [0, -4, 1, 5, 0],
        x: [0, 2, -1, -2, 0],
        borderRadius: [shape.br, shape.br2, shape.br3, shape.br2, shape.br],
      }}
      transition={{
        y: { duration, delay, repeat: Infinity, ease: 'easeInOut' },
        x: { duration: duration * 1.3, delay: delay + 0.4, repeat: Infinity, ease: 'easeInOut' },
        borderRadius: { duration: duration * 1.6, delay, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={{
        scale: 1.06,
        zIndex: 10,
        transition: { duration: 0.3 },
      }}
      onClick={() => setTapped((p) => !p)}
    >
      {/* Main blob body — radial gradient for soft hazy center */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: 'inherit',
          background: `radial-gradient(
            ellipse 80% 70% at 50% 45%,
            ${rgba(color, 0.7)} 0%,
            ${rgba(color, 0.53)} 35%,
            ${rgba(color, 0.33)} 65%,
            ${rgba(color, 0.14)} 85%,
            transparent 100%
          )`,
          filter: daily ? 'blur(1px)' : 'blur(2px)',
        }}
      />

      {/* Inner glow — brighter center hotspot */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: 'inherit',
          background: `radial-gradient(
            ellipse 45% 40% at 48% 42%,
            ${rgba(color, 0.56)} 0%,
            ${rgba(color, 0.25)} 50%,
            transparent 100%
          )`,
        }}
      />

      {/* Outer haze — feathered edge that bleeds into neighbors */}
      <div
        className="absolute"
        style={{
          inset: '-12%',
          borderRadius: 'inherit',
          background: `radial-gradient(
            ellipse at 50% 50%,
            ${rgba(color, 0.12)} 0%,
            ${rgba(color, 0.06)} 40%,
            transparent 70%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Text — hidden until hover/tap */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center pointer-events-none"
        initial={{ opacity: daily ? 0.9 : 0 }}
        whileHover={{ opacity: 1 }}
        animate={tapped && !daily ? { opacity: 1 } : daily ? { opacity: 0.9 } : { opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span
          className="text-[11px] font-medium font-display leading-tight"
          style={{
            color: '#F1E3D8',
            textShadow: `0 1px 6px ${color}, 0 0 12px rgba(0,0,0,0.4)`,
          }}
        >
          {title}
        </span>
        {timeLabel && (
          <span
            className="text-[9px] mt-0.5"
            style={{
              color: 'rgba(241,227,216,0.75)',
              textShadow: `0 1px 4px ${color}`,
            }}
          >
            {timeLabel}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
