import { useEffect, useRef, useState } from 'react';

/**
 * Drives the "reveal by degree of finish" transition in specimen.css.
 *
 * The reference set's study sheet (Nieuwenhuis, RP-T-1969-185) shows one sheet
 * carrying four states of completion at once — full paint, wash, outline,
 * pencil. So sections here finish rather than slide: the rule draws, the
 * subject arrives as a wash, the colour settles. This hook only decides *when*
 * that starts; the staging itself is CSS.
 *
 * Same shape as the observer in JulyDinner/LakeMenu.jsx: fire once at 15%
 * visible, then disconnect. Environments without IntersectionObserver (SSR,
 * the prerender pass) get the finished state immediately, which is also the
 * reduced-motion state — nothing is ever hidden behind a script that did not
 * run.
 *
 *   const { ref, finish } = useSpecimenReveal();
 *   <section ref={ref} className="specimen-reveal" data-finish={finish}>
 */
export function useSpecimenReveal({ threshold = 0.15 } = {}) {
  const ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setDone(true);
      return undefined;
    }

    // Already on screen when mounted (deep link, refresh mid-page): the
    // observer fires on its own, but a visitor who lands here should not watch
    // a section assemble itself as if they had just scrolled to it.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDone(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [done, threshold]);

  return { ref, finish: done ? 'done' : 'pending' };
}

export default useSpecimenReveal;
