import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Tiny carousel with configurable transition. Expects items: [{key, node}]
export default function Carousel({ items = [], intervalMs = 5000, className = '', hideDots = false, transitionStyle = 'fade' }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next/right, -1 = prev/left
  const timerRef = useRef(null);

  const next = () => {
    setDirection(1);
    setIndex((i) => (i + 1) % Math.max(items.length, 1));
  };
  const prev = () => {
    setDirection(-1);
    setIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
  };

  useEffect(() => {
    if (items.length <= 1) return () => {};
    timerRef.current = setInterval(next, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [items.length, intervalMs]);

  if (!items.length) return null;

  const current = items[index];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${current.key}-${index}`}
          className="w-full h-full"
          initial={transitionStyle === 'slide' ? { x: direction > 0 ? '100%' : '-100%', opacity: 1 } : { opacity: 0 }}
          animate={transitionStyle === 'slide' ? { x: 0, opacity: 1 } : { opacity: 1 }}
          exit={transitionStyle === 'slide' ? { x: direction > 0 ? '-100%' : '100%', opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={transitionStyle === 'slide' ? { position: 'absolute', inset: 0 } : undefined}
        >
          {current.node}
        </motion.div>
      </AnimatePresence>
  {items.length > 1 && !hideDots && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'} border border-black/10`}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
      {items.length > 1 && (
        <>
          <button
            aria-label="Previous slide"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow"
          >
            ‹
          </button>
          <button
            aria-label="Next slide"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full w-8 h-8 flex items-center justify-center shadow"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
