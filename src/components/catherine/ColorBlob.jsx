import React, { useState } from 'react';
import { motion } from 'framer-motion';

const UNSCHEDULED_COLOR = '#C1B8CD';

export function getCategoryInfo(card) {
  if (!card) return { color: UNSCHEDULED_COLOR, category: 'Free' };
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

// Random offset so blobs don't all animate in sync
function staggerDelay(index) {
  return (index % 5) * 0.8;
}

export function ColorBlob({ card, heightPx, index = 0, daily = false }) {
  const [tapped, setTapped] = useState(false);
  const { color, category } = card ? getCategoryInfo(card) : { color: UNSCHEDULED_COLOR, category: 'Free' };
  const isUnscheduled = !card;
  const title = card?.title || '';
  const timeLabel = card?.startTime && card?.endTime ? `${card.startTime} \u2013 ${card.endTime}` : '';

  const delay = staggerDelay(index);

  return (
    <motion.div
      className="relative overflow-hidden cursor-default select-none"
      style={{
        height: heightPx,
        minHeight: 20,
        marginTop: index > 0 ? -4 : 0,
        zIndex: isUnscheduled ? 0 : 1,
        background: `linear-gradient(
          135deg,
          ${color}${isUnscheduled ? '40' : 'A8'} 0%,
          ${color}${isUnscheduled ? '30' : '90'} 40%,
          ${color}${isUnscheduled ? '38' : '9A'} 100%
        )`,
      }}
      animate={daily ? undefined : {
        y: [0, -3, 0, 3, 0],
        borderRadius: [
          '2% 2% 2% 2% / 40% 60% 55% 45%',
          '2% 2% 2% 2% / 55% 45% 50% 50%',
          '2% 2% 2% 2% / 45% 55% 60% 40%',
          '2% 2% 2% 2% / 40% 60% 55% 45%',
        ],
      }}
      transition={daily ? undefined : {
        duration: 5 + (index % 3),
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={!daily ? { scale: 1.03, filter: 'saturate(1.3) brightness(1.05)', zIndex: 10 } : undefined}
      onClick={() => setTapped((p) => !p)}
    >
      {/* Soft edge overlay for blending */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 60%, ${color}18 100%)`,
        }}
      />

      {/* Text — hidden until hover (desktop) or tap (mobile) */}
      {!isUnscheduled && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center pointer-events-none"
          initial={{ opacity: daily ? 1 : 0 }}
          whileHover={daily ? undefined : { opacity: 1 }}
          animate={tapped && !daily ? { opacity: 1 } : undefined}
          transition={{ duration: 0.25 }}
        >
          <span
            className="text-xs font-medium font-display leading-tight"
            style={{
              color: '#F1E3D8',
              textShadow: `0 1px 4px ${color}, 0 0 8px rgba(0,0,0,0.3)`,
            }}
          >
            {title}
          </span>
          {timeLabel && (
            <span
              className="text-[10px] mt-0.5 opacity-80"
              style={{
                color: '#F1E3D8',
                textShadow: `0 1px 3px ${color}`,
              }}
            >
              {timeLabel}
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
