import { useState, useEffect } from 'react';

export function useCountUp(endValue, duration = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = endValue;
    if (count !== 0) {
        start = count;
    }
    if (start === end) return;

    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const easeOutProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeOutProgress * (end - start) + start);
      setCount(currentVal);
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animation);

  }, [endValue, duration]);

  return count;
}