import { useRef, useCallback } from 'react';

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }) {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) onSwipeRight?.();
        else onSwipeLeft?.();
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { onTouchStart, onTouchEnd };
}
