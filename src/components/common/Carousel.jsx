import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Tiny carousel with fade transition. Expects items: [{key, node}]
export default function Carousel({ items = [], intervalMs = 5000, className = '' }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  const next = () => setIndex((i) => (i + 1) % Math.max(items.length, 1));
  const prev = () => setIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));

  useEffect(() => {
    if (items.length <= 1) return () => {};
    timerRef.current = setInterval(next, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [items.length, intervalMs]);

  if (!items.length) return null;

  const current = items[index];

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full h-full"
        >
          {current.node}
        </motion.div>
      </AnimatePresence>
      {items.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'} border border-black/10`}
              onClick={() => setIndex(i)}
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
