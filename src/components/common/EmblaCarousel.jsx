import React, { useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

// Cloudinary helper: build responsive srcset for a publicId
function buildCloudinarySrcSet(publicId, cloudName) {
  if (!publicId || !cloudName) return null;
  const widths = [480, 768, 1024, 1400, 2000];
  const parts = widths.map((w) => `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${w}/${publicId} ${w}w`);
  return parts.join(', ');
}

function buildCloudinaryUrl(publicId, cloudName, w = 1400) {
  if (!publicId || !cloudName) return '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_${w}/${publicId}`;
}

// A responsive image-friendly carousel using Embla.
// Props:
// - slides: [{ key, src, alt, node? }] — prefer src/alt for images; node for custom content
// - autoPlayMs: number | null
// - heightClass: Tailwind classes to control height at breakpoints
// - contain: boolean — when true, use object-contain for mixed ratios
// - showThumbs: boolean — shows small thumbs below
export default function EmblaCarousel({
  slides = [],
  autoPlayMs = 6000,
  heightClass = 'h-[46vh] md:h-[56vh] lg:h-[64vh]',
  contain = true,
  showThumbs = true,
}) {
  const cloudName = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) || '';
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });

  useEffect(() => {
    if (!emblaApi || !autoPlayMs) return undefined;
    const interval = setInterval(() => {
      try { emblaApi.scrollNext(); } catch { /* noop */ }
    }, autoPlayMs);
    return () => clearInterval(interval);
  }, [emblaApi, autoPlayMs]);

  const onThumbClick = useCallback((index) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  if (!slides.length) return null;

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((s, i) => (
            <div className="min-w-0 flex-[0_0_100%] relative" key={(s.key || i) + ''}>
                <div className={`w-full ${heightClass} bg-neutral-100`}>
                  {s.node ? (
                    s.node
                  ) : s.src || s.publicId ? (
                    (() => {
                      const publicId = s.publicId || null;
                      const src = s.src || (publicId ? buildCloudinaryUrl(publicId, cloudName, 1400) : '');
                      const srcSet = publicId ? buildCloudinarySrcSet(publicId, cloudName) : null;
                      return (
                        <img
                          src={src}
                          srcSet={srcSet || undefined}
                          sizes="(min-width: 1024px) 100vw, 100vw"
                          alt={s.alt || ''}
                          className={`w-full h-full ${contain ? 'object-contain' : 'object-cover'}`}
                          loading={i === 0 ? 'eager' : 'lazy'}
                        />
                      );
                    })()
                  ) : null}
                </div>
              </div>
          ))}
        </div>
      </div>

      {showThumbs && slides.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={`t-${s.key || i}`}
              className="w-2.5 h-2.5 rounded-full bg-neutral-800/70 aria-[current=true]:bg-neutral-900"
              aria-current={i === 0 ? undefined : undefined}
              onClick={() => onThumbClick(i)}
              aria-label={`Go to slide ${i + 1}`}
            />)
          )}
        </div>
      )}
    </div>
  );
}
