import React, { useMemo } from 'react';
import EmblaCarousel from './EmblaCarousel';

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function TestimonialsCarousel({ items = [], title = 'Testimonials', headingExtra = null }) {
  const slides = useMemo(() => {
    if (!items.length) return [];
    const randomized = shuffle(items);
    const groups = chunk(randomized, 3);
    return groups.map((group, idx) => ({
      key: `t-slide-${idx}`,
      node: (
        <div className="grid md:grid-cols-3 gap-6">
          {group.map((t, i) => (
            <blockquote key={i} className="p-6 rounded-xl bg-white shadow">
              <p className="text-body italic">“{t.quote}”</p>
              <footer className="mt-4 text-sm text-neutral-600">
                — {t.author}
                {t.context ? <span className="block text-neutral-400 mt-1">{t.context}</span> : null}
              </footer>
            </blockquote>
          ))}
        </div>
      ),
    }));
  }, [items]);

  if (!slides.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
      <div className="mb-6 border-b border-neutral-300 pb-3 flex items-end justify-between gap-3">
        <h3 className="text-heading uppercase">{title}</h3>
        {headingExtra}
      </div>
      <EmblaCarousel slides={slides} autoPlayMs={7000} contain={false} heightClass="h-auto" showThumbs={false} />
    </section>
  );
}
