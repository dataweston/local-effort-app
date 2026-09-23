import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// A layout effect on the client, a no-op on the server. The hidden state has to
// be applied before the browser paints — see below — and useLayoutEffect warns
// if it is called during SSR.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Drives the "reveal by degree of finish" transition in specimen.css.
 *
 * The reference set's study sheet (Nieuwenhuis, RP-T-1969-185) shows one sheet
 * carrying four states of completion at once — full paint, wash, outline,
 * pencil. So sections here finish rather than slide: the rule draws, the
 * subject arrives as a wash, the colour settles. This hook only decides *when*
 * that starts; the staging itself is CSS.
 *
 *   const { ref, finish } = useSpecimenReveal();
 *   <section ref={ref} className="specimen-reveal" data-finish={finish}>
 *
 * ## It starts finished, and that is the important part
 *
 * `specimen.css:209` hides `.specimen-figure` inside a pending reveal. So
 * whatever this hook renders on the server is what a crawler sees, and what a
 * visitor sees until hydration runs.
 *
 * The first version of this hook started at `pending` and let an effect finish
 * it. Its own comment claimed SSR would "get the finished state immediately",
 * but that was wrong: effects do not run during SSR, so the prerendered HTML
 * shipped `data-finish="pending"` and every photograph inside a revealed
 * section was `opacity: 0` in the file. Nothing caught it until a venue plate
 * became the first `.specimen-figure` to live inside a `.specimen-reveal` and
 * a screenshot of the prerendered page came back blank.
 *
 * So the order is inverted: the finished state is the default, and the CLIENT
 * applies the hidden state on mount. A prerendered page, a crawler, and a
 * browser whose script failed all show the finished composition, which is the
 * same thing `prefers-reduced-motion` already showed (specimen.css:286).
 *
 * The hiding happens in a layout effect, so React commits it before the browser
 * paints and there is no flash of a visible section being taken away.
 */
export function useSpecimenReveal({ threshold = 0.15 } = {}) {
  const ref = useRef(null);
  const armed = useRef(false);
  const [finish, setFinish] = useState('done');

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    // Arm once. Re-running on every render would re-hide a section the visitor
    // has already watched arrive.
    if (!el || armed.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    armed.current = true;

    // Already on screen at mount — a deep link, a refresh mid-page, or simply
    // a section above the fold. Leave it finished rather than hiding it for the
    // pleasure of animating it back in.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return undefined;

    setFinish('pending');

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setFinish('done');
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, finish };
}

export default useSpecimenReveal;
