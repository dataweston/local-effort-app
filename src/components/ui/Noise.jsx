import React, { useRef, useEffect } from 'react';
import './Noise.css';

const Noise = ({
  patternSize = 250,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 2,
  patternAlpha = 15
}) => {
  const grainRef = useRef(null);

  useEffect(() => {
    const canvas = grainRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let frame = 0;
    let animationId;
    const canvasSize = 1024;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    };

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;

      // Color palette: light cyan, medium gray, light pink
      const colors = [
        { r: 178, g: 255, b: 255 }, // #B2FFFF
        { r: 141, g: 141, b: 141 }, // #8D8D8D
        { r: 255, g: 178, b: 178 }  // #FFB2B2
      ];

      for (let i = 0; i < data.length; i += 4) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        data[i] = color.r;
        data[i + 1] = color.g;
        data[i + 2] = color.b;
        data[i + 3] = patternAlpha;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (frame % patternRefreshInterval === 0) {
        drawGrain();
      }
      frame++;
      animationId = window.requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationId);
    };
  }, [patternSize, patternScaleX, patternScaleY, patternRefreshInterval, patternAlpha]);

  return <canvas className="noise-overlay" ref={grainRef} style={{ imageRendering: 'pixelated' }} />;
};

export default Noise;
